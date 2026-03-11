function cleanupAnalyser(state) {
  if (state.micTimer) {
    clearInterval(state.micTimer)
    state.micTimer = null
  }
  if (state.micSourceNode) {
    state.micSourceNode.disconnect()
    state.micSourceNode = null
  }
  state.analyser = null
  state.microphoneLevel = 0
}

function disconnectMonitor(state) {
  if (state.monitorSource) {
    state.monitorSource.disconnect()
    state.monitorSource = null
  }
  if (state.monitorGain) {
    state.monitorGain.disconnect()
    state.monitorGain = null
  }
  state.monitoringEnabled = false
}

function stopRecordingInternal(state) {
  if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') state.mediaRecorder.stop()
  state.mediaRecorder = null
  state.recordingActive = false
}

async function ensureAudioContext(state) {
  state.audioContext = state.audioContext || new AudioContext()
  if (state.audioContext.state === 'suspended') await state.audioContext.resume()
  return state.audioContext
}

export function createMediaController(state, rerender) {
  async function ensureMicrophoneStream() {
    if (state.microphoneStream) return state.microphoneStream
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    state.microphoneStream = stream
    return stream
  }

  async function startMicrophone() {
    try {
      const stream = await ensureMicrophoneStream()
      const ctx = await ensureAudioContext(state)
      cleanupAnalyser(state)
      state.micSourceNode = ctx.createMediaStreamSource(stream)
      state.analyser = ctx.createAnalyser()
      state.analyser.fftSize = 2048
      state.micSourceNode.connect(state.analyser)
      const data = new Uint8Array(state.analyser.fftSize)
      state.micTimer = setInterval(() => {
        if (!state.analyser) return
        state.analyser.getByteTimeDomainData(data)
        let sum = 0
        for (const value of data) {
          const normalized = (value - 128) / 128
          sum += normalized * normalized
        }
        const rms = Math.sqrt(sum / data.length)
        state.microphoneLevel = Math.min(100, Math.round(rms * 290))
        rerender()
      }, 120)
      state.microphoneStatus = 'Микрофон активен'
    } catch (error) {
      state.microphoneStatus = `Ошибка доступа: ${error.message}`
      state.microphoneLevel = 0
    }
    rerender()
  }

  async function startMonitoring() {
    try {
      const stream = await ensureMicrophoneStream()
      const ctx = await ensureAudioContext(state)
      disconnectMonitor(state)
      state.monitorSource = ctx.createMediaStreamSource(stream)
      state.monitorGain = ctx.createGain()
      state.monitorGain.gain.value = 0.8
      state.monitorSource.connect(state.monitorGain)
      state.monitorGain.connect(ctx.destination)
      state.monitoringEnabled = true
      if (state.microphoneStatus === 'Микрофон не запущен' || state.microphoneStatus === 'Микрофон остановлен') state.microphoneStatus = 'Микрофон активен'
    } catch (error) {
      state.microphoneStatus = `Ошибка мониторинга: ${error.message}`
      state.monitoringEnabled = false
    }
    rerender()
  }

  function stopMonitoring() {
    disconnectMonitor(state)
    rerender()
  }

  async function startRecording() {
    try {
      const stream = await ensureMicrophoneStream()
      state.recordingChunks = []
      stopRecordingInternal(state)
      state.mediaRecorder = new MediaRecorder(stream)
      state.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) state.recordingChunks.push(event.data)
      }
      state.mediaRecorder.onstop = () => {
        if (!state.recordingChunks.length) {
          state.recordingActive = false
          rerender()
          return
        }
        if (state.lastRecordingUrl) URL.revokeObjectURL(state.lastRecordingUrl)
        const blob = new Blob(state.recordingChunks, { type: state.mediaRecorder?.mimeType || 'audio/webm' })
        state.lastRecordingUrl = URL.createObjectURL(blob)
        state.recordingActive = false
        rerender()
      }
      state.mediaRecorder.start()
      state.recordingActive = true
      state.microphoneStatus = 'Идёт запись микрофона'
    } catch (error) {
      state.microphoneStatus = `Ошибка записи: ${error.message}`
      state.recordingActive = false
    }
    rerender()
  }

  function stopRecording() {
    stopRecordingInternal(state)
    if (state.microphoneStream) state.microphoneStatus = 'Микрофон активен'
    rerender()
  }

  function stopMicrophone() {
    stopRecordingInternal(state)
    disconnectMonitor(state)
    cleanupAnalyser(state)
    if (state.microphoneStream) {
      state.microphoneStream.getTracks().forEach((track) => track.stop())
      state.microphoneStream = null
    }
    state.microphoneStatus = 'Микрофон остановлен'
    rerender()
  }

  async function startWebcam(videoElement) {
    try {
      stopWebcam(videoElement)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true })
      state.webcamStream = stream
      state.webcamActive = true
      state.webcamStatus = 'Камера подключена и показывает изображение'
      if (videoElement) {
        videoElement.srcObject = stream
        await videoElement.play()
      }
    } catch (error) {
      state.webcamActive = false
      state.webcamStatus = `Ошибка доступа: ${error.message}`
    }
    rerender()
  }

  function stopWebcam(videoElement) {
    if (state.webcamStream) {
      state.webcamStream.getTracks().forEach((track) => track.stop())
      state.webcamStream = null
    }
    if (videoElement) videoElement.srcObject = null
    state.webcamActive = false
    if (state.webcamStatus === 'Камера подключена и показывает изображение') state.webcamStatus = 'Камера выключена'
  }

  function stopAllMedia(videoElement) {
    stopWebcam(videoElement)
    stopMicrophone()
  }

  async function playSimpleTone(channel) {
    const ctx = await ensureAudioContext(state)
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    const panner = ctx.createStereoPanner()
    oscillator.type = 'sine'
    oscillator.frequency.value = 540
    gain.gain.value = 0.05
    panner.pan.value = channel === 'left' ? -1 : channel === 'right' ? 1 : 0
    oscillator.connect(gain)
    gain.connect(panner)
    panner.connect(ctx.destination)
    oscillator.start()
    setTimeout(() => oscillator.stop(), 700)
  }

  async function playAlternating() {
    await playSimpleTone('left')
    setTimeout(() => {
      playSimpleTone('right').catch(() => {})
    }, 800)
  }

  async function playPhase() {
    const ctx = await ensureAudioContext(state)
    const oscLeft = ctx.createOscillator()
    const oscRight = ctx.createOscillator()
    const gainLeft = ctx.createGain()
    const gainRight = ctx.createGain()
    const merge = ctx.createChannelMerger(2)

    oscLeft.type = 'sine'
    oscRight.type = 'sine'
    oscLeft.frequency.value = 440
    oscRight.frequency.value = 440
    gainLeft.gain.value = 0.05
    gainRight.gain.value = -0.05

    oscLeft.connect(gainLeft)
    oscRight.connect(gainRight)
    gainLeft.connect(merge, 0, 0)
    gainRight.connect(merge, 0, 1)
    merge.connect(ctx.destination)

    oscLeft.start()
    oscRight.start()
    setTimeout(() => {
      oscLeft.stop()
      oscRight.stop()
    }, 900)
  }

  async function playSweep() {
    const ctx = await ensureAudioContext(state)
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 550
    gain.gain.setValueAtTime(0.01, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.8)
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 1.8)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 1.9)
  }

  async function playTone(channel) {
    try {
      if (channel === 'alternating') {
        await playAlternating()
        state.headphonesStatus = 'Воспроизводится alternating L/R тест'
      } else if (channel === 'phase') {
        await playPhase()
        state.headphonesStatus = 'Воспроизводится phase test (противофаза)'
      } else if (channel === 'sweep') {
        await playSweep()
        state.headphonesStatus = 'Воспроизводится volume sweep'
      } else {
        await playSimpleTone(channel)
        state.headphonesStatus = channel === 'stereo' ? 'Воспроизводится стерео-сигнал' : `Воспроизводится ${channel === 'left' ? 'левый' : 'правый'} канал`
      }
    } catch (error) {
      state.headphonesStatus = `Ошибка аудио: ${error.message}`
    }
    rerender()
  }

  function destroy() {
    stopMicrophone()
    stopWebcam(null)
    if (state.lastRecordingUrl) {
      URL.revokeObjectURL(state.lastRecordingUrl)
      state.lastRecordingUrl = ''
    }
    if (state.audioContext) state.audioContext.close()
  }

  return {
    startMicrophone,
    stopMicrophone,
    startMonitoring,
    stopMonitoring,
    startRecording,
    stopRecording,
    startWebcam,
    stopWebcam,
    stopAllMedia,
    playTone,
    destroy
  }
}
