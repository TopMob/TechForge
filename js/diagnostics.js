import { trackedKeyboardCodes } from './diagnostics/constants.js'
import { renderDiagnostics } from './diagnostics/render.js'
import { createMediaController } from './diagnostics/media.js'

export function setupDiagnosticsModule({ rootElement }) {
  const state = {
    activeSection: 'keyboard',
    pressedKeys: new Set(),
    pulseKeys: new Set(),
    keyDownAt: {},
    keyHoldMs: {},
    keyPressCount: {},
    keyComboLabel: '—',
    maxSimultaneousKeys: 0,
    mouseStats: { left: 0, right: 0, middle: 0, wheel: 0, wheelUp: 0, wheelDown: 0 },
    mouseStatus: 'Ожидание действий',
    mousePulse: '',
    mouseDownAt: 0,
    mouseLatencyMs: 0,
    mouseDoubleClickMs: 0,
    mouseLastClickAt: 0,
    mouseMoveSamples: [],
    mouseTrace: [],
    mouseDragDistance: 0,
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

  function stopActiveMedia() {
    const video = rootElement.querySelector('#diag-webcam-video')
    media.stopAllMedia(video)
  }

  function onDocumentVisibilityChange() {
    if (document.hidden) stopActiveMedia()
  }

  function onWindowPageHide() {
    stopActiveMedia()
  }

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

  function refreshKeyboardMetrics() {
    const activeKeys = Array.from(state.pressedKeys).slice(0, 6)
    state.keyComboLabel = activeKeys.length > 0 ? activeKeys.join(' + ') : '—'
    state.maxSimultaneousKeys = Math.max(state.maxSimultaneousKeys, state.pressedKeys.size)
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
      state.keyDownAt = {}
      state.keyHoldMs = {}
      state.keyPressCount = {}
      state.keyComboLabel = '—'
      state.maxSimultaneousKeys = 0
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
      state.mouseStats = { left: 0, right: 0, middle: 0, wheel: 0, wheelUp: 0, wheelDown: 0 }
      state.mouseStatus = 'Ожидание действий'
      state.mousePulse = ''
      state.mouseLatencyMs = 0
      state.mouseDoubleClickMs = 0
      state.mouseLastClickAt = 0
      state.mouseMoveSamples = []
      state.mouseTrace = []
      state.mouseDragDistance = 0
      render()
    }
  }

  function onRootMouseDown(event) {
    if (!event.target.closest('#diag-mouse-zone')) return
    state.mouseDownAt = performance.now()
    if (event.button === 0) {
      state.mouseStats.left += 1
      const now = performance.now()
      if (state.mouseLastClickAt > 0) state.mouseDoubleClickMs = Math.round(now - state.mouseLastClickAt)
      state.mouseLastClickAt = now
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

  function onRootMouseUp(event) {
    if (!event.target.closest('#diag-mouse-zone')) return
    if (state.mouseDownAt > 0) {
      state.mouseLatencyMs = Math.round(performance.now() - state.mouseDownAt)
      state.mouseDownAt = 0
      render()
    }
  }

  function onRootMouseMove(event) {
    const zone = event.target.closest('#diag-mouse-zone')
    if (!zone) return
    const now = performance.now()
    state.mouseMoveSamples.push(now)
    if (state.mouseMoveSamples.length > 60) state.mouseMoveSamples.shift()

    const rect = zone.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width)))
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(1, rect.height)))

    const prev = state.mouseTrace[state.mouseTrace.length - 1]
    if (prev) {
      const dx = x - prev.x
      const dy = y - prev.y
      state.mouseDragDistance += Math.sqrt((dx * dx) + (dy * dy))
    }

    state.mouseTrace.push({ x, y })
    if (state.mouseTrace.length > 24) state.mouseTrace.shift()
    state.mouseStatus = 'Перемещение по зоне'
    render()
  }

  function onRootWheel(event) {
    if (!event.target.closest('#diag-mouse-zone')) return
    event.preventDefault()
    state.mouseStats.wheel += 1
    if (event.deltaY > 0) state.mouseStats.wheelDown += 1
    else state.mouseStats.wheelUp += 1
    state.mouseStatus = event.deltaY > 0 ? 'Прокрутка вниз' : 'Прокрутка вверх'
    pulseMouse('wheel')
  }

  function onRootContextMenu(event) {
    if (event.target.closest('#diag-mouse-zone')) event.preventDefault()
  }

  function onWindowKeyDown(event) {
    const code = event.code || event.key
    if (!trackedKeyboardCodes.has(code)) return
    if (!state.pressedKeys.has(code)) {
      state.keyDownAt[code] = performance.now()
      state.keyPressCount[code] = (state.keyPressCount[code] || 0) + 1
    }
    state.pressedKeys.add(code)
    refreshKeyboardMetrics()
    pulseKey(code)
  }

  function onWindowKeyUp(event) {
    const code = event.code || event.key
    if (!trackedKeyboardCodes.has(code)) return
    const startedAt = state.keyDownAt[code]
    if (startedAt) {
      const held = Math.round(performance.now() - startedAt)
      state.keyHoldMs[code] = held
      delete state.keyDownAt[code]
    }
    state.pressedKeys.delete(code)
    refreshKeyboardMetrics()
    render()
  }

  rootElement.addEventListener('click', onRootClick)
  rootElement.addEventListener('mousedown', onRootMouseDown)
  rootElement.addEventListener('mouseup', onRootMouseUp)
  rootElement.addEventListener('mousemove', onRootMouseMove)
  rootElement.addEventListener('wheel', onRootWheel, { passive: false })
  rootElement.addEventListener('contextmenu', onRootContextMenu)
  window.addEventListener('keydown', onWindowKeyDown)
  window.addEventListener('keyup', onWindowKeyUp)
  document.addEventListener('visibilitychange', onDocumentVisibilityChange)
  window.addEventListener('pagehide', onWindowPageHide)

  render()

  return {
    rerender() {
      render()
    },
    stopActiveMedia,
    destroy() {
      rootElement.removeEventListener('click', onRootClick)
      rootElement.removeEventListener('mousedown', onRootMouseDown)
      rootElement.removeEventListener('mouseup', onRootMouseUp)
      rootElement.removeEventListener('mousemove', onRootMouseMove)
      rootElement.removeEventListener('wheel', onRootWheel)
      rootElement.removeEventListener('contextmenu', onRootContextMenu)
      window.removeEventListener('keydown', onWindowKeyDown)
      window.removeEventListener('keyup', onWindowKeyUp)
      document.removeEventListener('visibilitychange', onDocumentVisibilityChange)
      window.removeEventListener('pagehide', onWindowPageHide)
      media.destroy()
    }
  }
}
