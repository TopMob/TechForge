const keyboardRows = [
  ['Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'],
  ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'Backspace'],
  ['Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash'],
  ['CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Enter'],
  ['ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', 'ShiftRight'],
  ['ControlLeft', 'MetaLeft', 'AltLeft', 'Space', 'AltRight', 'MetaRight', 'ContextMenu', 'ControlRight']
]

const keyboardLabels = {
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Space: 'Пробел',
  ContextMenu: 'Меню',
  ControlLeft: 'Ctrl',
  ControlRight: 'Ctrl',
  ShiftLeft: 'Shift',
  ShiftRight: 'Shift',
  AltLeft: 'Alt',
  AltRight: 'Alt',
  MetaLeft: 'Супер',
  MetaRight: 'Супер',
  CapsLock: 'Caps',
  Backspace: 'Backspace'
}

const diagnosticsSections = [
  { key: 'keyboard', label: 'Клавиатура' },
  { key: 'microphone', label: 'Микрофон' },
  { key: 'webcam', label: 'Веб-камера' },
  { key: 'headphones', label: 'Наушники' },
  { key: 'mouse', label: 'Мышь' }
]

const trackedKeyboardCodes = new Set(keyboardRows.flat())

function renderSectionTabs(activeSection) {
  return diagnosticsSections
    .map((section) => `<button type="button" class="diag-top-tab ${activeSection === section.key ? 'active' : ''}" data-diag-section="${section.key}">${section.label}</button>`)
    .join('')
}

function renderPanelHeader(title, subtitle, badge) {
  return `
    <header class="diag-panel-header">
      <div>
        <h3>${title}</h3>
        <p>${subtitle}</p>
      </div>
      <span class="diag-badge">${badge}</span>
    </header>
  `
}

function renderKeyboard(state) {
  const total = keyboardRows.flat().length
  const tested = keyboardRows.flat().filter((code) => state.pressedKeys.has(code)).length
  const rows = keyboardRows
    .map((row) => `
      <div class="diag-keyboard-row">
        ${row
          .map((code) => {
            const label = keyboardLabels[code] || code.replace('Key', '').replace('Digit', '')
            const testedClass = state.pressedKeys.has(code) ? 'tested' : ''
            const activeClass = state.pulseKeys.has(code) ? 'active' : ''
            return `<span class="diag-key ${testedClass} ${activeClass}">${label}</span>`
          })
          .join('')}
      </div>
    `)
    .join('')

  const percent = total ? Math.round((tested / total) * 100) : 0
  const hottest = Object.entries(state.keyPressCount || {}).sort((a, b) => b[1] - a[1]).slice(0, 8)

  return `
    <section class="diag-panel diag-keyboard-theme">
      ${renderPanelHeader('Тест клавиатуры', 'Ghosting/MKRO, удержание клавиш и heatmap нажатий.', 'key-test+')}
      <div class="diag-stat-strip">
        <div><span>Проверено</span><strong>${tested} / ${total}</strong></div>
        <div><span>Готовность</span><strong>${percent}%</strong></div>
      </div>
      <div class="diag-stat-strip">
        <div><span>Одновременных клавиш (max)</span><strong>${state.maxSimultaneousKeys}</strong></div>
        <div><span>Текущая комбинация</span><strong>${state.keyComboLabel}</strong></div>
      </div>
      <div class="diag-keyboard-shell">
        <div class="diag-keyboard">${rows}</div>
      </div>
      <div class="diag-stat-strip one-col">
        <div><span>Heatmap (топ нажатий)</span><strong>${hottest.map(([code, count]) => `${keyboardLabels[code] || code}:${count}`).join(' · ') || 'пока нет данных'}</strong></div>
      </div>
      <div class="diag-actions">
        <button type="button" class="secondary-action" data-diag-reset-keys>Сбросить клавиши</button>
      </div>
    </section>
  `
}

function renderMicrophone(state) {
  return `
    <section class="diag-panel diag-mic-theme">
      ${renderPanelHeader('Тест микрофона', 'Live-мониторинг, запись голоса и быстрый старт/стоп.', 'webcammictest+')}
      <div class="diag-meter-card">
        <div class="diag-meter-shell">
          <div class="diag-meter-fill" style="width:${state.microphoneLevel}%"></div>
        </div>
        <div class="diag-meter-scale">
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
      </div>
      <div class="diag-stat-strip">
        <div><span>Уровень сигнала</span><strong>${state.microphoneLevel}%</strong></div>
        <div><span>Мониторинг</span><strong>${state.monitoringEnabled ? 'Включён' : 'Выключен'}</strong></div>
      </div>
      <div class="diag-stat-strip one-col">
        <div><span>Состояние</span><strong>${state.microphoneStatus}</strong></div>
      </div>
      <div class="diag-actions">
        <button type="button" class="secondary-action" data-diag-start-microphone>Запустить микрофон</button>
        <button type="button" class="secondary-action" data-diag-stop-microphone>Полностью остановить</button>
        <button type="button" class="secondary-action" data-diag-start-monitor>Услышать себя</button>
        <button type="button" class="secondary-action" data-diag-stop-monitor>Выключить прослушку</button>
        <button type="button" class="secondary-action" data-diag-start-record>Записать</button>
        <button type="button" class="secondary-action" data-diag-stop-record>Остановить запись</button>
      </div>
      <div class="diag-record-box">
        <span>Последняя запись:</span>
        ${state.lastRecordingUrl ? `<audio controls src="${state.lastRecordingUrl}"></audio>` : '<strong>пока нет</strong>'}
      </div>
    </section>
  `
}

