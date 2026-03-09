import { trackedKeyboardCodes } from './diagnostics/constants.js'
import { renderDiagnostics } from './diagnostics/render.js'
import { createMediaController } from './diagnostics/media.js'

export function setupDiagnosticsModule({ rootElement }) {
  const state = {
    activeSection: 'keyboard',
    pressedKeys: new Set(),
    pulseKeys: new Set(),
    mouseStats: { left: 0, right: 0, middle: 0, wheel: 0 },
    mouseStatus: 'Ожидание действий',
    mousePulse: '',
    microphoneStatus: 'Микрофон не запущен',
    microphoneLevel: 0,
    monitoringEnabled: false,
    recordingActive: false,
    recordingChunks: [],
    mediaRecorder: null,
    lastRecordingUrl: '',
    webcamStatus: 'Камера не запущена',
    webcamActive: false,
    headphonesStatus: 'Тест не запускался',
    microphoneStream: null,
    webcamStream: null,
    audioContext: null,
    analyser: null,
    micTimer: null,
    micSourceNode: null,
    monitorSource: null,
    monitorGain: null
  }

  function render() {
    renderDiagnostics(rootElement, state)
    if (state.webcamActive && state.webcamStream) {
      const video = rootElement.querySelector('#diag-webcam-video')
      if (video && video.srcObject !== state.webcamStream) video.srcObject = state.webcamStream
    }
  }

  const media = createMediaController(state, render)

  function pulseKey(code) {
    state.pulseKeys.add(code)
    render()
    setTimeout(() => {
      state.pulseKeys.delete(code)
      render()
    }, 180)
  }

  function pulseMouse(pulseClass) {
    state.mousePulse = pulseClass
    render()
    setTimeout(() => {
      if (state.mousePulse === pulseClass) {
        state.mousePulse = ''
        render()
      }
    }, 220)
  }

  function onRootClick(event) {
    const sectionButton = event.target.closest('[data-diag-section]')
    if (sectionButton) {
      state.activeSection = sectionButton.dataset.diagSection
      render()
    }

    if (event.target.closest('[data-diag-reset-keys]')) {
      state.pressedKeys.clear()
      state.pulseKeys.clear()
      render()
    }

    if (event.target.closest('[data-diag-start-microphone]')) media.startMicrophone()
    if (event.target.closest('[data-diag-stop-microphone]')) media.stopMicrophone()
    if (event.target.closest('[data-diag-start-monitor]')) media.startMonitoring()
    if (event.target.closest('[data-diag-stop-monitor]')) media.stopMonitoring()
    if (event.target.closest('[data-diag-start-record]')) media.startRecording()
    if (event.target.closest('[data-diag-stop-record]')) media.stopRecording()

    if (event.target.closest('[data-diag-start-webcam]')) {
      const video = rootElement.querySelector('#diag-webcam-video')
      media.startWebcam(video)
    }

    if (event.target.closest('[data-diag-stop-webcam]')) {
      const video = rootElement.querySelector('#diag-webcam-video')
      media.stopWebcam(video)
      render()
    }

    const toneButton = event.target.closest('[data-diag-tone]')
    if (toneButton) media.playTone(toneButton.dataset.diagTone)

    if (event.target.closest('[data-diag-reset-mouse]')) {
      state.mouseStats = { left: 0, right: 0, middle: 0, wheel: 0 }
      state.mouseStatus = 'Ожидание действий'
      state.mousePulse = ''
      render()
    }
  }

  function onRootMouseDown(event) {
    if (!event.target.closest('#diag-mouse-zone')) return
    if (event.button === 0) {
      state.mouseStats.left += 1
      state.mouseStatus = 'Нажата левая кнопка'
      pulseMouse('left')
    } else if (event.button === 1) {
      state.mouseStats.middle += 1
      state.mouseStatus = 'Нажата средняя кнопка'
      pulseMouse('middle')
    } else if (event.button === 2) {
      state.mouseStats.right += 1
      state.mouseStatus = 'Нажата правая кнопка'
      pulseMouse('right')
    }
  }

  function onRootWheel(event) {
    if (!event.target.closest('#diag-mouse-zone')) return
    event.preventDefault()
    state.mouseStats.wheel += 1
    state.mouseStatus = event.deltaY > 0 ? 'Прокрутка вниз' : 'Прокрутка вверх'
    pulseMouse('wheel')
  }

  function onRootContextMenu(event) {
    if (event.target.closest('#diag-mouse-zone')) event.preventDefault()
  }

  function onWindowKeyDown(event) {
    const code = event.code || event.key
    if (!trackedKeyboardCodes.has(code)) return
    state.pressedKeys.add(code)
    pulseKey(code)
  }

  rootElement.addEventListener('click', onRootClick)
  rootElement.addEventListener('mousedown', onRootMouseDown)
  rootElement.addEventListener('wheel', onRootWheel, { passive: false })
  rootElement.addEventListener('contextmenu', onRootContextMenu)
  window.addEventListener('keydown', onWindowKeyDown)

  render()

  return {
    rerender() {
      render()
    },
    destroy() {
      rootElement.removeEventListener('click', onRootClick)
      rootElement.removeEventListener('mousedown', onRootMouseDown)
      rootElement.removeEventListener('wheel', onRootWheel)
      rootElement.removeEventListener('contextmenu', onRootContextMenu)
      window.removeEventListener('keydown', onWindowKeyDown)
      media.destroy()
    }
  }
}
