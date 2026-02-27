import { saveComponent, watchFirebaseConnection, loadComponentsFromFirebase } from './firebase.js'
import { renderDashboardMetrics } from './dashboard-metrics.js'
import { saveBuild, loadBuild, deleteBuild, getSlotNames, exportBuildPayload, importBuildPayload } from './build-storage.js'
import { evaluateCompatibility } from './compatibility.js'
import { buildRecommendations, buildComparisonInsights } from './recommendations.js'
import { firebaseCategoryOptions } from './component-schema.js'
import { renderFirebaseCategoryFields, collectFirebasePayload } from './firebase-form.js'


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
  firebaseStatus: document.getElementById('firebase-status'),
  firebaseConnectionInfo: document.getElementById('firebase-connection-info'),
  firebaseRequiredHint: document.getElementById('firebase-required-hint'),
  dashboardMetrics: document.getElementById('dashboard-metrics'),
  comparisonInsights: document.getElementById('comparison-insights'),
  budgetInput: document.getElementById('budget-input'),
  budgetStatus: document.getElementById('budget-status'),
  buildSlotSelect: document.getElementById('build-slot-select'),
  saveBuildButton: document.getElementById('save-build'),
  loadBuildButton: document.getElementById('load-build'),
  deleteBuildButton: document.getElementById('delete-build'),
  exportBuildButton: document.getElementById('export-build'),
  importBuildButton: document.getElementById('import-build'),
  buildStatus: document.getElementById('build-status'),
  recommendationsList: document.getElementById('recommendations-list')
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
  configuratorSearchByCategory: {},
  budgetValue: ''
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

