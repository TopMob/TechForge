const dataPaths = {
  cpu: ['BD/CPU/AMD.json', 'BD/CPU/INTEL.json'],
  gpu: ['BD/GPU/AMD.json', 'BD/GPU/INTEL.json', 'BD/GPU/NVIDIA.json', 'BD/GPU/OTHER.json'],
  motherboard: 'BD/MOTHERBOARDS/motherboards.json',
  ram: ['BD/RAM/ddr4.json', 'BD/RAM/ddr5.json'],
  powerSupply: 'BD/POWER_SUPPLIES/power_supplies.json'
}

const storageKeys = {
  currentSelection: 'techforge.currentSelection',
  savedConfigurations: 'techforge.savedConfigurations'
}

const applicationState = {
  cpuList: [],
  gpuList: [],
  motherboardList: [],
  ramList: [],
  powerSupplyList: [],
  selectedCpuName: '',
  selectedGpuName: '',
  selectedMotherboardName: '',
  selectedRamName: '',
  selectedPowerSupplyName: '',
  savedConfigurations: []
}

const userInterface = {
  cpuSelect: document.getElementById('cpu-select'),
  gpuSelect: document.getElementById('gpu-select'),
  motherboardSelect: document.getElementById('motherboard-select'),
  memorySelect: document.getElementById('memory-select'),
  powerSupplySelect: document.getElementById('power-supply-select'),
  storageSize: document.getElementById('storage-size'),
  compatibilityList: document.getElementById('compatibility-list'),
  powerEstimation: document.getElementById('power-estimation'),
  buildSummary: document.getElementById('build-summary'),
  comparisonCategory: document.getElementById('comparison-category'),
  comparisonSortField: document.getElementById('comparison-sort-field'),
  comparisonSortDirection: document.getElementById('comparison-sort-direction'),
  comparisonCompatibilityOnly: document.getElementById('comparison-compatibility-only'),
  comparisonFirst: document.getElementById('comparison-first'),
  comparisonSecond: document.getElementById('comparison-second'),
  comparisonTable: document.getElementById('comparison-table'),
  assemblySteps: document.getElementById('assembly-steps'),
  cpuCount: document.getElementById('cpu-count'),
  gpuCount: document.getElementById('gpu-count'),
  motherboardCount: document.getElementById('motherboard-count')
}

const tabButtons = [...document.querySelectorAll('.tab-button')]
const tabPanels = [...document.querySelectorAll('.tab-panel')]

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function toNumber(value, fallback = 0) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

function parseSocket(socketText) {
  return normalizeText(socketText).replace(/^socket\s*/i, '').replace(/\s+/g, '').toUpperCase()
}

function buildUniqueListByName(records) {
  const processedNames = new Set()
  return records.filter((record) => {
    const name = normalizeText(record?.name)
    if (!name) return false
    const uniqueKey = name.toLowerCase()
    if (processedNames.has(uniqueKey)) return false
    processedNames.add(uniqueKey)
    return true
  })
}

