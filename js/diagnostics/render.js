import { diagnosticsSections, keyboardLabels, keyboardRows } from './constants.js'

function renderSectionTabs(activeSection) {
  return diagnosticsSections
    .map((section) => `<button type="button" class="diag-tab ${activeSection === section.key ? 'active' : ''}" data-diag-section="${section.key}">${section.label}</button>`)
    .join('')
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

  return `
    <section class="diag-panel">
      <h3>Тест клавиатуры</h3>
      <p class="diag-hint">Нажимайте клавиши и проверяйте, что они подсвечиваются.</p>
      <div class="diag-progress">
        <span>Проверено клавиш</span>
        <strong>${tested}/${total}</strong>
      </div>
      <div class="diag-keyboard">${rows}</div>
      <div class="diag-actions">
        <button type="button" class="secondary-action" data-diag-reset-keys>Сброс</button>
      </div>
    </section>
  `
}

function renderMicrophone(state) {
  return `
    <section class="diag-panel">
      <h3>Тест микрофона</h3>
      <p class="diag-hint">Разрешите доступ к микрофону и произнесите несколько фраз.</p>
      <div class="diag-meter-shell">
        <div class="diag-meter-fill" style="width:${state.microphoneLevel}%"></div>
      </div>
      <div class="diag-progress">
        <span>Уровень сигнала</span>
        <strong>${state.microphoneLevel}%</strong>
      </div>
      <p class="comparison-count">${state.microphoneStatus}</p>
      <div class="diag-actions">
        <button type="button" class="secondary-action" data-diag-start-microphone>Запустить</button>
        <button type="button" class="secondary-action" data-diag-stop-microphone>Остановить</button>
      </div>
    </section>
  `
}

function renderWebcam(state) {
  return `
    <section class="diag-panel">
      <h3>Тест веб-камеры</h3>
      <p class="diag-hint">Проверьте изображение в превью, как в сервисе webcammictest.</p>
      <div class="diag-camera-shell ${state.webcamActive ? 'live' : ''}">
        <video id="diag-webcam-video" autoplay playsinline muted></video>
        <span class="diag-camera-overlay">${state.webcamActive ? 'LIVE' : 'Камера выключена'}</span>
      </div>
      <p class="comparison-count">${state.webcamStatus}</p>
      <div class="diag-actions">
        <button type="button" class="secondary-action" data-diag-start-webcam>Включить камеру</button>
        <button type="button" class="secondary-action" data-diag-stop-webcam>Выключить</button>
      </div>
    </section>
  `
}

function renderHeadphones(state) {
  return `
    <section class="diag-panel">
      <h3>Тест наушников</h3>
      <p class="diag-hint">Запускайте сигнал по каналам и проверяйте баланс левого/правого уха.</p>
      <div class="diag-grid-2">
        <button type="button" class="diag-audio-btn" data-diag-tone="left">Левый канал</button>
        <button type="button" class="diag-audio-btn" data-diag-tone="right">Правый канал</button>
        <button type="button" class="diag-audio-btn wide" data-diag-tone="stereo">Стерео</button>
      </div>
      <p class="comparison-count">${state.headphonesStatus}</p>
    </section>
  `
}

function renderMouse(state) {
  return `
    <section class="diag-panel">
      <h3>Тест мыши</h3>
      <p class="diag-hint">Кликайте в зоне теста и прокручивайте колесо.</p>
      <div class="diag-mouse-visual ${state.mousePulse}">
        <span class="left"></span>
        <span class="right"></span>
        <span class="wheel"></span>
      </div>
      <div id="diag-mouse-zone" class="diag-mouse-zone" tabindex="0">Кликайте здесь</div>
      <div class="diag-stats-grid">
        <div><span>ЛКМ</span><strong>${state.mouseStats.left}</strong></div>
        <div><span>ПКМ</span><strong>${state.mouseStats.right}</strong></div>
        <div><span>СКМ</span><strong>${state.mouseStats.middle}</strong></div>
        <div><span>Прокрутка</span><strong>${state.mouseStats.wheel}</strong></div>
      </div>
      <p class="comparison-count">${state.mouseStatus}</p>
      <div class="diag-actions">
        <button type="button" class="secondary-action" data-diag-reset-mouse>Сброс</button>
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
    <div class="diag-site-layout">
      <aside class="diag-site-sidebar">${renderSectionTabs(state.activeSection)}</aside>
      <div class="diag-site-content">${content}</div>
    </div>
  `
}