function renderWebcam(state) {
  return `
    <section class="diag-panel diag-webcam-theme">
      ${renderPanelHeader('Тест веб-камеры', 'Крупный предпросмотр и индикация эфира.', 'webcammictest')}
      <div class="diag-camera-shell ${state.webcamActive ? 'live' : ''}">
        <video id="diag-webcam-video" autoplay playsinline muted></video>
        <span class="diag-camera-overlay">${state.webcamActive ? 'КАМЕРА В ЭФИРЕ' : 'КАМЕРА ВЫКЛ.'}</span>
      </div>
      <div class="diag-stat-strip one-col">
        <div><span>Состояние камеры</span><strong>${state.webcamStatus}</strong></div>
      </div>
      <div class="diag-actions">
        <button type="button" class="secondary-action" data-diag-start-webcam>Включить камеру</button>
        <button type="button" class="secondary-action" data-diag-stop-webcam>Отключить</button>
      </div>
    </section>
  `
}

function renderHeadphones(state) {
  return `
    <section class="diag-panel diag-headphones-theme">
      ${renderPanelHeader('Тест наушников', 'Левый/правый/стерео, alternating, phase и volume sweep.', 'audio-lab')}
      <div class="diag-grid-2">
        <button type="button" class="diag-audio-btn" data-diag-tone="left">ЛЕВЫЙ</button>
        <button type="button" class="diag-audio-btn" data-diag-tone="right">ПРАВЫЙ</button>
        <button type="button" class="diag-audio-btn wide" data-diag-tone="stereo">СТЕРЕО</button>
        <button type="button" class="diag-audio-btn" data-diag-tone="alternating">ALT L/R</button>
        <button type="button" class="diag-audio-btn" data-diag-tone="phase">PHASE</button>
        <button type="button" class="diag-audio-btn wide" data-diag-tone="sweep">VOLUME SWEEP</button>
      </div>
      <div class="diag-stat-strip one-col">
        <div><span>Статус</span><strong>${state.headphonesStatus}</strong></div>
      </div>
    </section>
  `
}

function renderMouse(state) {
  const pollingHz = state.mouseMoveSamples.length > 3
    ? Math.round((state.mouseMoveSamples.length - 1) / ((state.mouseMoveSamples[state.mouseMoveSamples.length - 1] - state.mouseMoveSamples[0]) / 1000 || 1))
    : 0

  const trace = state.mouseTrace.length > 1
    ? `<svg viewBox="0 0 100 100" class="diag-trace-svg"><polyline points="${state.mouseTrace.map((point) => `${(point.x * 100).toFixed(1)},${(point.y * 100).toFixed(1)}`).join(' ')}"/></svg>`
    : '<div class="diag-trace-empty">Перемещайте мышь в зоне, чтобы увидеть траекторию.</div>'

  return `
    <section class="diag-panel diag-mouse-theme">
      ${renderPanelHeader('Тест мыши', 'Latency, double-click, wheel, drag и polling approximation.', 'checkdevice+')}
      <div class="diag-mouse-layout">
        <div class="diag-mouse-visual ${state.mousePulse}">
          <span class="left"></span>
          <span class="right"></span>
          <span class="wheel"></span>
        </div>
        <div id="diag-mouse-zone" class="diag-mouse-zone" tabindex="0">Кликайте, водите и крутите колесо здесь</div>
      </div>
      <div class="diag-stats-grid">
        <div><span>Левая</span><strong>${state.mouseStats.left}</strong></div>
        <div><span>Правая</span><strong>${state.mouseStats.right}</strong></div>
        <div><span>Средняя</span><strong>${state.mouseStats.middle}</strong></div>
        <div><span>Колесо</span><strong>${state.mouseStats.wheel}</strong></div>
      </div>
      <div class="diag-stat-strip">
        <div><span>Latency rough</span><strong>${state.mouseLatencyMs} мс</strong></div>
        <div><span>Double-click</span><strong>${state.mouseDoubleClickMs || '—'} мс</strong></div>
      </div>
      <div class="diag-stat-strip">
        <div><span>Wheel up/down</span><strong>${state.mouseStats.wheelUp}/${state.mouseStats.wheelDown}</strong></div>
        <div><span>Polling approx</span><strong>${pollingHz || '—'} Hz</strong></div>
      </div>
      <div class="diag-stat-strip">
        <div><span>Drag distance</span><strong>${state.mouseDragDistance.toFixed(2)}</strong></div>
        <div><span>Последнее действие</span><strong>${state.mouseStatus}</strong></div>
      </div>
      <div class="diag-trace-box">${trace}</div>
      <div class="diag-actions">
        <button type="button" class="secondary-action" data-diag-reset-mouse>Сбросить счётчики</button>
      </div>
    </section>
  `
}

function renderDiagnostics(rootElement, state) {
  const content = state.activeSection === 'keyboard'
    ? renderKeyboard(state)
    : state.activeSection === 'microphone'
      ? renderMicrophone(state)
      : state.activeSection === 'webcam'
        ? renderWebcam(state)
        : state.activeSection === 'headphones'
          ? renderHeadphones(state)
          : renderMouse(state)

  rootElement.innerHTML = `
    <div class="diag-clone-layout">
      <div class="diag-top-nav">${renderSectionTabs(state.activeSection)}</div>
      <div class="diag-site-content">${content}</div>
    </div>
  `
}

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

function createMediaController(state, rerender) {
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