async function fetchJson(path) {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Не удалось загрузить ${path}`)
  }
  return response.json()
}

function parseCpuRecord(record) {
  return {
    name: normalizeText(record.name),
    manufacturer: normalizeText(record.manufacturer).toUpperCase() || 'UNKNOWN',
    coreCount: toNumber(record.core_count),
    boostClockGhz: toNumber(record.boost_clock_ghz),
    tdpWatts: toNumber(record.tdp_watts, 65),
    socket: inferCpuSocket(record),
    architecture: normalizeText(record.microarchitecture) || 'Не указано'
  }
}

function inferCpuSocket(record) {
  const manufacturer = normalizeText(record.manufacturer).toUpperCase()
  const architecture = normalizeText(record.microarchitecture).toLowerCase()
  if (manufacturer === 'INTEL') {
    if (architecture.includes('arrow lake') || architecture.includes('lunar lake')) return 'LGA1851'
    if (architecture.includes('raptor lake') || architecture.includes('alder lake')) return 'LGA1700'
    if (architecture.includes('comet lake')) return 'LGA1200'
    if (architecture.includes('coffee lake') || architecture.includes('kaby lake') || architecture.includes('skylake')) return 'LGA1151'
    return 'INTEL'
  }
  if (manufacturer === 'AMD') {
    if (architecture.includes('zen 5') || architecture.includes('zen 4')) return 'AM5'
    if (architecture.includes('zen')) return 'AM4'
    return 'AMD'
  }
  return 'UNKNOWN'
}

function parseGpuRecord(rawRecord, vendorLabel) {
  const name = normalizeText(rawRecord?.data?.name)
  return {
    name,
    manufacturer: vendorLabel,
    memoryGb: inferGpuMemory(name),
    tdpWatts: inferGpuPower(name)
  }
}

function inferGpuMemory(name) {
  const match = normalizeText(name).match(/(\d+)\s*GB/i)
  return match ? toNumber(match[1], 0) : 0
}

function inferGpuPower(name) {
  const modelName = normalizeText(name).toUpperCase()
  if (modelName.includes('4090') || modelName.includes('7900 XTX')) return 450
  if (modelName.includes('4080') || modelName.includes('7900 XT')) return 320
  if (modelName.includes('4070') || modelName.includes('7800 XT')) return 250
  if (modelName.includes('4060') || modelName.includes('7700 XT')) return 200
  if (modelName.includes('3060') || modelName.includes('6600')) return 170
  return 150
}

function parseRamRecord(record, generationLabel) {
  const modules = Array.isArray(record.modules) ? record.modules : [0, 0]
  const speed = Array.isArray(record.speed) ? record.speed : [generationLabel, 0]
  const moduleCount = toNumber(modules[0])
  const moduleSizeGb = toNumber(modules[1])
  return {
    name: normalizeText(record.name),
    generation: `DDR${generationLabel}`,
    totalCapacityGb: moduleCount * moduleSizeGb,
    speedMhz: toNumber(speed[1]),
    firstWordLatency: toNumber(record.first_word_latency),
    casLatency: toNumber(record.cas_latency),
    priceUsd: toNumber(record.price)
  }
}

function parsePowerSupplyRecord(record) {
  const modularLabel = normalizeText(record.is_modular)
  return {
    name: normalizeText(record.name),
    wattage: toNumber(record.wattage),
    efficiency: normalizeText(record.efficiency_rating).toUpperCase() || 'UNKNOWN',
    modular: modularLabel || 'No',
    modularRank: modularLabel === 'Full' ? 3 : modularLabel === 'Semi' ? 2 : 1,
    priceUsd: toNumber(record.price_last_usd || record.price_usd)
  }
}

async function loadDatasets() {
  const [amdCpuDataset, intelCpuDataset, amdGpuDataset, intelGpuDataset, nvidiaGpuDataset, otherGpuDataset, motherboardDataset, ddr4Dataset, ddr5Dataset, powerSupplyDataset] = await Promise.all([
    fetchJson(dataPaths.cpu[0]),
    fetchJson(dataPaths.cpu[1]),
    fetchJson(dataPaths.gpu[0]),
    fetchJson(dataPaths.gpu[1]),
    fetchJson(dataPaths.gpu[2]),
    fetchJson(dataPaths.gpu[3]),
    fetchJson(dataPaths.motherboard),
    fetchJson(dataPaths.ram[0]),
    fetchJson(dataPaths.ram[1]),
    fetchJson(dataPaths.powerSupply)
  ])

  applicationState.cpuList = buildUniqueListByName(amdCpuDataset.items.concat(intelCpuDataset.items).map(parseCpuRecord))
  applicationState.gpuList = buildUniqueListByName(
    amdGpuDataset.records.map((record) => parseGpuRecord(record, 'AMD'))
      .concat(intelGpuDataset.records.map((record) => parseGpuRecord(record, 'INTEL')))
      .concat(nvidiaGpuDataset.records.map((record) => parseGpuRecord(record, 'NVIDIA')))
      .concat(otherGpuDataset.records.map((record) => parseGpuRecord(record, 'OTHER')))
  )
  applicationState.motherboardList = buildUniqueListByName(motherboardDataset.map((record) => ({
    name: normalizeText(record.name),
    manufacturer: normalizeText(record.name).split(' ')[0] || 'Не указано',
    socket: parseSocket(record.socket),
    chipset: normalizeText(record.chipset) || 'Не указано'
  })).filter((record) => record.socket))

  applicationState.ramList = buildUniqueListByName(
    ddr4Dataset.map((record) => parseRamRecord(record, 4)).concat(ddr5Dataset.map((record) => parseRamRecord(record, 5))).filter((record) => record.totalCapacityGb > 0)
  )

  applicationState.powerSupplyList = buildUniqueListByName(powerSupplyDataset.items.map(parsePowerSupplyRecord).filter((record) => record.wattage > 0))
}

function fillSelect(selectElement, options, valueMapper, labelMapper) {
  const selectedValue = selectElement.value
  const optionMarkup = [`<option value="">Не выбрано</option>`].concat(options.map((option) => {
    const value = valueMapper(option)
    const label = labelMapper(option)
    return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`
  }))
  selectElement.innerHTML = optionMarkup.join('')
  if (options.some((option) => valueMapper(option) === selectedValue)) {
    selectElement.value = selectedValue
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function initializeSelectors() {
  fillSelect(userInterface.cpuSelect, applicationState.cpuList, (item) => item.name, (item) => `${item.name} · ${item.socket} · ${item.coreCount}C`)
  fillSelect(userInterface.gpuSelect, applicationState.gpuList, (item) => item.name, (item) => `${item.name} · ${item.manufacturer}`)
  fillSelect(userInterface.motherboardSelect, applicationState.motherboardList, (item) => item.name, (item) => `${item.name} · ${item.socket}`)
  fillSelect(userInterface.memorySelect, applicationState.ramList, (item) => item.name, (item) => `${item.name} · ${item.generation} · ${item.totalCapacityGb} ГБ`)
  fillSelect(userInterface.powerSupplySelect, applicationState.powerSupplyList, (item) => item.name, (item) => `${item.name} · ${item.wattage} Вт · ${item.efficiency}`)
}

function getCurrentSelection() {
  return {
    cpu: applicationState.cpuList.find((item) => item.name === applicationState.selectedCpuName) || null,
    gpu: applicationState.gpuList.find((item) => item.name === applicationState.selectedGpuName) || null,
    motherboard: applicationState.motherboardList.find((item) => item.name === applicationState.selectedMotherboardName) || null,
    ram: applicationState.ramList.find((item) => item.name === applicationState.selectedRamName) || null,
    powerSupply: applicationState.powerSupplyList.find((item) => item.name === applicationState.selectedPowerSupplyName) || null
  }
}

function calculatePower(selection, storageGb) {
  if (!selection.cpu || !selection.gpu || !selection.ram) return 0
  const ramPower = Math.ceil(selection.ram.totalCapacityGb * 0.45)
  const storagePower = Math.ceil((storageGb / 1000) * 8)
  return selection.cpu.tdpWatts + selection.gpu.tdpWatts + ramPower + storagePower + 60
}

function renderCompatibility(selection, recommendedPower) {
  const checks = [
    {
      label: 'CPU ↔ Материнская плата',
      status: selection.cpu && selection.motherboard && selection.cpu.socket === selection.motherboard.socket,
      good: 'Сокеты совпадают',
      bad: 'Выберите плату с подходящим сокетом'
    },
    {
      label: 'GPU ↔ Блок питания',
      status: selection.powerSupply && selection.powerSupply.wattage >= recommendedPower,
      good: 'Запас мощности достаточный',
      bad: 'Нужен блок питания мощнее'
    },
    {
      label: 'RAM ↔ Платформа',
      status: selection.ram && selection.cpu && ((selection.ram.generation === 'DDR5' && selection.cpu.socket !== 'AM4') || selection.ram.generation === 'DDR4'),
      good: 'Поколение памяти подходит',
      bad: 'Проверьте поддержку DDR у платформы'
    }
  ]

  userInterface.compatibilityList.innerHTML = checks.map((check) => `<li class="${check.status ? 'good' : 'bad'}"><strong>${escapeHtml(check.label)}</strong><span>${escapeHtml(check.status ? check.good : check.bad)}</span></li>`).join('')
}

function renderBuildSummary(selection, recommendedPower) {
  const rows = [
    ['CPU', selection.cpu?.name || 'Не выбран'],
    ['GPU', selection.gpu?.name || 'Не выбрана'],
    ['Материнская плата', selection.motherboard?.name || 'Не выбрана'],
    ['RAM', selection.ram?.name || 'Не выбрана'],
    ['Блок питания', selection.powerSupply?.name || 'Не выбран'],
    ['Рекомендованная мощность', `${recommendedPower} Вт`]
  ]
  userInterface.buildSummary.innerHTML = rows.map((row) => `<div class="summary-row"><span>${escapeHtml(row[0])}</span><strong>${escapeHtml(row[1])}</strong></div>`).join('')
}

function updateCounters() {
  userInterface.cpuCount.textContent = String(applicationState.cpuList.length)
  userInterface.gpuCount.textContent = String(applicationState.gpuList.length)
  userInterface.motherboardCount.textContent = String(applicationState.motherboardList.length)
}

function getDatasetByCategory(category) {
  if (category === 'gpu') return applicationState.gpuList
  if (category === 'motherboard') return applicationState.motherboardList
  if (category === 'ram') return applicationState.ramList
  if (category === 'psu') return applicationState.powerSupplyList
  return applicationState.cpuList
}

function buildSortFields(category) {
  if (category === 'gpu') return [{ value: 'tdpWatts', label: 'Энергопотребление' }, { value: 'memoryGb', label: 'Объем памяти' }, { value: 'manufacturer', label: 'Производитель' }]
  if (category === 'motherboard') return [{ value: 'socket', label: 'Сокет' }, { value: 'chipset', label: 'Чипсет' }, { value: 'manufacturer', label: 'Бренд' }]
  if (category === 'ram') return [{ value: 'generation', label: 'Поколение' }, { value: 'totalCapacityGb', label: 'Объем' }, { value: 'speedMhz', label: 'Частота' }]
  if (category === 'psu') return [{ value: 'wattage', label: 'Мощность' }, { value: 'efficiency', label: 'Сертификация' }, { value: 'modularRank', label: 'Модульность' }]
  return [{ value: 'coreCount', label: 'Ядра' }, { value: 'boostClockGhz', label: 'Boost Ghz' }, { value: 'socket', label: 'Сокет' }]
}

function initializeComparisonControls() {
  const category = userInterface.comparisonCategory.value
  const fields = buildSortFields(category)
  fillSelect(userInterface.comparisonSortField, fields, (field) => field.value, (field) => field.label)
  fillSelect(userInterface.comparisonFirst, getDatasetByCategory(category), (item) => item.name, (item) => item.name)
  fillSelect(userInterface.comparisonSecond, getDatasetByCategory(category), (item) => item.name, (item) => item.name)
}

function sortDataset(records, fieldName, direction) {
  const modifier = direction === 'asc' ? 1 : -1
  return [...records].sort((first, second) => {
    const leftValue = first[fieldName]
    const rightValue = second[fieldName]
    if (typeof leftValue === 'number' || typeof rightValue === 'number') {
      return (toNumber(leftValue) - toNumber(rightValue)) * modifier
    }
    return String(leftValue).localeCompare(String(rightValue), 'ru') * modifier
  })
}

function filterComparisonByCompatibility(records, category, selection) {
  if (!userInterface.comparisonCompatibilityOnly.checked) return records
  if (category === 'cpu' && selection.motherboard) return records.filter((item) => item.socket === selection.motherboard.socket)
  if (category === 'motherboard' && selection.cpu) return records.filter((item) => item.socket === selection.cpu.socket)
  if (category === 'gpu' && selection.powerSupply) return records.filter((item) => item.tdpWatts + 120 <= selection.powerSupply.wattage)
  return records
}

function renderComparisonTable() {
  const category = userInterface.comparisonCategory.value
  const sortField = userInterface.comparisonSortField.value
  const sortDirection = userInterface.comparisonSortDirection.value
  const selection = getCurrentSelection()
  const initialRecords = getDatasetByCategory(category)
  const filteredRecords = filterComparisonByCompatibility(initialRecords, category, selection)
  const sortedRecords = sortDataset(filteredRecords, sortField, sortDirection)

  fillSelect(userInterface.comparisonFirst, sortedRecords, (item) => item.name, (item) => item.name)
  fillSelect(userInterface.comparisonSecond, sortedRecords, (item) => item.name, (item) => item.name)

  const firstItem = sortedRecords.find((item) => item.name === userInterface.comparisonFirst.value) || sortedRecords[0] || null
  const secondItem = sortedRecords.find((item) => item.name === userInterface.comparisonSecond.value) || sortedRecords[1] || null

  if (!firstItem || !secondItem) {
    userInterface.comparisonTable.innerHTML = '<p class="empty-state">Недостаточно данных для сравнения.</p>'
    return
  }

  const keys = Object.keys(firstItem).filter((key) => key !== 'name')
  const rows = keys.map((key) => {
    const firstValue = firstItem[key]
    const secondValue = secondItem[key]
    const winnerClass = toNumber(firstValue, NaN) > toNumber(secondValue, NaN) ? 'left-better' : toNumber(firstValue, NaN) < toNumber(secondValue, NaN) ? 'right-better' : ''
    return `<tr class="${winnerClass}"><td>${escapeHtml(key)}</td><td>${escapeHtml(firstValue)}</td><td>${escapeHtml(secondValue)}</td></tr>`
  }).join('')

  userInterface.comparisonTable.innerHTML = `<table><thead><tr><th>Параметр</th><th>${escapeHtml(firstItem.name)}</th><th>${escapeHtml(secondItem.name)}</th></tr></thead><tbody>${rows}</tbody></table>`
}

function renderAssemblySteps(selection) {
  const steps = [
    `Подготовьте корпус, установите стойки под материнскую плату и проверьте формат ${selection.motherboard?.name || 'выбранной платы'}.`,
    `Установите процессор ${selection.cpu?.name || ''} в сокет ${selection.cpu?.socket || ''} без лишнего усилия.`,
    `Нанесите термоинтерфейс и установите систему охлаждения.`,
    `Установите модули памяти ${selection.ram?.name || ''} в рекомендованные слоты.`,
    `Закрепите материнскую плату, подключите питание CPU и ATX 24-pin.`,
    `Установите видеокарту ${selection.gpu?.name || ''} и подключите кабели питания PCIe.`,
    `Установите накопители, подключите SATA или M.2, после чего организуйте кабель-менеджмент.`,
    `Проведите первый запуск, обновите BIOS и включите XMP/EXPO профиль памяти.`
  ]
  userInterface.assemblySteps.innerHTML = steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')
}

function saveCurrentSelection() {
  const selection = {
    selectedCpuName: applicationState.selectedCpuName,
    selectedGpuName: applicationState.selectedGpuName,
    selectedMotherboardName: applicationState.selectedMotherboardName,
    selectedRamName: applicationState.selectedRamName,
    selectedPowerSupplyName: applicationState.selectedPowerSupplyName,
    storageSize: userInterface.storageSize.value
  }
  localStorage.setItem(storageKeys.currentSelection, JSON.stringify(selection))
}

function restoreCurrentSelection() {
  const rawSelection = localStorage.getItem(storageKeys.currentSelection)
  if (!rawSelection) return
  const selection = JSON.parse(rawSelection)
  applicationState.selectedCpuName = normalizeText(selection.selectedCpuName)
  applicationState.selectedGpuName = normalizeText(selection.selectedGpuName)
  applicationState.selectedMotherboardName = normalizeText(selection.selectedMotherboardName)
  applicationState.selectedRamName = normalizeText(selection.selectedRamName)
  applicationState.selectedPowerSupplyName = normalizeText(selection.selectedPowerSupplyName)
  userInterface.storageSize.value = toNumber(selection.storageSize, 1000)
}

function createConfigurationPanel() {
  const configuratorPanel = document.querySelector('#configurator .grid')
  const container = document.createElement('article')
  container.className = 'panel saved-configurations'
  container.innerHTML = '<h2>Сохраненные конфигурации</h2><div class="config-actions"><button id="save-build-button" type="button">Сохранить текущую</button><button id="export-builds-button" type="button">Экспорт JSON</button><label class="import-button" for="import-builds-input">Импорт JSON</label><input id="import-builds-input" type="file" accept="application/json"></div><div id="saved-builds-list" class="saved-builds-list"></div>'
  configuratorPanel.append(container)
  return {
    saveButton: container.querySelector('#save-build-button'),
    exportButton: container.querySelector('#export-builds-button'),
    importInput: container.querySelector('#import-builds-input'),
    listElement: container.querySelector('#saved-builds-list')
  }
}

function persistSavedConfigurations() {
  localStorage.setItem(storageKeys.savedConfigurations, JSON.stringify(applicationState.savedConfigurations))
}

function restoreSavedConfigurations() {
  const rawConfigurations = localStorage.getItem(storageKeys.savedConfigurations)
  if (!rawConfigurations) return
  applicationState.savedConfigurations = JSON.parse(rawConfigurations)
}

function saveConfigurationFromCurrentSelection() {
  const now = new Date().toISOString()
  const configuration = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: `Сборка ${new Date().toLocaleString('ru-RU')}`,
    createdAt: now,
    selectedCpuName: applicationState.selectedCpuName,
    selectedGpuName: applicationState.selectedGpuName,
    selectedMotherboardName: applicationState.selectedMotherboardName,
    selectedRamName: applicationState.selectedRamName,
    selectedPowerSupplyName: applicationState.selectedPowerSupplyName,
    storageSize: toNumber(userInterface.storageSize.value, 1000)
  }
  applicationState.savedConfigurations = [configuration].concat(applicationState.savedConfigurations)
  persistSavedConfigurations()
}

