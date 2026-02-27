import { saveComponent, watchFirebaseConnection } from './firebase.js'


const categorySettings = {
  gpu: { title: 'Видеокарты', files: ['BD/GPU/AMD.json', 'BD/GPU/INTEL.json', 'BD/GPU/NVIDIA.json', 'BD/GPU/OTHER.json'] },
  cpu: { title: 'Процессоры', files: ['BD/CPU/AMD.json', 'BD/CPU/INTEL.json'] },
  ram: { title: 'Оперативная память', files: ['BD/RAM/ddr4.json', 'BD/RAM/ddr5.json'] },
  ssd: { title: 'SSD', files: ['BD/COMPONENTS/ssd.json'] },
  motherboard: { title: 'Материнские платы', files: ['BD/MOTHERBOARDS/motherboards.json'] },
  power_supply: { title: 'Блоки питания', files: ['BD/POWER_SUPPLIES/power_supplies.json'] },
  case: { title: 'Корпуса', files: ['BD/COMPONENTS/case.json'] },
  cooler: { title: 'Охлаждение', files: ['BD/COMPONENTS/cooler.json'] }
}

const configuratorCategoryOrder = ['cpu', 'motherboard', 'gpu', 'ram', 'ssd', 'power_supply', 'case', 'cooler']

const firebaseCategoryOptions = [
  { key: 'CPU', label: 'Процессор (CPU)' },
  { key: 'GPU', label: 'Видеокарта (GPU)' },
  { key: 'RAM', label: 'Оперативная память (RAM)' },
  { key: 'PSU', label: 'Блок питания (PSU)' },
  { key: 'MB', label: 'Материнская плата (MB)' },
  { key: 'M2', label: 'M.2 накопитель (M2)' },
  { key: 'SSD', label: 'SSD' },
  { key: 'HDD', label: 'HDD' },
  { key: 'CASE', label: 'Корпус (CASE)' },
  { key: 'Case Fans', label: 'Вентиляторы корпуса (Case Fans)' }
]

const interfaceElements = {
  mainTabsContainer: document.getElementById('main-tabs'),
  mainPanels: document.querySelectorAll('[data-main-panel]'),
  comparisonCategoryTabs: document.getElementById('comparison-category-tabs'),
  comparisonFirstInput: document.getElementById('comparison-first-input'),
  comparisonSecondInput: document.getElementById('comparison-second-input'),
  comparisonFirstOptions: document.getElementById('comparison-first-options'),
  comparisonSecondOptions: document.getElementById('comparison-second-options'),
  comparisonCount: document.getElementById('comparison-count'),
  comparisonResult: document.getElementById('comparison-result'),
  configuratorGrid: document.getElementById('configurator-grid'),
  configuratorResetButton: document.getElementById('configurator-reset'),
  configurationList: document.getElementById('configuration-list'),
  configurationTotal: document.getElementById('configuration-total'),
  configurationWarning: document.getElementById('configuration-warning'),
  firebaseForm: document.getElementById('firebase-component-form'),
  firebaseSpecsContainer: document.getElementById('firebase-specs-container'),
  addFirebaseSpecButton: document.getElementById('add-firebase-spec'),
  firebaseStatus: document.getElementById('firebase-status'),
  firebaseConnectionInfo: document.getElementById('firebase-connection-info')
}

