export function createMediaController(state, rerender) {
  async function ensureMicrophoneStream() {
    if (state.microphoneStream) return state.microphoneStream
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    state.microphoneStream = stream
    return stream
  }

  function clearMeterTimer() {
    if (state.micTimer) {
      clearInterval(state.micTimer)
      state.micTimer = null
    }
  }

  function disconnectMonitor() {
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

  function stopRecordingInternal() {
    if (!state.mediaRecorder) return
    if (state.mediaRecorder.state !== 'inactive') state.mediaRecorder.stop()
    state.mediaRecorder = null
    state.recordingActive = false
  }

  function cleanupAnalyser() {
    clearMeterTimer()
    if (state.micSourceNode) {
      state.micSourceNode.disconnect()
      state.micSourceNode = null
    }
    state.analyser = null
    state.microphoneLevel = 0
  }

  async function startMicrophone() {
    try {
      const stream = await ensureMicrophoneStream()
      state.audioContext = state.audioContext || new AudioContext()
      if (state.audioContext.state === 'suspended') await state.audioContext.resume()
      cleanupAnalyser()
      state.micSourceNode = state.audioContext.createMediaStreamSource(stream)
      state.analyser = state.audioContext.createAnalyser()
      state.analyser.fftSize = 1024
      state.micSourceNode.connect(state.analyser)
      state.micTimer = window.setInterval(() => {
        const data = new Uint8Array(state.analyser.fftSize)
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
      state.audioContext = state.audioContext || new AudioContext()
      if (state.audioContext.state === 'suspended') await state.audioContext.resume()
      disconnectMonitor()
      state.monitorSource = state.audioContext.createMediaStreamSource(stream)
      state.monitorGain = state.audioContext.createGain()
      state.monitorGain.gain.value = 0.8
      state.monitorSource.connect(state.monitorGain)
      state.monitorGain.connect(state.audioContext.destination)
      state.monitoringEnabled = true
      if (state.microphoneStatus === 'Микрофон не запущен' || state.microphoneStatus === 'Микрофон остановлен') {
        state.microphoneStatus = 'Микрофон активен'
      }
    } catch (error) {
      state.microphoneStatus = `Ошибка мониторинга: ${error.message}`
      state.monitoringEnabled = false
    }
    rerender()
  }

  function stopMonitoring() {
    disconnectMonitor()
    rerender()
  }

  async function startRecording() {
    try {
      const stream = await ensureMicrophoneStream()
      state.recordingChunks = []
      stopRecordingInternal()
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
    stopRecordingInternal()
    if (state.microphoneStream) state.microphoneStatus = 'Микрофон активен'
    rerender()
  }

  function stopMicrophone() {
    stopRecordingInternal()
    disconnectMonitor()
    cleanupAnalyser()
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

  async function playTone(channel) {
    try {
      state.audioContext = state.audioContext || new AudioContext()
      if (state.audioContext.state === 'suspended') await state.audioContext.resume()
      const oscillator = state.audioContext.createOscillator()
      const gain = state.audioContext.createGain()
      const panner = state.audioContext.createStereoPanner()
      oscillator.type = 'sine'
      oscillator.frequency.value = 540
      gain.gain.value = 0.05
      panner.pan.value = channel === 'left' ? -1 : channel === 'right' ? 1 : 0
      oscillator.connect(gain)
      gain.connect(panner)
      panner.connect(state.audioContext.destination)
      oscillator.start()
      setTimeout(() => oscillator.stop(), 700)
      state.headphonesStatus = channel === 'stereo' ? 'Воспроизводится стерео-сигнал' : `Воспроизводится ${channel === 'left' ? 'левый' : 'правый'} канал`
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
    playTone,
    destroy
  }
}
