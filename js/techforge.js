const categorySettings = {
  cpu: { title: 'Процессор', files: ['BD/CPU/AMD.json', 'BD/CPU/INTEL.json'] },
  gpu: { title: 'Видеокарта', files: ['BD/GPU/AMD.json', 'BD/GPU/INTEL.json', 'BD/GPU/NVIDIA.json', 'BD/GPU/OTHER.json'] },
  motherboard: { title: 'Материнская плата', files: ['BD/MOTHERBOARDS/motherboards.json'] },
  ram: { title: 'Оперативная память', files: ['BD/RAM/ddr4.json', 'BD/RAM/ddr5.json'] },
  ssd: { title: 'SSD', files: ['BD/COMPONENTS/ssd.json'] },
  power_supply: { title: 'Блок питания', files: ['BD/POWER_SUPPLIES/power_supplies.json'] },
  case: { title: 'Корпус', files: ['BD/COMPONENTS/case.json'] },
  cooler: { title: 'Охлаждение', files: ['BD/COMPONENTS/cooler.json'] }
}

const componentOrder = ['cpu', 'motherboard', 'gpu', 'ram', 'ssd', 'power_supply', 'case', 'cooler']

const interfaceElements = {
  comparisonCategorySelect: document.getElementById('comparison-category-select'),
  comparisonFirstSelect: document.getElementById('comparison-first-select'),
  comparisonSecondSelect: document.getElementById('comparison-second-select'),
  comparisonResult: document.getElementById('comparison-result'),
  configuratorForm: document.getElementById('configurator-form'),
  configurationList: document.getElementById('configuration-list'),
  configurationTotal: document.getElementById('configuration-total'),
  configurationWarning: document.getElementById('configuration-warning')
}

const applicationState = {
  componentsByCategory: {},
  selectedComparisonCategory: 'gpu',
  selectedConfiguration: {}
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

async function fetchJsonFile(path) {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(path)
  }
  return response.json()
}