const applicationState = {
  activeMainTab: 'comparison',
  activeComparisonCategory: 'gpu',
  componentsByCategory: {},
  selectedConfigurationByCategory: {},
  comparisonInput: {
    first: '',
    second: ''
  },
  comparisonSelectionBySide: {
    first: '',
    second: ''
  },
  configuratorSearchByCategory: {}
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizeNameForDedupe(name) {
  return normalizeText(name)
    .toLowerCase()
    .replace(/[×xх]\s*\d+/gi, '')
    .replace(/\b\d+\s*gb\b/gi, '')
    .replace(/[()\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function parseNumber(value) {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

function createIdentifier(categoryKey, componentName) {
  return `${categoryKey}-${componentName}`.toLowerCase()
}

function formatPrice(priceValue) {
  return `${Math.round(priceValue)} $`
}

function formatClockFrequency(value) {
  const frequency = parseNumber(value)
  return frequency ? `${frequency} ГГц` : ''
}

async function fetchJsonFile(filePath) {
  const response = await fetch(filePath)
  if (!response.ok) {
    throw new Error(filePath)
  }
  return response.json()
}

function collectRecords(payload) {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.items)) return payload.items
  if (payload && Array.isArray(payload.records)) return payload.records
  return []
}

function extractPriceFromRecord(baseRecord) {
  const priceCandidates = [baseRecord.price, baseRecord.price_last_usd, baseRecord.price_max_usd, baseRecord.price_min_usd]
  for (const priceCandidate of priceCandidates) {
    const parsedPrice = parseNumber(priceCandidate)
    if (parsedPrice !== null && parsedPrice > 0) return parsedPrice
  }
  return null
}

function convertRecord(categoryKey, sourceRecord) {
  const baseRecord = sourceRecord && sourceRecord.data ? sourceRecord.data : sourceRecord
  const componentName = normalizeText(baseRecord?.name)
  if (!componentName) return null

  if (categoryKey === 'cpu') {
    return {
      id: createIdentifier(categoryKey, componentName),
      name: componentName,
      categoryKey,
      price: extractPriceFromRecord(baseRecord),
      specs: {
        Производитель: normalizeText(baseRecord.manufacturer),
        Ядра: parseNumber(baseRecord.core_count) ? String(baseRecord.core_count) : '',
        'Базовая частота': formatClockFrequency(baseRecord.core_clock_ghz),
        'Boost частота': formatClockFrequency(baseRecord.boost_clock_ghz),
        Сокет: normalizeText(baseRecord.socket),
        TDP: parseNumber(baseRecord.tdp_watts) ? `${baseRecord.tdp_watts} Вт` : ''
      }
    }
  }

  if (categoryKey === 'gpu') {
    return {
      id: createIdentifier(categoryKey, componentName),
      name: componentName,
      categoryKey,
      price: extractPriceFromRecord(baseRecord),
      specs: {
        Производитель: normalizeText(baseRecord.manufacturer || baseRecord.vendor),
        Чип: normalizeText(baseRecord.chipset || baseRecord.gpu_chip),
        Память: parseNumber(baseRecord.memory) ? `${baseRecord.memory} ГБ` : '',
        Энергопотребление: parseNumber(baseRecord.power || baseRecord.tdp_watts) ? `${baseRecord.power || baseRecord.tdp_watts} Вт` : ''
      }
    }
  }

  if (categoryKey === 'ram') {
    const memoryModules = Array.isArray(baseRecord.modules) ? baseRecord.modules : []
    const memorySpeed = Array.isArray(baseRecord.speed) ? baseRecord.speed : []
    const totalCapacity = memoryModules.length === 2 ? memoryModules[0] * memoryModules[1] : parseNumber(baseRecord.capacity)
    return {
      id: createIdentifier(categoryKey, componentName),
      name: componentName,
      categoryKey,
      price: extractPriceFromRecord(baseRecord),
      specs: {
        Объем: totalCapacity ? `${totalCapacity} ГБ` : '',
        Частота: memorySpeed.length > 1 ? `${memorySpeed[memorySpeed.length - 1]} МГц` : '',
        Тип: memorySpeed.length ? `DDR${memorySpeed[0]}` : ''
      }
    }
  }

  if (categoryKey === 'ssd') {
    return {
      id: createIdentifier(categoryKey, componentName),
      name: componentName,
      categoryKey,
      price: extractPriceFromRecord(baseRecord),
      specs: {
        Интерфейс: normalizeText(baseRecord.interface),
        Формфактор: normalizeText(baseRecord.form_factor),
        Характеристики: normalizeText(baseRecord.specs)
      }
    }
  }

  if (categoryKey === 'motherboard') {
    return {
      id: createIdentifier(categoryKey, componentName),
      name: componentName,
      categoryKey,
      price: extractPriceFromRecord(baseRecord),
      specs: {
        Сокет: normalizeText(baseRecord.socket),
        Чипсет: normalizeText(baseRecord.chipset),
        Формфактор: normalizeText(baseRecord.form_factor)
      }
    }
  }

  if (categoryKey === 'power_supply') {
    return {
      id: createIdentifier(categoryKey, componentName),
      name: componentName,
      categoryKey,
      price: extractPriceFromRecord(baseRecord),
      specs: {
        Мощность: parseNumber(baseRecord.wattage) ? `${baseRecord.wattage} Вт` : '',
        Сертификат: normalizeText(baseRecord.efficiency_rating),
        Модульность: normalizeText(baseRecord.modular)
      }
    }
  }

  if (categoryKey === 'case') {
    return {
      id: createIdentifier(categoryKey, componentName),
      name: componentName,
      categoryKey,
      price: extractPriceFromRecord(baseRecord),
      specs: {
        Тип: normalizeText(baseRecord.type),
        Формфактор: normalizeText(baseRecord.form_factor),
        Цвет: normalizeText(baseRecord.color)
      }
    }
  }

  if (categoryKey === 'cooler') {
    return {
      id: createIdentifier(categoryKey, componentName),
      name: componentName,
      categoryKey,
      price: extractPriceFromRecord(baseRecord),
      specs: {
        Размер: normalizeText(baseRecord.size),
        Совместимость: normalizeText(baseRecord.socket),
        Характеристики: normalizeText(baseRecord.specs)
      }
    }
  }

  return null
}

function getRecordCompleteness(record) {
  const specValues = Object.values(record.specs || {})
  const nonEmptySpecs = specValues.filter((specValue) => normalizeText(specValue)).length
  const hasPrice = record.price ? 1 : 0
  return nonEmptySpecs + hasPrice
}

function buildUniqueList(records, categoryKey) {
  if (categoryKey === 'power_supply') return records

  const recordsByName = new Map()
  for (const record of records) {
    const nameKey = normalizeNameForDedupe(record.name)
    if (!recordsByName.has(nameKey)) {
      recordsByName.set(nameKey, record)
      continue
    }

    const existingRecord = recordsByName.get(nameKey)
    if (getRecordCompleteness(record) > getRecordCompleteness(existingRecord)) {
      recordsByName.set(nameKey, record)
    }
  }
  return Array.from(recordsByName.values())
}

async function loadCategory(categoryKey) {
  const categoryFiles = categorySettings[categoryKey].files
  const allRecords = []

  for (const categoryFile of categoryFiles) {
    const payload = await fetchJsonFile(categoryFile)
    const sourceRecords = collectRecords(payload)
    for (const sourceRecord of sourceRecords) {
      const convertedRecord = convertRecord(categoryKey, sourceRecord)
      if (convertedRecord) allRecords.push(convertedRecord)
    }
  }

  const uniqueRecords = buildUniqueList(allRecords, categoryKey)
  uniqueRecords.sort((leftRecord, rightRecord) => leftRecord.name.localeCompare(rightRecord.name, 'ru'))
  return uniqueRecords
}

function getRecordById(categoryKey, recordId) {
  const records = applicationState.componentsByCategory[categoryKey] || []
  return records.find((record) => record.id === recordId) || null
}

function renderMainTabs() {
  const allMainTabs = interfaceElements.mainTabsContainer.querySelectorAll('[data-main-tab]')
  for (const mainTabButton of allMainTabs) {
    const isActive = mainTabButton.dataset.mainTab === applicationState.activeMainTab
    mainTabButton.classList.toggle('active', isActive)
  }
  for (const mainPanel of interfaceElements.mainPanels) {
    const isActive = mainPanel.dataset.mainPanel === applicationState.activeMainTab
    mainPanel.classList.toggle('active', isActive)
  }
}

function renderComparisonCategoryTabs() {
  interfaceElements.comparisonCategoryTabs.innerHTML = Object.keys(categorySettings)
    .map((categoryKey) => {
      const isActive = categoryKey === applicationState.activeComparisonCategory
      const count = applicationState.componentsByCategory[categoryKey]?.length || 0
      return `<button type="button" class="category-tab ${isActive ? 'active' : ''}" data-comparison-category="${escapeHtml(categoryKey)}">${escapeHtml(categorySettings[categoryKey].title)} <span>${count}</span></button>`
    })
    .join('')
}

function getFilteredRecords(categoryKey, searchValue) {
  const categoryRecords = applicationState.componentsByCategory[categoryKey] || []
  const normalizedSearchValue = normalizeText(searchValue).toLowerCase()

  if (!normalizedSearchValue) return categoryRecords

  return categoryRecords.filter((record) => {
    if (record.name.toLowerCase().includes(normalizedSearchValue)) return true
    return Object.values(record.specs || {}).some((specValue) => normalizeText(specValue).toLowerCase().includes(normalizedSearchValue))
  })
}

const comparisonVisibleLimit = 25

function findRecordIdByExactName(records, searchValue) {
  const normalizedSearchValue = normalizeText(searchValue).toLowerCase()
  if (!normalizedSearchValue) return ''
  const matchedRecord = records.find((record) => record.name.toLowerCase() === normalizedSearchValue)
  return matchedRecord ? matchedRecord.id : ''
}

function buildComparisonDatalist(records, side) {
  const optionsElement = side === 'first' ? interfaceElements.comparisonFirstOptions : interfaceElements.comparisonSecondOptions
  if (!optionsElement) return

  optionsElement.innerHTML = records
    .slice(0, comparisonVisibleLimit)
    .map((record) => `<option value="${escapeHtml(record.name)}"></option>`)
    .join('')
}

function renderComparisonSelectors() {
  const categoryKey = applicationState.activeComparisonCategory
  const firstRecords = getFilteredRecords(categoryKey, applicationState.comparisonInput.first)
  const secondRecords = getFilteredRecords(categoryKey, applicationState.comparisonInput.second)

  const firstSelectedId = findRecordIdByExactName(firstRecords, applicationState.comparisonInput.first) || applicationState.comparisonSelectionBySide.first
  const secondSelectedId = findRecordIdByExactName(secondRecords, applicationState.comparisonInput.second) || applicationState.comparisonSelectionBySide.second

  applicationState.comparisonSelectionBySide.first = firstRecords.some((record) => record.id === firstSelectedId) ? firstSelectedId : ''
  applicationState.comparisonSelectionBySide.second = secondRecords.some((record) => record.id === secondSelectedId) ? secondSelectedId : ''

  buildComparisonDatalist(firstRecords, 'first')
  buildComparisonDatalist(secondRecords, 'second')

  interfaceElements.comparisonCount.textContent = `${Math.min(firstRecords.length, comparisonVisibleLimit)} из ${firstRecords.length} в первой модели · ${Math.min(secondRecords.length, comparisonVisibleLimit)} из ${secondRecords.length} во второй`

  if (applicationState.comparisonSelectionBySide.first && applicationState.comparisonSelectionBySide.second) {
    renderComparisonTable()
    return
  }

  interfaceElements.comparisonResult.innerHTML = '<p class="empty-state">Введите точное название из списка, чтобы сравнить модели.</p>'
}

function collectSpecNames(firstRecord, secondRecord) {
  const specificationSet = new Set()
  for (const specName of Object.keys(firstRecord.specs || {})) {
    if (normalizeText(firstRecord.specs[specName])) specificationSet.add(specName)
  }
  for (const specName of Object.keys(secondRecord.specs || {})) {
    if (normalizeText(secondRecord.specs[specName])) specificationSet.add(specName)
  }
  return Array.from(specificationSet)
}

function renderComparisonTable() {
  const categoryKey = applicationState.activeComparisonCategory
  const firstRecord = getRecordById(categoryKey, applicationState.comparisonSelectionBySide.first)
  const secondRecord = getRecordById(categoryKey, applicationState.comparisonSelectionBySide.second)

  if (!firstRecord || !secondRecord) {
    interfaceElements.comparisonResult.innerHTML = '<p class="empty-state">Недостаточно данных для сравнения выбранной категории.</p>'
    return
  }

  const specRows = collectSpecNames(firstRecord, secondRecord)
    .map((specName) => {
      const firstValue = normalizeText(firstRecord.specs[specName]) || '—'
      const secondValue = normalizeText(secondRecord.specs[specName]) || '—'
      return `<tr><th>${escapeHtml(specName)}</th><td>${escapeHtml(firstValue)}</td><td>${escapeHtml(secondValue)}</td></tr>`
    })
    .join('')

  const priceRow = `<tr><th>Цена</th><td>${firstRecord.price ? escapeHtml(formatPrice(firstRecord.price)) : '—'}</td><td>${secondRecord.price ? escapeHtml(formatPrice(secondRecord.price)) : '—'}</td></tr>`

  interfaceElements.comparisonResult.innerHTML = `<table class="comparison-table"><thead><tr><th>Параметр</th><th>${escapeHtml(firstRecord.name)}</th><th>${escapeHtml(secondRecord.name)}</th></tr></thead><tbody>${priceRow}${specRows}</tbody></table>`
}

function renderConfigurator() {
  interfaceElements.configuratorGrid.innerHTML = configuratorCategoryOrder
    .map((categoryKey) => {
      const searchValue = applicationState.configuratorSearchByCategory[categoryKey] || ''
      const categoryRecords = getFilteredRecords(categoryKey, searchValue)
      const datalistId = `configurator-options-${categoryKey}`
      const optionsMarkup = categoryRecords
        .map((categoryRecord) => {
          const priceLabel = categoryRecord.price ? ` · ${formatPrice(categoryRecord.price)}` : ''
          return `<option value="${escapeHtml(categoryRecord.name)}" label="${escapeHtml(categoryRecord.name + priceLabel)}"></option>`
        })
        .join('')

      return `
        <label class="configurator-field">
          ${escapeHtml(categorySettings[categoryKey].title)}
          <input class="configurator-search" data-configurator-search="${escapeHtml(categoryKey)}" list="${escapeHtml(datalistId)}" type="search" placeholder="Начните писать для выбора компонента" autocomplete="off">
          <datalist id="${escapeHtml(datalistId)}">${optionsMarkup}</datalist>
        </label>
      `
    })
    .join('')

  for (const categoryKey of configuratorCategoryOrder) {
    const selectedRecordId = applicationState.selectedConfigurationByCategory[categoryKey] || ''
    const selectedRecord = getRecordById(categoryKey, selectedRecordId)
    const searchElement = interfaceElements.configuratorGrid.querySelector(`[data-configurator-search="${categoryKey}"]`)
    if (searchElement) {
      searchElement.value = selectedRecord ? selectedRecord.name : (applicationState.configuratorSearchByCategory[categoryKey] || '')
    }
  }
}

function validateSocketCompatibility() {
  const processorRecord = getRecordById('cpu', applicationState.selectedConfigurationByCategory.cpu)
  const motherboardRecord = getRecordById('motherboard', applicationState.selectedConfigurationByCategory.motherboard)
  if (!processorRecord || !motherboardRecord) return ''

  const processorSocket = normalizeText(processorRecord.specs.Сокет)
  const motherboardSocket = normalizeText(motherboardRecord.specs.Сокет)
  if (processorSocket && motherboardSocket && processorSocket !== motherboardSocket) {
    return `Сокет процессора (${processorSocket}) не совпадает с сокетом материнской платы (${motherboardSocket}).`
  }
  return ''
}

function renderConfigurationSummary() {
  const summaryItems = []
  let totalPrice = 0

  for (const categoryKey of configuratorCategoryOrder) {
    const selectedRecord = getRecordById(categoryKey, applicationState.selectedConfigurationByCategory[categoryKey])
    if (!selectedRecord) continue
    if (selectedRecord.price) totalPrice += selectedRecord.price
    const priceLabel = selectedRecord.price ? ` · ${formatPrice(selectedRecord.price)}` : ''
    summaryItems.push(`<li><strong>${escapeHtml(categorySettings[categoryKey].title)}:</strong> ${escapeHtml(selectedRecord.name)}${escapeHtml(priceLabel)}</li>`)
  }

  interfaceElements.configurationList.innerHTML = summaryItems.join('') || '<li>Выберите комплектующие в конфигураторе.</li>'
  interfaceElements.configurationTotal.textContent = totalPrice > 0 ? `Общая стоимость: ${formatPrice(totalPrice)}` : 'Общая стоимость: нет данных по ценам'
  interfaceElements.configurationWarning.textContent = validateSocketCompatibility()
}

function createFirebaseSpecRow(key = '', value = '') {
  const row = document.createElement('div')
  row.className = 'firebase-spec-row'
  row.innerHTML = `
    <input type="text" placeholder="Характеристика (например, Сокет)" value="${escapeHtml(key)}" data-spec-key>
    <input type="text" placeholder="Значение (например, AM5)" value="${escapeHtml(value)}" data-spec-value>
    <button type="button" class="secondary-action" data-remove-spec>Удалить</button>
  `
  interfaceElements.firebaseSpecsContainer.appendChild(row)
}

function collectFirebaseSpecs() {
  const specs = {}
  const rows = interfaceElements.firebaseSpecsContainer.querySelectorAll('.firebase-spec-row')
  for (const row of rows) {
    const key = normalizeText(row.querySelector('[data-spec-key]')?.value)
    const value = normalizeText(row.querySelector('[data-spec-value]')?.value)
    if (key && value) specs[key] = value
  }
  return specs
}

function renderFirebaseConnectionState() {
  if (!interfaceElements.firebaseConnectionInfo) return
  interfaceElements.firebaseConnectionInfo.textContent = 'Firebase подключен: выполняется проверка соединения...'
  interfaceElements.firebaseConnectionInfo.classList.remove('firebase-disconnected')
  interfaceElements.firebaseConnectionInfo.classList.add('firebase-connected')
}

async function saveComponentToFirebase(event) {
  event.preventDefault()
  interfaceElements.firebaseStatus.textContent = ''

  const category = normalizeText(interfaceElements.firebaseForm.elements.firebaseCategory.value)
  const componentName = normalizeText(interfaceElements.firebaseForm.elements.firebaseComponentName.value)

  if (!category || !componentName) {
    interfaceElements.firebaseStatus.textContent = 'Заполните категорию и название компонента.'
    return
  }

  const specs = collectFirebaseSpecs()
  try {
    await saveComponent(category, componentName, specs)
    interfaceElements.firebaseStatus.textContent = `Компонент сохранён: PC/${category}/components/${componentName}`
    interfaceElements.firebaseForm.reset()
    interfaceElements.firebaseSpecsContainer.innerHTML = ''
    createFirebaseSpecRow()
  } catch (error) {
    interfaceElements.firebaseStatus.textContent = `Не удалось сохранить в Firebase: ${error.message}`
  }
}

function bindEvents() {
  interfaceElements.mainTabsContainer.addEventListener('click', (event) => {
    const tabButton = event.target.closest('[data-main-tab]')
    if (!tabButton) return
    applicationState.activeMainTab = tabButton.dataset.mainTab
    renderMainTabs()
  })

  interfaceElements.comparisonCategoryTabs.addEventListener('click', (event) => {
    const tabButton = event.target.closest('[data-comparison-category]')
    if (!tabButton) return
    applicationState.activeComparisonCategory = tabButton.dataset.comparisonCategory
    applicationState.comparisonInput.first = ''
    applicationState.comparisonInput.second = ''
    applicationState.comparisonSelectionBySide.first = ''
    applicationState.comparisonSelectionBySide.second = ''
    interfaceElements.comparisonFirstInput.value = ''
    interfaceElements.comparisonSecondInput.value = ''
    renderComparisonCategoryTabs()
    renderComparisonSelectors()
  })

  interfaceElements.comparisonFirstInput.addEventListener('input', (event) => {
    applicationState.comparisonInput.first = event.target.value
    applicationState.comparisonSelectionBySide.first = findRecordIdByExactName(
      getFilteredRecords(applicationState.activeComparisonCategory, event.target.value),
      event.target.value
    )
    renderComparisonSelectors()
  })

  interfaceElements.comparisonSecondInput.addEventListener('input', (event) => {
    applicationState.comparisonInput.second = event.target.value
    applicationState.comparisonSelectionBySide.second = findRecordIdByExactName(
      getFilteredRecords(applicationState.activeComparisonCategory, event.target.value),
      event.target.value
    )
    renderComparisonSelectors()
  })

  interfaceElements.configuratorGrid.addEventListener('input', (event) => {
    const searchInput = event.target.closest('[data-configurator-search]')
    if (!searchInput) return

    const categoryKey = searchInput.dataset.configuratorSearch
    const inputValue = normalizeText(searchInput.value)
    applicationState.configuratorSearchByCategory[categoryKey] = inputValue

    const categoryRecords = applicationState.componentsByCategory[categoryKey] || []
    const matchedRecord = categoryRecords.find((record) => record.name.toLowerCase() === inputValue.toLowerCase())
    applicationState.selectedConfigurationByCategory[categoryKey] = matchedRecord ? matchedRecord.id : ''

    renderConfigurator()
    renderConfigurationSummary()
  })

  interfaceElements.configuratorResetButton.addEventListener('click', () => {
    applicationState.selectedConfigurationByCategory = {}
    applicationState.configuratorSearchByCategory = {}
    renderConfigurator()
    renderConfigurationSummary()
  })

  interfaceElements.addFirebaseSpecButton.addEventListener('click', () => createFirebaseSpecRow())

  interfaceElements.firebaseSpecsContainer.addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-remove-spec]')
    if (!removeButton) return
    removeButton.closest('.firebase-spec-row')?.remove()
  })

  interfaceElements.firebaseForm.addEventListener('submit', saveComponentToFirebase)
}

