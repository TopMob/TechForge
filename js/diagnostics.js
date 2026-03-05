const keyboardGroups = [
  ['Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'],
  ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'Backspace'],
  ['Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash'],
  ['CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Enter'],
  ['ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', 'ShiftRight'],
  ['ControlLeft', 'MetaLeft', 'AltLeft', 'Space', 'AltRight', 'MetaRight', 'ContextMenu', 'ControlRight'],
  ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Insert', 'Delete', 'Home', 'End', 'PageUp', 'PageDown']
]

const keyLabels = {
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
  Space: 'Space',
  ContextMenu: 'Menu'
}

const gameProfiles = [
  { name: 'Counter-Strike 2', tier: 'Киберспорт', minScore: 120, recommendedScore: 220 },
  { name: 'Dota 2', tier: 'Киберспорт', minScore: 80, recommendedScore: 160 },
  { name: 'GTA V', tier: 'AAA', minScore: 130, recommendedScore: 230 },
  { name: 'Cyberpunk 2077', tier: 'AAA', minScore: 220, recommendedScore: 360 },
  { name: 'Red Dead Redemption 2', tier: 'AAA', minScore: 200, recommendedScore: 340 },
  { name: 'Fortnite', tier: 'Киберспорт', minScore: 110, recommendedScore: 200 },
  { name: 'Apex Legends', tier: 'Киберспорт', minScore: 140, recommendedScore: 240 },
  { name: 'Hogwarts Legacy', tier: 'AAA', minScore: 230, recommendedScore: 370 }
]

const diagnosticsSections = [
  { key: 'keyboard', label: 'Тест клавиатуры' },
  { key: 'mouse', label: 'Тест мышки' },
  { key: 'games', label: 'Оценка ПК и игры' },
  { key: 'peripherals', label: 'Тест компонентов' },
  { key: 'system', label: 'Инфо о системе' }
]