function applyConfiguration(configuration) {
  applicationState.selectedCpuName = normalizeText(configuration.selectedCpuName)
  applicationState.selectedGpuName = normalizeText(configuration.selectedGpuName)
  applicationState.selectedMotherboardName = normalizeText(configuration.selectedMotherboardName)
  applicationState.selectedRamName = normalizeText(configuration.selectedRamName)
  applicationState.selectedPowerSupplyName = normalizeText(configuration.selectedPowerSupplyName)
  userInterface.storageSize.value = toNumber(configuration.storageSize, 1000)
  syncSelectedValuesToUi()
  refreshDashboard()
}

function deleteConfiguration(configurationId) {
  applicationState.savedConfigurations = applicationState.savedConfigurations.filter((configuration) => configuration.id !== configurationId)
  persistSavedConfigurations()
}

function exportSavedConfigurations() {
  const fileContent = JSON.stringify(applicationState.savedConfigurations, null, 2)
  const dataBlob = new Blob([fileContent], { type: 'application/json' })
  const downloadUrl = URL.createObjectURL(dataBlob)
  const anchor = document.createElement('a')
  anchor.href = downloadUrl
  anchor.download = `techforge-configurations-${Date.now()}.json`
  anchor.click()
  URL.revokeObjectURL(downloadUrl)
}