async function initializeApplication() {
  interfaceElements.firebaseForm.elements.firebaseCategory.innerHTML = firebaseCategoryOptions
    .map((option) => `<option value="${escapeHtml(option.key)}">${escapeHtml(option.label)}</option>`)
    .join('')

  for (const categoryKey of Object.keys(categorySettings)) {
    applicationState.componentsByCategory[categoryKey] = await loadCategory(categoryKey)
  }

  const firstProcessor = applicationState.componentsByCategory.cpu[0]
  const firstMotherboard = applicationState.componentsByCategory.motherboard[0]
  if (firstProcessor) applicationState.selectedConfigurationByCategory.cpu = firstProcessor.id
  if (firstMotherboard) applicationState.selectedConfigurationByCategory.motherboard = firstMotherboard.id

  renderMainTabs()
  renderComparisonCategoryTabs()
  renderComparisonSelectors()
  renderConfigurator()
  renderConfigurationSummary()
  createFirebaseSpecRow('Производитель', '')
  renderFirebaseConnectionState()
  await watchFirebaseConnection((connected) => {
    if (!interfaceElements.firebaseConnectionInfo) return
    interfaceElements.firebaseConnectionInfo.textContent = connected
      ? 'Firebase подключен: соединение с Firestore активно.'
      : 'Firebase недоступен: проверьте Firestore Rules и включение Anonymous Authentication.'
    interfaceElements.firebaseConnectionInfo.classList.toggle('firebase-connected', connected)
    interfaceElements.firebaseConnectionInfo.classList.toggle('firebase-disconnected', !connected)
  })
  bindEvents()
}

initializeApplication()
