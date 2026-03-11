import { diagnosticsSections, keyboardLabels, keyboardRows } from './constants.js'

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

  return `
    <section class="diag-panel diag-keyboard-theme">
      ${renderPanelHeader('Тест клавиатуры', 'Интерфейс в стиле key-test: нажимайте клавиши и проверяйте подсветку.', 'key-test')}
      <div class="diag-stat-strip">
        <div><span>Проверено</span><strong>${tested} / ${total}</strong></div>
        <div><span>Готовность</span><strong>${percent}%</strong></div>
      </div>
      <div class="diag-keyboard-shell">
        <div class="diag-keyboard">${rows}</div>
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
      ${renderPanelHeader('Тест микрофона', 'Добавлен live-мониторинг, запись голоса и быстрый старт/стоп.', 'webcammictest+')}
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
      ${renderPanelHeader('Тест веб-камеры', 'Макет повторяет страницу теста веб-камеры: крупный предпросмотр и индикация эфира.', 'webcammictest')}
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
      ${renderPanelHeader('Тест наушников', 'Можно оставить как есть: каналы и стерео-сигнал для быстрой проверки.', 'webcammictest')}
      <div class="diag-grid-2">
        <button type="button" class="diag-audio-btn" data-diag-tone="left">ЛЕВЫЙ</button>
        <button type="button" class="diag-audio-btn" data-diag-tone="right">ПРАВЫЙ</button>
        <button type="button" class="diag-audio-btn wide" data-diag-tone="stereo">СТЕРЕО</button>
      </div>
      <div class="diag-stat-strip one-col">
        <div><span>Статус</span><strong>${state.headphonesStatus}</strong></div>
      </div>
    </section>
  `
}

function renderMouse(state) {
  return `
    <section class="diag-panel diag-mouse-theme">
      ${renderPanelHeader('Тест мыши', 'Колесо фиксируется внутри зоны и не прокручивает страницу.', 'checkdevice + klik-test')}
      <div class="diag-mouse-layout">
        <div class="diag-mouse-visual ${state.mousePulse}">
          <span class="left"></span>
          <span class="right"></span>
          <span class="wheel"></span>
        </div>
        <div id="diag-mouse-zone" class="diag-mouse-zone" tabindex="0">Кликайте и крутите колесо здесь</div>
      </div>
      <div class="diag-stats-grid">
        <div><span>Левая</span><strong>${state.mouseStats.left}</strong></div>
        <div><span>Правая</span><strong>${state.mouseStats.right}</strong></div>
        <div><span>Средняя</span><strong>${state.mouseStats.middle}</strong></div>
        <div><span>Колесо</span><strong>${state.mouseStats.wheel}</strong></div>
      </div>
      <div class="diag-stat-strip one-col">
        <div><span>Последнее действие</span><strong>${state.mouseStatus}</strong></div>
      </div>
      <div class="diag-actions">
        <button type="button" class="secondary-action" data-diag-reset-mouse>Сбросить счётчики</button>
      </div>
    </section>
  `
}

export function renderDiagnostics(rootElement, state) {
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
