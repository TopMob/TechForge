export function createMediaController(state, rerender) {
  async function startMicrophone() {
    try {
      stopMicrophone()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      state.microphoneStream = stream
      state.microphoneStatus = 'Микрофон активен'
      state.audioContext = state.audioContext || new AudioContext()
      const source = state.audioContext.createMediaStreamSource(stream)
      state.analyser = state.audioContext.createAnalyser()
      state.analyser.fftSize = 1024
      source.connect(state.analyser)
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
    } catch (error) {
      state.microphoneStatus = `Ошибка доступа: ${error.message}`
      state.microphoneLevel = 0
    }
    rerender()
  }

  function stopMicrophone() {
    if (state.micTimer) {
      clearInterval(state.micTimer)
      state.micTimer = null
    }
    if (state.microphoneStream) {
      state.microphoneStream.getTracks().forEach((track) => track.stop())
      state.microphoneStream = null
    }
    state.analyser = null
    state.microphoneLevel = 0
    if (state.microphoneStatus === 'Микрофон активен') state.microphoneStatus = 'Микрофон остановлен'
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
    if (state.webcamStatus === 'Камера подключена и показывает изображение') {
      state.webcamStatus = 'Камера выключена'
    }
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
      gain.gain.value = 0.04
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
    if (state.audioContext) state.audioContext.close()
  }

  return { startMicrophone, stopMicrophone, startWebcam, stopWebcam, playTone, destroy }
}