function getCollectionFromPayload(payload) {
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

function extractPrice(rawRecord) {
  const candidateValues = [rawRecord.price, rawRecord.price_last_usd, rawRecord.price_max_usd, rawRecord.price_min_usd]
  for (const candidateValue of candidateValues) {
    const parsedValue = parseNumber(candidateValue)
    if (parsedValue !== null && parsedValue > 0) {
      return parsedValue
    }
  }
  return null
}

function formatCurrency(value) {
  return `${Math.round(value)} $`
}

function createComponentRecord(categoryKey, rawRecord) {
  const baseRecord = rawRecord && rawRecord.data ? rawRecord.data : rawRecord
  const componentName = normalizeText(baseRecord?.name)
  if (!componentName) {
    return null
  }

  if (categoryKey === 'cpu') {
    const coreCount = parseNumber(baseRecord.core_count)
    const boostClock = parseNumber(baseRecord.boost_clock_ghz)
    const socketName = normalizeText(baseRecord.socket || '')
    const thermalDesignPower = parseNumber(baseRecord.tdp_watts)
    const propertyRows = {
      Производитель: normalizeText(baseRecord.manufacturer),
      Ядра: coreCount ? String(coreCount) : '',
      ЧастотаBoost: boostClock ? `${boostClock} ГГц` : '',
      Сокет: socketName,
      TDP: thermalDesignPower ? `${thermalDesignPower} Вт` : ''
    }
    return { id: `${categoryKey}-${componentName}`, name: componentName, categoryKey, price: extractPrice(baseRecord), propertyRows }
  }

  if (categoryKey === 'gpu') {
    const memoryAmount = parseNumber(baseRecord.memory)
    const powerDraw = parseNumber(baseRecord.tdp_watts || baseRecord.power)
    const propertyRows = {
      Производитель: normalizeText(baseRecord.manufacturer || baseRecord.vendor || ''),
      Чип: normalizeText(baseRecord.chipset || baseRecord.gpu_chip || ''),
      Память: memoryAmount ? `${memoryAmount} ГБ` : '',
      Энергопотребление: powerDraw ? `${powerDraw} Вт` : ''
    }
    return { id: `${categoryKey}-${componentName}`, name: componentName, categoryKey, price: extractPrice(baseRecord), propertyRows }
  }

  if (categoryKey === 'motherboard') {
    const propertyRows = {
      Сокет: normalizeText(baseRecord.socket),
      Чипсет: normalizeText(baseRecord.chipset),
      Формфактор: normalizeText(baseRecord.form_factor || '')
    }
    return { id: `${categoryKey}-${componentName}`, name: componentName, categoryKey, price: extractPrice(baseRecord), propertyRows }
  }

  if (categoryKey === 'ram') {
    const moduleList = Array.isArray(baseRecord.modules) ? baseRecord.modules : []
    const speedList = Array.isArray(baseRecord.speed) ? baseRecord.speed : []
    const totalMemory = moduleList.length === 2 ? moduleList[0] * moduleList[1] : null
    const propertyRows = {
      Объем: totalMemory ? `${totalMemory} ГБ` : '',
      Компоновка: moduleList.length ? `${moduleList.join('x')} ГБ` : '',
      Частота: speedList.length > 1 ? `${speedList[speedList.length - 1]} МГц` : '',
      Тип: speedList.length ? `DDR${speedList[0]}` : ''
    }
    return { id: `${categoryKey}-${componentName}`, name: componentName, categoryKey, price: extractPrice(baseRecord), propertyRows }
  }

  if (categoryKey === 'ssd') {
    const propertyRows = {
      Интерфейс: normalizeText(baseRecord.interface || ''),
      Формфактор: normalizeText(baseRecord.form_factor || ''),
      Характеристики: normalizeText(baseRecord.specs || '')
    }
    return { id: `${categoryKey}-${componentName}`, name: componentName, categoryKey, price: extractPrice(baseRecord), propertyRows }
  }

  if (categoryKey === 'power_supply') {
    const wattage = parseNumber(baseRecord.wattage)
    const propertyRows = {
      Мощность: wattage ? `${wattage} Вт` : '',
      Сертификат: normalizeText(baseRecord.efficiency_rating),
      Модульность: normalizeText(baseRecord.modular || '')
    }
    return { id: `${categoryKey}-${componentName}`, name: componentName, categoryKey, price: extractPrice(baseRecord), propertyRows }
  }

  if (categoryKey === 'case') {
    const propertyRows = {
      Тип: normalizeText(baseRecord.type || ''),
      Формфактор: normalizeText(baseRecord.form_factor || ''),
      Цвет: normalizeText(baseRecord.color || '')
    }
    return { id: `${categoryKey}-${componentName}`, name: componentName, categoryKey, price: extractPrice(baseRecord), propertyRows }
  }

  if (categoryKey === 'cooler') {
    const propertyRows = {
      Размер: normalizeText(baseRecord.size || ''),
      Совместимость: normalizeText(baseRecord.socket || ''),
      Характеристики: normalizeText(baseRecord.specs || '')
    }
    return { id: `${categoryKey}-${componentName}`, name: componentName, categoryKey, price: extractPrice(baseRecord), propertyRows }
  }

  return null
}

function mergeByName(componentRecords) {
  const uniqueRecordsMap = new Map()
  for (const record of componentRecords) {
    const recordKey = record.name.toLowerCase()
    if (!uniqueRecordsMap.has(recordKey)) {
      uniqueRecordsMap.set(recordKey, record)
    }
  }
  return Array.from(uniqueRecordsMap.values())
}

async function loadCategoryComponents(categoryKey) {
  const categoryFiles = categorySettings[categoryKey].files
  const mergedRecords = []

  for (const categoryFile of categoryFiles) {
    const payload = await fetchJsonFile(categoryFile)
    const records = getCollectionFromPayload(payload)
    for (const rawRecord of records) {
      const convertedRecord = createComponentRecord(categoryKey, rawRecord)
      if (convertedRecord) {
        mergedRecords.push(convertedRecord)
      }
    }
  }

  const uniqueRecords = mergeByName(mergedRecords)
  uniqueRecords.sort((firstRecord, secondRecord) => firstRecord.name.localeCompare(secondRecord.name, 'ru'))
  return uniqueRecords.slice(0, 400)
}

function getComponentById(categoryKey, componentId) {
  const records = applicationState.componentsByCategory[categoryKey] || []
  return records.find((record) => record.id === componentId) || null
}

function renderComparisonSelectors() {
  interfaceElements.comparisonCategorySelect.innerHTML = Object.keys(categorySettings)
    .map((categoryKey) => `<option value="${escapeHtml(categoryKey)}">${escapeHtml(categorySettings[categoryKey].title)}</option>`)
    .join('')

  interfaceElements.comparisonCategorySelect.value = applicationState.selectedComparisonCategory
  renderComparisonComponentOptions()
}

function renderComparisonComponentOptions() {
  const activeCategoryKey = applicationState.selectedComparisonCategory
  const categoryComponents = applicationState.componentsByCategory[activeCategoryKey] || []
  const optionsMarkup = categoryComponents
    .map((record) => `<option value="${escapeHtml(record.id)}">${escapeHtml(record.name)}</option>`)
    .join('')

  interfaceElements.comparisonFirstSelect.innerHTML = optionsMarkup
  interfaceElements.comparisonSecondSelect.innerHTML = optionsMarkup

  if (categoryComponents.length > 1) {
    interfaceElements.comparisonFirstSelect.value = categoryComponents[0].id
    interfaceElements.comparisonSecondSelect.value = categoryComponents[1].id
  }

  renderComparisonResult()
}

function collectPropertyNames(firstComponent, secondComponent) {
  const propertyNameSet = new Set()
  for (const propertyName of Object.keys(firstComponent.propertyRows || {})) {
    if (firstComponent.propertyRows[propertyName]) {
      propertyNameSet.add(propertyName)
    }
  }
  for (const propertyName of Object.keys(secondComponent.propertyRows || {})) {
    if (secondComponent.propertyRows[propertyName]) {
      propertyNameSet.add(propertyName)
    }
  }
  return Array.from(propertyNameSet)
}

function renderComparisonResult() {
  const categoryKey = applicationState.selectedComparisonCategory
  const firstComponent = getComponentById(categoryKey, interfaceElements.comparisonFirstSelect.value)
  const secondComponent = getComponentById(categoryKey, interfaceElements.comparisonSecondSelect.value)

  if (!firstComponent || !secondComponent) {
    interfaceElements.comparisonResult.innerHTML = '<p>Для выбранной категории пока недостаточно данных.</p>'
    return
  }

  const propertyNames = collectPropertyNames(firstComponent, secondComponent)
  const rowsMarkup = propertyNames
    .map((propertyName) => {
      const firstValue = normalizeText(firstComponent.propertyRows[propertyName]) || '—'
      const secondValue = normalizeText(secondComponent.propertyRows[propertyName]) || '—'
      return `<tr><th>${escapeHtml(propertyName)}</th><td>${escapeHtml(firstValue)}</td><td>${escapeHtml(secondValue)}</td></tr>`
    })
    .join('')

  const priceRow = `<tr><th>Цена</th><td>${firstComponent.price ? escapeHtml(formatCurrency(firstComponent.price)) : '—'}</td><td>${secondComponent.price ? escapeHtml(formatCurrency(secondComponent.price)) : '—'}</td></tr>`

  interfaceElements.comparisonResult.innerHTML = `
    <table class="comparison-table">
      <thead>
        <tr>
          <th>Параметр</th>
          <th>${escapeHtml(firstComponent.name)}</th>
          <th>${escapeHtml(secondComponent.name)}</th>
        </tr>
      </thead>
      <tbody>
        ${priceRow}
        ${rowsMarkup}
      </tbody>
    </table>
  `
}

function renderConfiguratorForm() {
  interfaceElements.configuratorForm.innerHTML = componentOrder
    .map((categoryKey) => {
      const records = applicationState.componentsByCategory[categoryKey] || []
      const selectedRecordId = applicationState.selectedConfiguration[categoryKey] || ''
      const optionsMarkup = ['<option value="">Не выбрано</option>']
      for (const record of records) {
        const recordPrice = record.price ? ` · ${formatCurrency(record.price)}` : ''
        optionsMarkup.push(`<option value="${escapeHtml(record.id)}">${escapeHtml(record.name + recordPrice)}</option>`)
      }
      return `
        <label>
          ${escapeHtml(categorySettings[categoryKey].title)}
          <select data-config-category="${escapeHtml(categoryKey)}">${optionsMarkup.join('')}</select>
        </label>
      `
    })
    .join('')

  for (const categoryKey of componentOrder) {
    const selectElement = interfaceElements.configuratorForm.querySelector(`[data-config-category="${categoryKey}"]`)
    if (selectElement) {
      selectElement.value = applicationState.selectedConfiguration[categoryKey] || ''
    }
  }
}

function validateConfiguration() {
  const selectedProcessor = getComponentById('cpu', applicationState.selectedConfiguration.cpu)
  const selectedMotherboard = getComponentById('motherboard', applicationState.selectedConfiguration.motherboard)

  if (!selectedProcessor || !selectedMotherboard) {
    return ''
  }

  const processorSocket = normalizeText(selectedProcessor.propertyRows.Сокет)
  const motherboardSocket = normalizeText(selectedMotherboard.propertyRows.Сокет)

  if (processorSocket && motherboardSocket && processorSocket !== motherboardSocket) {
    return `Сокет процессора (${processorSocket}) не совпадает с сокетом материнской платы (${motherboardSocket}).`
  }

  return ''
}

function renderConfigurationSummary() {
  const summaryRows = []
  let totalPrice = 0

  for (const categoryKey of componentOrder) {
    const selectedRecord = getComponentById(categoryKey, applicationState.selectedConfiguration[categoryKey])
    if (!selectedRecord) {
      continue
    }
    if (selectedRecord.price) {
      totalPrice += selectedRecord.price
    }
    const itemPrice = selectedRecord.price ? ` · ${formatCurrency(selectedRecord.price)}` : ''
    summaryRows.push(`<li><strong>${escapeHtml(categorySettings[categoryKey].title)}:</strong> ${escapeHtml(selectedRecord.name)}${escapeHtml(itemPrice)}</li>`)
  }

  interfaceElements.configurationList.innerHTML = summaryRows.join('') || '<li>Выберите комплектующие для формирования сборки.</li>'
  interfaceElements.configurationTotal.textContent = totalPrice > 0 ? `Общая стоимость: ${formatCurrency(totalPrice)}` : 'Общая стоимость: рассчитывается по доступным ценам'
  interfaceElements.configurationWarning.textContent = validateConfiguration()
}

function attachEventListeners() {
  interfaceElements.comparisonCategorySelect.addEventListener('change', (event) => {
    applicationState.selectedComparisonCategory = event.target.value
    renderComparisonComponentOptions()
  })

  interfaceElements.comparisonFirstSelect.addEventListener('change', renderComparisonResult)
  interfaceElements.comparisonSecondSelect.addEventListener('change', renderComparisonResult)

  interfaceElements.configuratorForm.addEventListener('change', (event) => {
    const changedSelect = event.target.closest('select[data-config-category]')
    if (!changedSelect) {
      return
    }
    const categoryKey = changedSelect.dataset.configCategory
    applicationState.selectedConfiguration[categoryKey] = changedSelect.value
    renderConfigurationSummary()
  })
}

async function bootstrapApplication() {
  for (const categoryKey of Object.keys(categorySettings)) {
    applicationState.componentsByCategory[categoryKey] = await loadCategoryComponents(categoryKey)
  }

  const firstProcessor = applicationState.componentsByCategory.cpu[0]
  const firstMotherboard = applicationState.componentsByCategory.motherboard[0]
  if (firstProcessor) {
    applicationState.selectedConfiguration.cpu = firstProcessor.id
  }
  if (firstMotherboard) {
    applicationState.selectedConfiguration.motherboard = firstMotherboard.id
  }

  renderComparisonSelectors()
  renderConfiguratorForm()
  renderConfigurationSummary()
  attachEventListeners()
}

bootstrapApplication()