async function importSavedConfigurations(file) {
  const text = await file.text()
  const configurations = JSON.parse(text)
  if (!Array.isArray(configurations)) return
  applicationState.savedConfigurations = buildUniqueListByName(configurations.map((configuration) => ({ ...configuration, name: configuration.id || '' }))).map((entry) => {
    const { name, ...configuration } = entry
    return configuration
  })
  persistSavedConfigurations()
}

function renderSavedConfigurations(savedConfigurationsUi) {
  if (!applicationState.savedConfigurations.length) {
    savedConfigurationsUi.listElement.innerHTML = '<p class="empty-state">Пока нет сохранённых конфигураций.</p>'
    return
  }

  savedConfigurationsUi.listElement.innerHTML = applicationState.savedConfigurations.map((configuration) => {
    const title = normalizeText(configuration.title) || 'Конфигурация'
    return `<article class="saved-build-card"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(new Date(configuration.createdAt).toLocaleString('ru-RU'))}</p><div><button data-action="apply" data-id="${escapeHtml(configuration.id)}">Применить</button><button data-action="remove" data-id="${escapeHtml(configuration.id)}">Удалить</button></div></article>`
  }).join('')
}

function syncSelectedValuesToUi() {
  userInterface.cpuSelect.value = applicationState.selectedCpuName
  userInterface.gpuSelect.value = applicationState.selectedGpuName
  userInterface.motherboardSelect.value = applicationState.selectedMotherboardName
  userInterface.memorySelect.value = applicationState.selectedRamName
  userInterface.powerSupplySelect.value = applicationState.selectedPowerSupplyName
}