function convertFirebaseRecord(categoryKey, sourceRecord) {
  const componentName = normalizeText(sourceRecord?.name)
  if (!componentName) return null
  return {
    id: createIdentifier(categoryKey, componentName),
    name: componentName,
    categoryKey,
    price: parseNumber(sourceRecord?.price),
    specs: sourceRecord?.specs || {}
  }
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

  try {
    const firebaseRecords = await loadComponentsFromFirebase(categoryKey)
    for (const firebaseRecord of firebaseRecords) {
      const convertedFirebaseRecord = convertFirebaseRecord(categoryKey, firebaseRecord)
      if (convertedFirebaseRecord) allRecords.push(convertedFirebaseRecord)
    }
  } catch {
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
  renderComparisonInsights(null, null)
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
    renderComparisonInsights(null, null)
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
  renderComparisonInsights(firstRecord, secondRecord)
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
  const compatibility = evaluateCompatibility({
    getRecordById,
    selectedConfigurationByCategory: applicationState.selectedConfigurationByCategory
  })
  interfaceElements.configurationWarning.textContent = compatibility.issues[0] || ''
  renderBudgetState(totalPrice)
  renderRecommendations(getSelectedRecords(), totalPrice, compatibility)
  updateDashboardMetrics()
}


function updateDashboardMetrics() {
  const categories = Object.keys(categorySettings)
  const categorySettingsWithCount = {}
  for (const categoryKey of categories) {
    categorySettingsWithCount[categoryKey] = {
      ...categorySettings[categoryKey],
      count: applicationState.componentsByCategory[categoryKey]?.length || 0
    }
  }

  renderDashboardMetrics({
    container: interfaceElements.dashboardMetrics,
    categories,
    categorySettings: categorySettingsWithCount,
    selectedConfigurationByCategory: applicationState.selectedConfigurationByCategory,
    getRecordById,
    formatPrice,
    configuratorCategoryOrder
  })
}


function renderComparisonInsights(firstRecord, secondRecord) {
  if (!interfaceElements.comparisonInsights) return
  const insights = buildComparisonInsights(firstRecord, secondRecord)
  if (insights.length === 0) {
    interfaceElements.comparisonInsights.innerHTML = '<p class="comparison-count">Инсайты появятся после выбора двух моделей с заполненными данными.</p>'
    return
  }
  interfaceElements.comparisonInsights.innerHTML = `<ul>${insights.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
}

function getSelectedRecords() {
  return configuratorCategoryOrder
    .map((categoryKey) => getRecordById(categoryKey, applicationState.selectedConfigurationByCategory[categoryKey]))
    .filter(Boolean)
}

function getTotalPriceForSelectedRecords(records) {
  return records.reduce((sum, record) => sum + (record.price || 0), 0)
}

function renderBudgetState(totalPrice) {
  const budgetValue = parseNumber(applicationState.budgetValue)
  if (!budgetValue) {
    interfaceElements.budgetStatus.textContent = 'Укажите бюджет, чтобы увидеть отклонение.'
    interfaceElements.budgetStatus.className = 'comparison-count'
    return
  }
  const difference = totalPrice - budgetValue
  if (difference > 0) {
    interfaceElements.budgetStatus.textContent = `Перебор бюджета: +${Math.round(difference)} $`
    interfaceElements.budgetStatus.className = 'comparison-count bad-state'
    return
  }
  interfaceElements.budgetStatus.textContent = `Запас бюджета: ${Math.round(Math.abs(difference))} $`
  interfaceElements.budgetStatus.className = 'comparison-count good-state'
}

function renderRecommendations(records, totalPrice, compatibility) {
  const budgetValue = parseNumber(applicationState.budgetValue)
  const recommendations = buildRecommendations({
    selectedRecords: records,
    totalPrice,
    budgetValue,
    compatibility
  })
  interfaceElements.recommendationsList.innerHTML = recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
}

function populateBuildSlots() {
  const slotNames = getSlotNames()
  interfaceElements.buildSlotSelect.innerHTML = slotNames.map((slotName) => `<option value="${escapeHtml(slotName)}">${escapeHtml(slotName)}</option>`).join('')
}

function handleSaveBuild() {
  const slotName = normalizeText(interfaceElements.buildSlotSelect.value)
  if (!slotName) return
  saveBuild(slotName, applicationState.selectedConfigurationByCategory, applicationState.budgetValue)
  populateBuildSlots()
  interfaceElements.buildStatus.textContent = `Сборка сохранена в слот: ${slotName}`
}

function handleLoadBuild() {
  const slotName = normalizeText(interfaceElements.buildSlotSelect.value)
  const payload = loadBuild(slotName)
  if (!payload) {
    interfaceElements.buildStatus.textContent = 'В выбранном слоте нет сохранения.'
    return
  }
  applicationState.selectedConfigurationByCategory = payload.selectedConfigurationByCategory || {}
  applicationState.budgetValue = payload.budgetValue || ''
  interfaceElements.budgetInput.value = applicationState.budgetValue
  renderConfigurator()
  renderConfigurationSummary()
  interfaceElements.buildStatus.textContent = `Сборка загружена: ${slotName}`
}

function handleDeleteBuild() {
  const slotName = normalizeText(interfaceElements.buildSlotSelect.value)
  const deleted = deleteBuild(slotName)
  populateBuildSlots()
  interfaceElements.buildStatus.textContent = deleted ? `Сборка удалена: ${slotName}` : 'Удалять нечего: слот пуст.'
}

function handleExportBuild() {
  const payload = {
    selectedConfigurationByCategory: applicationState.selectedConfigurationByCategory,
    budgetValue: applicationState.budgetValue
  }
  const exported = exportBuildPayload(payload)
  navigator.clipboard.writeText(exported)
    .then(() => {
      interfaceElements.buildStatus.textContent = 'JSON сборки скопирован в буфер обмена.'
    })
    .catch(() => {
      interfaceElements.buildStatus.textContent = exported
    })
}

function handleImportBuild() {
  const raw = prompt('Вставьте JSON сборки')
  if (!raw) return
  try {
    const imported = importBuildPayload(raw)
    applicationState.selectedConfigurationByCategory = imported.selectedConfigurationByCategory || {}
    applicationState.budgetValue = imported.budgetValue || ''
    interfaceElements.budgetInput.value = applicationState.budgetValue
    renderConfigurator()
    renderConfigurationSummary()
    interfaceElements.buildStatus.textContent = 'Сборка импортирована из JSON.'
  } catch (error) {
    interfaceElements.buildStatus.textContent = `Ошибка импорта: ${error.message}`
  }
}

function renderFirebaseFormByCategory() {
  const categoryKey = normalizeText(interfaceElements.firebaseForm.elements.firebaseCategory.value)
  renderFirebaseCategoryFields(interfaceElements.firebaseSpecsContainer, interfaceElements.firebaseRequiredHint, categoryKey)
}

function prefillVendorAndModelFromName() {
  const value = normalizeText(interfaceElements.firebaseForm.elements.firebaseComponentName.value)
  if (!value) return
  const parts = value.split(' ')
  if (parts.length < 2) return

  const vendorField = interfaceElements.firebaseForm.querySelector('[data-field-key="vendor"]')
  const modelField = interfaceElements.firebaseForm.querySelector('[data-field-key="model"]')
  if (vendorField && !normalizeText(vendorField.value)) vendorField.value = parts[0]
  if (modelField && !normalizeText(modelField.value)) modelField.value = parts.slice(1).join(' ')
}

function mergeComponentIntoState(categoryKey, payload) {
  const converted = convertFirebaseRecord(categoryKey, payload)
  if (!converted) return
  const current = applicationState.componentsByCategory[categoryKey] || []
  const merged = current.filter((record) => record.id !== converted.id)
  merged.push(converted)
  merged.sort((leftRecord, rightRecord) => leftRecord.name.localeCompare(rightRecord.name, 'ru'))
  applicationState.componentsByCategory[categoryKey] = merged
}

function refreshAfterComponentSave() {
  renderComparisonCategoryTabs()
  renderComparisonSelectors()
  renderConfigurator()
  renderConfigurationSummary()
}

function resetFirebaseDynamicFields() {
  interfaceElements.firebaseForm.elements.firebaseComponentName.value = ''
  renderFirebaseFormByCategory()
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
  const { errors, payload } = collectFirebasePayload(interfaceElements.firebaseForm, category)

  if (errors.length > 0) {
    interfaceElements.firebaseStatus.textContent = errors[0]
    return
  }

  if (!payload?.name || !payload?.price) {
    interfaceElements.firebaseStatus.textContent = 'Заполните название, модель и цену.'
    return
  }

  try {
    await saveComponent(category, payload)
    mergeComponentIntoState(category, payload)
    refreshAfterComponentSave()
    interfaceElements.firebaseStatus.textContent = `Компонент сохранён: PC/${category}/components/${payload.name}`
    resetFirebaseDynamicFields()
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

  interfaceElements.firebaseForm.elements.firebaseCategory.addEventListener('change', () => renderFirebaseFormByCategory())
  interfaceElements.firebaseForm.elements.firebaseComponentName.addEventListener('input', () => prefillVendorAndModelFromName())
  interfaceElements.firebaseForm.addEventListener('submit', saveComponentToFirebase)
  interfaceElements.budgetInput.addEventListener('input', () => {
    applicationState.budgetValue = normalizeText(interfaceElements.budgetInput.value)
    renderConfigurationSummary()
  })

  interfaceElements.saveBuildButton.addEventListener('click', handleSaveBuild)
  interfaceElements.loadBuildButton.addEventListener('click', handleLoadBuild)
  interfaceElements.deleteBuildButton.addEventListener('click', handleDeleteBuild)
  interfaceElements.exportBuildButton.addEventListener('click', handleExportBuild)
  interfaceElements.importBuildButton.addEventListener('click', handleImportBuild)
}

async function initializeApplication() {
  interfaceElements.firebaseForm.elements.firebaseCategory.innerHTML = firebaseCategoryOptions
    .map((option) => `<option value="${escapeHtml(option.key)}">${escapeHtml(option.label)}</option>`)
    .join('')
  renderFirebaseFormByCategory()

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
  populateBuildSlots()
  interfaceElements.budgetInput.value = applicationState.budgetValue
  renderConfigurationSummary()
  updateDashboardMetrics()
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
