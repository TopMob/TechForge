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

const interfaceElements = {
  mainTabsContainer: document.getElementById('main-tabs'),
  mainPanels: document.querySelectorAll('[data-main-panel]'),
  comparisonCategoryTabs: document.getElementById('comparison-category-tabs'),
  comparisonFirstSelect: document.getElementById('comparison-first-select'),
  comparisonSecondSelect: document.getElementById('comparison-second-select'),
  comparisonResult: document.getElementById('comparison-result'),
  configuratorGrid: document.getElementById('configurator-grid'),
  configurationList: document.getElementById('configuration-list'),
  configurationTotal: document.getElementById('configuration-total'),
  configurationWarning: document.getElementById('configuration-warning')
}

const applicationState = {
  activeMainTab: 'comparison',
  activeComparisonCategory: 'gpu',
  componentsByCategory: {},
  selectedConfigurationByCategory: {}
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
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

async function fetchJsonFile(filePath) {
  const response = await fetch(filePath)
  if (!response.ok) {
    throw new Error(filePath)
  }
  return response.json()
}

function collectRecords(payload) {
  if (Array.isArray(payload)) {
    return payload
  }
  if (payload && Array.isArray(payload.items)) {
    return payload.items
  }
  if (payload && Array.isArray(payload.records)) {
    return payload.records
  }
  return []
}

function extractPriceFromRecord(baseRecord) {
  const priceCandidates = [baseRecord.price, baseRecord.price_last_usd, baseRecord.price_max_usd, baseRecord.price_min_usd]
  for (const priceCandidate of priceCandidates) {
    const parsedPrice = parseNumber(priceCandidate)
    if (parsedPrice !== null && parsedPrice > 0) {
      return parsedPrice
    }
  }
  return null
}

function convertRecord(categoryKey, sourceRecord) {
  const baseRecord = sourceRecord && sourceRecord.data ? sourceRecord.data : sourceRecord
  const componentName = normalizeText(baseRecord?.name)
  if (!componentName) {
    return null
  }

  if (categoryKey === 'cpu') {
    return {
      id: createIdentifier(categoryKey, componentName),
      name: componentName,
      categoryKey,
      price: extractPriceFromRecord(baseRecord),
      specs: {
        Производитель: normalizeText(baseRecord.manufacturer),
        Ядра: parseNumber(baseRecord.core_count) ? String(baseRecord.core_count) : '',
        ЧастотаBoost: parseNumber(baseRecord.boost_clock_ghz) ? `${baseRecord.boost_clock_ghz} ГГц` : '',
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
    const totalCapacity = memoryModules.length === 2 ? memoryModules[0] * memoryModules[1] : null
    return {
      id: createIdentifier(categoryKey, componentName),
      name: componentName,
      categoryKey,
      price: extractPriceFromRecord(baseRecord),
      specs: {
        Объем: totalCapacity ? `${totalCapacity} ГБ` : '',
        Модули: memoryModules.length ? `${memoryModules.join('x')} ГБ` : '',
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

function buildUniqueList(records) {
  const recordsByName = new Map()
  for (const record of records) {
    const nameKey = record.name.toLowerCase()
    if (!recordsByName.has(nameKey)) {
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
      if (convertedRecord) {
        allRecords.push(convertedRecord)
      }
    }
  }

  const uniqueRecords = buildUniqueList(allRecords)
  uniqueRecords.sort((leftRecord, rightRecord) => leftRecord.name.localeCompare(rightRecord.name, 'ru'))
  return uniqueRecords.slice(0, 500)
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

function renderComparisonSelectors() {
  const categoryKey = applicationState.activeComparisonCategory
  const categoryRecords = applicationState.componentsByCategory[categoryKey] || []
  const optionsMarkup = categoryRecords.map((record) => `<option value="${escapeHtml(record.id)}">${escapeHtml(record.name)}</option>`).join('')

  interfaceElements.comparisonFirstSelect.innerHTML = optionsMarkup
  interfaceElements.comparisonSecondSelect.innerHTML = optionsMarkup

  if (categoryRecords.length > 1) {
    interfaceElements.comparisonFirstSelect.value = categoryRecords[0].id
    interfaceElements.comparisonSecondSelect.value = categoryRecords[1].id
  }

  renderComparisonTable()
}

function collectSpecNames(firstRecord, secondRecord) {
  const specificationSet = new Set()
  for (const specName of Object.keys(firstRecord.specs || {})) {
    if (normalizeText(firstRecord.specs[specName])) {
      specificationSet.add(specName)
    }
  }
  for (const specName of Object.keys(secondRecord.specs || {})) {
    if (normalizeText(secondRecord.specs[specName])) {
      specificationSet.add(specName)
    }
  }
  return Array.from(specificationSet)
}

function renderComparisonTable() {
  const categoryKey = applicationState.activeComparisonCategory
  const firstRecord = getRecordById(categoryKey, interfaceElements.comparisonFirstSelect.value)
  const secondRecord = getRecordById(categoryKey, interfaceElements.comparisonSecondSelect.value)

  if (!firstRecord || !secondRecord) {
    interfaceElements.comparisonResult.innerHTML = '<p class="empty-state">Недостаточно данных для сравнения выбранной категории.</p>'
    return
  }

  const specNames = collectSpecNames(firstRecord, secondRecord)
  const specRows = specNames
    .map((specName) => {
      const firstValue = normalizeText(firstRecord.specs[specName]) || '—'
      const secondValue = normalizeText(secondRecord.specs[specName]) || '—'
      return `<tr><th>${escapeHtml(specName)}</th><td>${escapeHtml(firstValue)}</td><td>${escapeHtml(secondValue)}</td></tr>`
    })
    .join('')

  const priceRow = `<tr><th>Цена</th><td>${firstRecord.price ? escapeHtml(formatPrice(firstRecord.price)) : '—'}</td><td>${secondRecord.price ? escapeHtml(formatPrice(secondRecord.price)) : '—'}</td></tr>`

  interfaceElements.comparisonResult.innerHTML = `
    <table class="comparison-table">
      <thead>
        <tr>
          <th>Параметр</th>
          <th>${escapeHtml(firstRecord.name)}</th>
          <th>${escapeHtml(secondRecord.name)}</th>
        </tr>
      </thead>
      <tbody>
        ${priceRow}
        ${specRows}
      </tbody>
    </table>
  `
}

function renderConfigurator() {
  interfaceElements.configuratorGrid.innerHTML = configuratorCategoryOrder
    .map((categoryKey) => {
      const categoryRecords = applicationState.componentsByCategory[categoryKey] || []
      const optionsMarkup = ['<option value="">Не выбрано</option>']
      for (const categoryRecord of categoryRecords) {
        const priceLabel = categoryRecord.price ? ` · ${formatPrice(categoryRecord.price)}` : ''
        optionsMarkup.push(`<option value="${escapeHtml(categoryRecord.id)}">${escapeHtml(categoryRecord.name + priceLabel)}</option>`)
      }
      return `
        <label class="configurator-field">
          ${escapeHtml(categorySettings[categoryKey].title)}
          <select data-configurator-category="${escapeHtml(categoryKey)}">${optionsMarkup.join('')}</select>
        </label>
      `
    })
    .join('')

  for (const categoryKey of configuratorCategoryOrder) {
    const selectedRecordId = applicationState.selectedConfigurationByCategory[categoryKey] || ''
    const selectElement = interfaceElements.configuratorGrid.querySelector(`[data-configurator-category="${categoryKey}"]`)
    if (selectElement) {
      selectElement.value = selectedRecordId
    }
  }
}

function validateSocketCompatibility() {
  const processorRecord = getRecordById('cpu', applicationState.selectedConfigurationByCategory.cpu)
  const motherboardRecord = getRecordById('motherboard', applicationState.selectedConfigurationByCategory.motherboard)
  if (!processorRecord || !motherboardRecord) {
    return ''
  }

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
    const selectedRecordId = applicationState.selectedConfigurationByCategory[categoryKey]
    const selectedRecord = getRecordById(categoryKey, selectedRecordId)
    if (!selectedRecord) {
      continue
    }
    if (selectedRecord.price) {
      totalPrice += selectedRecord.price
    }
    const priceLabel = selectedRecord.price ? ` · ${formatPrice(selectedRecord.price)}` : ''
    summaryItems.push(`<li><strong>${escapeHtml(categorySettings[categoryKey].title)}:</strong> ${escapeHtml(selectedRecord.name)}${escapeHtml(priceLabel)}</li>`)
  }

  interfaceElements.configurationList.innerHTML = summaryItems.join('') || '<li>Выберите комплектующие в конфигураторе.</li>'
  interfaceElements.configurationTotal.textContent = totalPrice > 0 ? `Общая стоимость: ${formatPrice(totalPrice)}` : 'Общая стоимость: нет данных по ценам'
  interfaceElements.configurationWarning.textContent = validateSocketCompatibility()
}

function bindEvents() {
  interfaceElements.mainTabsContainer.addEventListener('click', (event) => {
    const tabButton = event.target.closest('[data-main-tab]')
    if (!tabButton) {
      return
    }
    applicationState.activeMainTab = tabButton.dataset.mainTab
    renderMainTabs()
  })

  interfaceElements.comparisonCategoryTabs.addEventListener('click', (event) => {
    const tabButton = event.target.closest('[data-comparison-category]')
    if (!tabButton) {
      return
    }
    applicationState.activeComparisonCategory = tabButton.dataset.comparisonCategory
    renderComparisonCategoryTabs()
    renderComparisonSelectors()
  })

  interfaceElements.comparisonFirstSelect.addEventListener('change', renderComparisonTable)
  interfaceElements.comparisonSecondSelect.addEventListener('change', renderComparisonTable)

  interfaceElements.configuratorGrid.addEventListener('change', (event) => {
    const categorySelect = event.target.closest('[data-configurator-category]')
    if (!categorySelect) {
      return
    }
    applicationState.selectedConfigurationByCategory[categorySelect.dataset.configuratorCategory] = categorySelect.value
    renderConfigurationSummary()
  })
}

async function initializeApplication() {
  for (const categoryKey of Object.keys(categorySettings)) {
    applicationState.componentsByCategory[categoryKey] = await loadCategory(categoryKey)
  }

  const firstProcessor = applicationState.componentsByCategory.cpu[0]
  const firstMotherboard = applicationState.componentsByCategory.motherboard[0]
  if (firstProcessor) {
    applicationState.selectedConfigurationByCategory.cpu = firstProcessor.id
  }
  if (firstMotherboard) {
    applicationState.selectedConfigurationByCategory.motherboard = firstMotherboard.id
  }

  renderMainTabs()
  renderComparisonCategoryTabs()
  renderComparisonSelectors()
  renderConfigurator()
  renderConfigurationSummary()
  bindEvents()
}

initializeApplication()