function refreshDashboard() {
  const selection = getCurrentSelection()
  const storageSizeGb = toNumber(userInterface.storageSize.value, 1000)
  const estimatedPower = calculatePower(selection, storageSizeGb)
  const recommendedPower = Math.ceil(estimatedPower * 1.35)
  userInterface.powerEstimation.textContent = `${estimatedPower} Вт · рекомендовано ${recommendedPower} Вт`
  renderCompatibility(selection, recommendedPower)
  renderBuildSummary(selection, recommendedPower)
  renderAssemblySteps(selection)
  renderComparisonTable()
  saveCurrentSelection()
}

function openTab(tabName) {
  tabButtons.forEach((button) => button.classList.toggle('active', button.dataset.tab === tabName))
  tabPanels.forEach((panel) => panel.classList.toggle('active', panel.id === tabName))
}

function bindEvents(savedConfigurationsUi) {
  userInterface.cpuSelect.addEventListener('change', (event) => {
    applicationState.selectedCpuName = normalizeText(event.target.value)
    refreshDashboard()
  })
  userInterface.gpuSelect.addEventListener('change', (event) => {
    applicationState.selectedGpuName = normalizeText(event.target.value)
    refreshDashboard()
  })
  userInterface.motherboardSelect.addEventListener('change', (event) => {
    applicationState.selectedMotherboardName = normalizeText(event.target.value)
    refreshDashboard()
  })
  userInterface.memorySelect.addEventListener('change', (event) => {
    applicationState.selectedRamName = normalizeText(event.target.value)
    refreshDashboard()
  })
  userInterface.powerSupplySelect.addEventListener('change', (event) => {
    applicationState.selectedPowerSupplyName = normalizeText(event.target.value)
    refreshDashboard()
  })
  userInterface.storageSize.addEventListener('input', refreshDashboard)

  userInterface.comparisonCategory.addEventListener('change', () => {
    initializeComparisonControls()
    renderComparisonTable()
  })
  userInterface.comparisonSortField.addEventListener('change', renderComparisonTable)
  userInterface.comparisonSortDirection.addEventListener('change', renderComparisonTable)
  userInterface.comparisonCompatibilityOnly.addEventListener('change', renderComparisonTable)
  userInterface.comparisonFirst.addEventListener('change', renderComparisonTable)
  userInterface.comparisonSecond.addEventListener('change', renderComparisonTable)

  tabButtons.forEach((button) => button.addEventListener('click', () => openTab(button.dataset.tab)))

  savedConfigurationsUi.saveButton.addEventListener('click', () => {
    saveConfigurationFromCurrentSelection()
    renderSavedConfigurations(savedConfigurationsUi)
  })
  savedConfigurationsUi.exportButton.addEventListener('click', exportSavedConfigurations)
  savedConfigurationsUi.importInput.addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0]
    if (!file) return
    await importSavedConfigurations(file)
    renderSavedConfigurations(savedConfigurationsUi)
    event.target.value = ''
  })
  savedConfigurationsUi.listElement.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]')
    if (!button) return
    const action = button.getAttribute('data-action')
    const configurationId = button.getAttribute('data-id')
    const configuration = applicationState.savedConfigurations.find((entry) => entry.id === configurationId)
    if (action === 'apply' && configuration) {
      applyConfiguration(configuration)
      return
    }
    if (action === 'remove') {
      deleteConfiguration(configurationId)
      renderSavedConfigurations(savedConfigurationsUi)
    }
  })
}

async function initializeApplication() {
  try {
    await loadDatasets()
    restoreSavedConfigurations()
    initializeSelectors()
    restoreCurrentSelection()
    syncSelectedValuesToUi()
    updateCounters()
    initializeComparisonControls()
    const savedConfigurationsUi = createConfigurationPanel()
    bindEvents(savedConfigurationsUi)
    renderSavedConfigurations(savedConfigurationsUi)
    refreshDashboard()
  } catch (error) {
    document.body.innerHTML = `<main class="page"><article class="panel"><h2>Ошибка загрузки данных</h2><p>${escapeHtml(error.message)}</p></article></main>`
  }
}

initializeApplication()