export function setupDiagnosticsModule({ rootElement, getConfigurationSnapshot }) {
  const state = {
    activeSection: 'keyboard',
    pressedKeys: new Set(),
    mouseClicks: [],
    mouseButtonCounts: { left: 0, middle: 0, right: 0 },
    mouseDoubleClicks: 0,
    mouseWheelEvents: 0,
    mouseLastEvent: 'Ожидание действий',
    audioContext: null,
    analyser: null,
    microphoneStream: null,
    levelInterval: null,
    cameraStatus: 'Камера не проверена',
    microphoneStatus: 'Микрофон не проверен',
    devicesStatus: 'Устройства не проверены',
    soundStatus: 'Тест звука не запускался',
    microphoneLevel: 0
  }

  function parseNumericFromText(value) {
    const matched = String(value || '').replace(',', '.').match(/[\d.]+/)
    return matched ? Number(matched[0]) : null
  }

  function getPcMetrics() {
    const snapshot = getConfigurationSnapshot()
    const cpu = snapshot.cpu
    const gpu = snapshot.gpu
    const ram = snapshot.ram
    const ssd = snapshot.ssd
    const cores = parseNumericFromText(cpu?.specs?.Ядра) || 0
    const baseClock = parseNumericFromText(cpu?.specs?.['Базовая частота']) || 0
    const gpuMemory = parseNumericFromText(gpu?.specs?.Память) || 0
    const ramCapacity = parseNumericFromText(ram?.specs?.Объем) || 0
    const cpuScore = cores * 16 + baseClock * 32
    const gpuScore = gpuMemory * 18
    const ramScore = ramCapacity * 3
    const storageScore = ssd ? 35 : 0
    const totalScore = Math.round(cpuScore + gpuScore + ramScore + storageScore)
    return {
      cpuName: cpu?.name || 'Не выбран',
      gpuName: gpu?.name || 'Не выбран',
      ramName: ram?.name || 'Не выбран',
      totalScore,
      cores,
      baseClock,
      gpuMemory,
      ramCapacity,
      hasStorage: Boolean(ssd)
    }
  }

  function getPcGrade(score) {
    if (score >= 380) return { text: 'Отлично', description: 'Высокая производительность для современных AAA-игр.' }
    if (score >= 260) return { text: 'Хорошо', description: 'Комфортный Full HD / QHD гейминг на средне-высоких настройках.' }
    if (score >= 160) return { text: 'Нормально', description: 'Подходит для киберспорта и нетребовательных игр.' }
    return { text: 'Базовый уровень', description: 'Лучше подходит для офиса, учебы и легких игр.' }
  }

  function getGamesEvaluation(score) {
    return gameProfiles.map((game) => {
      if (score >= game.recommendedScore) return { ...game, status: 'Высокие настройки' }
      if (score >= game.minScore) return { ...game, status: 'Средние настройки' }
      return { ...game, status: 'Низкие настройки / возможны просадки' }
    })
  }

  function renderKeyboardSection() {
    const allCodes = keyboardGroups.flat()
    const testedCount = allCodes.filter((code) => state.pressedKeys.has(code)).length
    const rows = keyboardGroups
      .map(
        (row) => `<div class="keyboard-row">${row
          .map((code) => {
            const label = keyLabels[code] || code.replace('Key', '').replace('Digit', '')
            const tested = state.pressedKeys.has(code) ? 'tested' : ''
            return `<span class="keyboard-key ${tested}" data-key-code="${code}">${label}</span>`
          })
          .join('')}</div>`
      )
      .join('')

    return `
      <article class="diagnostic-card">
        <h3>Тест всех клавиш клавиатуры</h3>
        <p class="comparison-count">Нажмите каждую клавишу. Проверено: ${testedCount} / ${allCodes.length}</p>
        <div class="keyboard-map">${rows}</div>
        <button type="button" class="secondary-action" data-reset-keys>Сбросить тест клавиш</button>
      </article>
    `
  }

  function getCps() {
    const now = Date.now()
    state.mouseClicks = state.mouseClicks.filter((ts) => now - ts <= 1000)
    return state.mouseClicks.length
  }

  function renderMouseSection() {
    return `
      <article class="diagnostic-card">
        <h3>Тест всех кнопок мыши</h3>
        <p class="comparison-count">ЛКМ: ${state.mouseButtonCounts.left} · СКМ: ${state.mouseButtonCounts.middle} · ПКМ: ${state.mouseButtonCounts.right}</p>
        <p class="comparison-count">Даблклик: ${state.mouseDoubleClicks} · Колесо: ${state.mouseWheelEvents} · Клики/сек: ${getCps()}</p>
        <div class="mouse-zone" id="mouse-test-zone" tabindex="0">Кликайте здесь всеми кнопками, делайте даблклик и прокрутку.</div>
        <p class="comparison-count">Последнее событие: ${state.mouseLastEvent}</p>
        <button type="button" class="secondary-action" data-reset-mouse>Сбросить тест мыши</button>
      </article>
    `
  }

  function renderGamesSection() {
    const metrics = getPcMetrics()
    const grade = getPcGrade(metrics.totalScore)
    const games = getGamesEvaluation(metrics.totalScore)
    const rows = games.map((game) => `<tr><td>${game.name}</td><td>${game.tier}</td><td>${game.status}</td></tr>`).join('')

    return `
      <article class="diagnostic-card">
        <h3>Оценить мой компьютер</h3>
        <p class="comparison-count">CPU: ${metrics.cpuName}</p>
        <p class="comparison-count">GPU: ${metrics.gpuName}</p>
        <p class="comparison-count">RAM: ${metrics.ramName}</p>
        <p><strong>Итоговый балл:</strong> ${metrics.totalScore} · <strong>${grade.text}</strong></p>
        <p class="comparison-count">${grade.description}</p>
        <p class="comparison-count">Ядер: ${metrics.cores} · Частота: ${metrics.baseClock || 0} ГГц · VRAM: ${metrics.gpuMemory} ГБ · RAM: ${metrics.ramCapacity} ГБ · SSD: ${metrics.hasStorage ? 'Да' : 'Нет'}</p>
      </article>
      <article class="diagnostic-card">
        <h3>Какие игры пойдут на вашем ПК</h3>
        <table class="comparison-table games-table">
          <thead><tr><th>Игра</th><th>Категория</th><th>Оценка</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </article>
    `
  }

  function renderPeripheralsSection() {
    return `
      <article class="diagnostic-card">
        <h3>Тест компонентов: наушники, камера, микрофон</h3>
        <div class="diagnostic-actions">
          <button type="button" class="secondary-action" data-test-camera>Проверить камеру и микрофон</button>
          <button type="button" class="secondary-action" data-test-devices>Показать подключенные устройства</button>
          <button type="button" class="secondary-action" data-test-sound>Запустить тест звука</button>
        </div>
        <p class="comparison-count">Камера: ${state.cameraStatus}</p>
        <p class="comparison-count">Микрофон: ${state.microphoneStatus}</p>
        <p class="comparison-count">Устройства: ${state.devicesStatus}</p>
        <p class="comparison-count">Звук/наушники: ${state.soundStatus}</p>
        <div class="microphone-meter"><span style="width:${state.microphoneLevel}%;"></span></div>
      </article>
    `
  }

  function renderSystemSection() {
    const memory = navigator.deviceMemory ? `${navigator.deviceMemory} ГБ` : 'Нет данных'
    const threads = navigator.hardwareConcurrency || 'Нет данных'
    return `
      <article class="diagnostic-card">
        <h3>Информация о текущем устройстве</h3>
        <p class="comparison-count">Платформа: ${navigator.platform || 'Нет данных'}</p>
        <p class="comparison-count">Язык: ${navigator.language || 'Нет данных'}</p>
        <p class="comparison-count">Память устройства: ${memory}</p>
        <p class="comparison-count">Логические потоки CPU: ${threads}</p>
        <p class="comparison-count">Экран: ${window.screen.width} × ${window.screen.height}</p>
        <p class="comparison-count">User Agent: ${navigator.userAgent}</p>
      </article>
    `
  }

  function renderSectionContent() {
    if (state.activeSection === 'keyboard') return renderKeyboardSection()
    if (state.activeSection === 'mouse') return renderMouseSection()
    if (state.activeSection === 'games') return renderGamesSection()
    if (state.activeSection === 'peripherals') return renderPeripheralsSection()
    return renderSystemSection()
  }

  function render() {
    const buttons = diagnosticsSections
      .map((section) => `<button type="button" class="diagnostics-button ${state.activeSection === section.key ? 'active' : ''}" data-diagnostics-section="${section.key}">${section.label}</button>`)
      .join('')

    rootElement.innerHTML = `
      <div class="diagnostics-layout">
        <div class="diagnostics-nav">${buttons}</div>
        <div class="diagnostics-content">${renderSectionContent()}</div>
      </div>
    `
  }

  function updateMicLevel() {
    if (!state.analyser) return
    const data = new Uint8Array(state.analyser.fftSize)
    state.analyser.getByteTimeDomainData(data)
    let sum = 0
    for (const value of data) {
      const centered = value - 128
      sum += centered * centered
    }
    const rms = Math.sqrt(sum / data.length)
    state.microphoneLevel = Math.min(100, Math.round((rms / 128) * 280))
    const meterBar = rootElement.querySelector('.microphone-meter span')
    if (meterBar) meterBar.style.width = `${state.microphoneLevel}%`
  }

  function clearMicrophoneMonitoring() {
    if (state.levelInterval) {
      clearInterval(state.levelInterval)
      state.levelInterval = null
    }
    if (state.microphoneStream) {
      state.microphoneStream.getTracks().forEach((track) => track.stop())
      state.microphoneStream = null
    }
    state.analyser = null
  }

  async function runCameraAndMicrophoneTest() {
    try {
      clearMicrophoneMonitoring()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      state.microphoneStream = stream
      state.cameraStatus = 'Камера доступна и выдала видеопоток'
      state.microphoneStatus = 'Микрофон активен'
      state.audioContext = state.audioContext || new AudioContext()
      const source = state.audioContext.createMediaStreamSource(stream)
      state.analyser = state.audioContext.createAnalyser()
      state.analyser.fftSize = 1024
      source.connect(state.analyser)
      state.levelInterval = setInterval(updateMicLevel, 120)
    } catch (error) {
      state.cameraStatus = `Ошибка: ${error.message}`
      state.microphoneStatus = `Ошибка: ${error.message}`
    }
    render()
  }

  async function runDevicesTest() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const summary = devices.map((device) => `${device.kind}: ${device.label || 'без названия'}`).slice(0, 8)
      state.devicesStatus = summary.length ? summary.join(' | ') : 'Устройства не найдены'
    } catch (error) {
      state.devicesStatus = `Ошибка: ${error.message}`
    }
    render()
  }

  async function runSoundTest() {
    try {
      state.audioContext = state.audioContext || new AudioContext()
      const oscillator = state.audioContext.createOscillator()
      const gainNode = state.audioContext.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = 660
      gainNode.gain.value = 0.03
      oscillator.connect(gainNode)
      gainNode.connect(state.audioContext.destination)
      oscillator.start()
      setTimeout(() => oscillator.stop(), 900)
      state.soundStatus = 'Сигнал отправлен. Если слышите звук в наушниках/колонках, аудио работает.'
    } catch (error) {
      state.soundStatus = `Ошибка: ${error.message}`
    }
    render()
  }

  function bindDomEvents() {
    rootElement.addEventListener('click', async (event) => {
      const sectionButton = event.target.closest('[data-diagnostics-section]')
      if (sectionButton) {
        state.activeSection = sectionButton.dataset.diagnosticsSection
        render()
      }

      if (event.target.closest('[data-reset-keys]')) {
        state.pressedKeys.clear()
        render()
      }

      if (event.target.closest('[data-reset-mouse]')) {
        state.mouseClicks = []
        state.mouseButtonCounts = { left: 0, middle: 0, right: 0 }
        state.mouseDoubleClicks = 0
        state.mouseWheelEvents = 0
        state.mouseLastEvent = 'Ожидание действий'
        render()
      }

      if (event.target.closest('[data-test-camera]')) await runCameraAndMicrophoneTest()
      if (event.target.closest('[data-test-devices]')) await runDevicesTest()
      if (event.target.closest('[data-test-sound]')) await runSoundTest()
    })

    rootElement.addEventListener('mousedown', (event) => {
      const zone = event.target.closest('#mouse-test-zone')
      if (!zone) return
      if (event.button === 0) state.mouseButtonCounts.left += 1
      if (event.button === 1) state.mouseButtonCounts.middle += 1
      if (event.button === 2) state.mouseButtonCounts.right += 1
      state.mouseClicks.push(Date.now())
      state.mouseLastEvent = `Нажата кнопка: ${event.button}`
      render()
    })

    rootElement.addEventListener('dblclick', (event) => {
      if (!event.target.closest('#mouse-test-zone')) return
      state.mouseDoubleClicks += 1
      state.mouseLastEvent = 'Даблклик'
      render()
    })

    rootElement.addEventListener('wheel', (event) => {
      if (!event.target.closest('#mouse-test-zone')) return
      state.mouseWheelEvents += 1
      state.mouseLastEvent = event.deltaY > 0 ? 'Прокрутка вниз' : 'Прокрутка вверх'
      render()
    })

    rootElement.addEventListener('contextmenu', (event) => {
      if (!event.target.closest('#mouse-test-zone')) return
      event.preventDefault()
    })

    window.addEventListener('keydown', (event) => {
      const code = event.code || event.key
      if (!keyboardGroups.flat().includes(code)) return
      state.pressedKeys.add(code)
      if (state.activeSection === 'keyboard') render()
    })
  }

  render()
  bindDomEvents()

  return {
    rerender() {
      render()
    },
    destroy() {
      clearMicrophoneMonitoring()
      if (state.audioContext) state.audioContext.close()
    }
  }
}
