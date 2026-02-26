const applicationState = {
  processors: [],
  graphicsCards: [],
  motherboards: [],
  memoryModules: [],
  powerSupplies: [],
  selectedProcessorName: '',
  selectedGraphicsCardName: '',
  selectedMotherboardName: '',
  selectedMemoryName: '',
  selectedPowerSupplyName: ''
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

function parseCommaSeparatedValues(rawText) {
  const lines = rawText.split(/\r?\n/).filter((line) => line.trim().length > 0)
  const headers = splitCommaSeparatedLine(lines[0]).map((header) => header.trim())
  const records = []
  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const values = splitCommaSeparatedLine(lines[lineIndex])
    const record = {}
    for (let headerIndex = 0; headerIndex < headers.length; headerIndex += 1) {
      const header = headers[headerIndex]
      record[header] = (values[headerIndex] || '').trim()
    }
    records.push(record)
  }
  return records
}

function splitCommaSeparatedLine(line) {
  const columns = []
  let currentValue = ''
  let insideQuotes = false
  for (let index = 0; index < line.length; index += 1) {
    const symbol = line[index]
    if (symbol === '"') {
      insideQuotes = !insideQuotes
    } else if (symbol === ',' && !insideQuotes) {
      columns.push(currentValue.replace(/^"|"$/g, ''))
      currentValue = ''
    } else {
      currentValue += symbol
    }
  }
  columns.push(currentValue.replace(/^"|"$/g, ''))
  return columns
}

function normalizeComponentName(componentName) {
  return String(componentName || '').replace(/\s+/g, ' ').trim()
}

function parseSocket(socketText) {
  return normalizeComponentName(socketText).replace('Socket', '').replace(/\s+/g, '').toUpperCase()
}

function toNumber(value, fallback = 0) {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

function parseGpuMemoryGigabytes(memoryText) {
  const match = String(memoryText || '').match(/(\d+(?:\.\d+)?)\s*GB/i)
  return match ? toNumber(match[1]) : 0
}

function parseProcessorRecord(processor) {
  const modelName = normalizeComponentName(processor.name)
  const manufacturer = normalizeComponentName(processor.manufacturer) || inferProcessorManufacturer(modelName)
  const microarchitecture = normalizeComponentName(processor.microarchitecture)
  const socket = resolveProcessorSocket(manufacturer, modelName, microarchitecture)
  return {
    name: modelName,
    manufacturer,
    socket,
    cores: toNumber(processor.core_count, 0),
    boostClockGigahertz: toNumber(processor.boost_clock_ghz, 0),
    tdpWatts: toNumber(processor.tdp_watts, 65),
    microarchitecture: microarchitecture || 'Не указано'
  }
}

function inferProcessorManufacturer(modelName) {
  const normalizedName = modelName.toLowerCase()
  if (normalizedName.startsWith('amd')) {
    return 'AMD'
  }
  if (normalizedName.startsWith('intel')) {
    return 'Intel'
  }
  return 'Не указано'
}

function resolveProcessorSocket(manufacturer, modelName, microarchitecture) {
  const architecture = microarchitecture.toLowerCase()
  const normalizedManufacturer = manufacturer.toLowerCase()
  if (normalizedManufacturer === 'intel') {
    if (architecture.includes('arrow lake') || architecture.includes('lunar lake')) return 'LGA1851'
    if (architecture.includes('raptor lake') || architecture.includes('alder lake')) return 'LGA1700'
    if (architecture.includes('comet lake')) return 'LGA1200'
    if (architecture.includes('coffee lake') || architecture.includes('kaby lake') || architecture.includes('skylake')) return 'LGA1151'
    if (architecture.includes('haswell') || architecture.includes('broadwell')) return 'LGA1150'
    if (architecture.includes('ivy bridge') || architecture.includes('sandy bridge')) return 'LGA1155'
    if (architecture.includes('westmere') || architecture.includes('nehalem')) return 'LGA1366'
    return ''
  }
  if (normalizedManufacturer === 'amd') {
    const normalizedName = modelName.toLowerCase()
    if (normalizedName.includes('threadripper 7') || normalizedName.includes('threadripper pro 7')) return 'STR5'
    if (normalizedName.includes('threadripper')) return 'STRX4'
    if (architecture.includes('zen 5') || architecture.includes('zen 4')) return 'AM5'
    if (architecture.includes('zen 3') || architecture.includes('zen 2') || architecture.includes('zen+') || architecture.includes('zen')) return 'AM4'
    if (architecture.includes('excavator') || architecture.includes('steamroller') || architecture.includes('piledriver') || architecture.includes('bulldozer')) return 'AM3+'
    return ''
  }
  return ''
}

function parseMemoryRecord(record, generation) {
  const moduleInfo = Array.isArray(record.modules) ? record.modules : [0, 0]
  const speedInfo = Array.isArray(record.speed) ? record.speed : [generation, 0]
  const moduleCount = toNumber(moduleInfo[0], 0)
  const moduleSizeGigabytes = toNumber(moduleInfo[1], 0)
  const totalCapacityGigabytes = moduleCount * moduleSizeGigabytes
  return {
    name: normalizeComponentName(record.name),
    generation: `DDR${generation}`,
    speedMegahertz: toNumber(speedInfo[1], 0),
    moduleCount,
    moduleSizeGigabytes,
    totalCapacityGigabytes,
    casLatency: toNumber(record.cas_latency, 0),
    firstWordLatency: toNumber(record.first_word_latency, 0),
    priceUsd: toNumber(record.price, 0)
  }
}

function parsePowerSupplyRecord(record) {
  const efficiencyRating = normalizeComponentName(record.efficiency_rating).toUpperCase() || 'UNKNOWN'
  const modularLabel = String(record.is_modular)
  const modularRank = modularLabel === 'Full' ? 3 : modularLabel === 'Semi' ? 2 : 1
  return {
    name: normalizeComponentName(record.name),
    wattage: toNumber(record.wattage, 0),
    efficiencyRating,
    formFactor: normalizeComponentName(record.form_factor) || 'Не указано',
    modular: modularLabel,
    modularRank,
    priceUsd: toNumber(record.price_last_usd || record.price_usd, 0)
  }
}

function parseGpuVendorRecord(rawRecord, vendorName) {
  const cardName = normalizeComponentName(rawRecord?.data?.name)
  if (!cardName) {
    return null
  }
  return {
    name: cardName,
    vendor: vendorName.toUpperCase(),
    architecture: 'Не указано',
    memory: 'Не указано',
    bus: 'Не указано',
    memoryGigabytes: 0,
    tdpWatts: estimateGraphicsCardPower(cardName)
  }
}

function deduplicateByName(records) {
  const uniqueRecords = []
  const usedNames = new Set()
  for (const record of records) {
    if (!record || !record.name) {
      continue
    }
    const key = record.name.toLowerCase()
    if (usedNames.has(key)) {
      continue
    }
    usedNames.add(key)
    uniqueRecords.push(record)
  }
  return uniqueRecords
}

async function loadData() {
  const [
    intelProcessorResponse,
    amdProcessorResponse,
    graphicsResponse,
    motherboardResponse,
    powerSupplyResponse,
    ddr2MemoryResponse,
    ddr3MemoryResponse,
    ddr4MemoryResponse,
    ddr5MemoryResponse,
    nvidiaGraphicsResponse,
    amdGraphicsResponse,
    intelGraphicsResponse,
    otherGraphicsResponse
  ] = await Promise.all([
    fetch('BD/CPU/intel_processors.json'),
    fetch('BD/CPU/amd_processors.json'),
    fetch('BD/GPU/gpu.csv'),
    fetch('BD/motherboards.json'),
    fetch('BD/power_supplies/catalog.json'),
    fetch('BD/RAM/ddr2/memory.json'),
    fetch('BD/RAM/ddr3/memory.json'),
    fetch('BD/RAM/ddr4/ddr4_memory.json'),
    fetch('BD/RAM/ddr5/ddr5_memory.json'),
    fetch('BD/GPU/nvidia_video_cards.json'),
    fetch('BD/GPU/amd_video_cards.json'),
    fetch('BD/GPU/intel_video_cards.json'),
    fetch('BD/GPU/other_video_cards.json')
  ])

  const intelProcessorDataset = await intelProcessorResponse.json()
  const amdProcessorDataset = await amdProcessorResponse.json()
  const graphicsRows = parseCommaSeparatedValues(await graphicsResponse.text())
  const motherboardRows = await motherboardResponse.json()
  const powerSupplyDataset = await powerSupplyResponse.json()
  const ddr2Rows = await ddr2MemoryResponse.json()
  const ddr3Rows = await ddr3MemoryResponse.json()
  const ddr4Rows = await ddr4MemoryResponse.json()
  const ddr5Rows = await ddr5MemoryResponse.json()
  const nvidiaGraphicsDataset = await nvidiaGraphicsResponse.json()
  const amdGraphicsDataset = await amdGraphicsResponse.json()
  const intelGraphicsDataset = await intelGraphicsResponse.json()
  const otherGraphicsDataset = await otherGraphicsResponse.json()

  applicationState.processors = deduplicateByName(
    intelProcessorDataset.items.concat(amdProcessorDataset.items)
      .map(parseProcessorRecord)
      .filter((processor) => processor.socket)
  )

  const csvGraphicsCards = graphicsRows
    .filter((graphicsCard) => graphicsCard.Name)
    .map((graphicsCard) => ({
      name: normalizeComponentName(graphicsCard.Name),
      vendor: inferGraphicsVendor(graphicsCard.Name),
      architecture: normalizeComponentName(graphicsCard.GPUChip) || 'Не указано',
      memory: normalizeComponentName(graphicsCard.Memory) || 'Не указано',
      bus: normalizeComponentName(graphicsCard.Bus) || 'Не указано',
      memoryGigabytes: parseGpuMemoryGigabytes(graphicsCard.Memory),
      tdpWatts: estimateGraphicsCardPower(graphicsCard.Name)
    }))

  const vendorGraphicsCards = []
  for (const record of nvidiaGraphicsDataset.records) {
    vendorGraphicsCards.push(parseGpuVendorRecord(record, 'nvidia'))
  }
  for (const record of amdGraphicsDataset.records) {
    vendorGraphicsCards.push(parseGpuVendorRecord(record, 'amd'))
  }
  for (const record of intelGraphicsDataset.records) {
    vendorGraphicsCards.push(parseGpuVendorRecord(record, 'intel'))
  }
  for (const record of otherGraphicsDataset.records) {
    vendorGraphicsCards.push(parseGpuVendorRecord(record, 'other'))
  }

  applicationState.graphicsCards = deduplicateByName(csvGraphicsCards.concat(vendorGraphicsCards))

  applicationState.motherboards = deduplicateByName(
    motherboardRows
      .filter((motherboard) => motherboard.name && motherboard.socket)
      .map((motherboard) => ({
        name: normalizeComponentName(motherboard.name),
        manufacturer: inferMotherboardManufacturer(motherboard.name),
        socket: parseSocket(motherboard.socket),
        chipset: normalizeComponentName(motherboard.chipset) || 'Не указано'
      }))
  )

  applicationState.memoryModules = deduplicateByName(
    ddr2Rows.map((memory) => parseMemoryRecord(memory, 2))
      .concat(ddr3Rows.map((memory) => parseMemoryRecord(memory, 3)))
      .concat(ddr4Rows.map((memory) => parseMemoryRecord(memory, 4)))
      .concat(ddr5Rows.map((memory) => parseMemoryRecord(memory, 5)))
      .filter((memory) => memory.name && memory.totalCapacityGigabytes > 0)
  )

  applicationState.powerSupplies = deduplicateByName(
    powerSupplyDataset.items
      .map(parsePowerSupplyRecord)
      .filter((powerSupply) => powerSupply.name && powerSupply.wattage > 0)
  )

  initializeSelectors()
  refreshDashboard()
}

function inferGraphicsVendor(name) {
  const normalizedName = String(name || '').toLowerCase()
  if (normalizedName.includes('radeon') || normalizedName.includes('rx ')) return 'AMD'
  if (normalizedName.includes('geforce') || normalizedName.includes('rtx') || normalizedName.includes('gtx')) return 'NVIDIA'
  if (normalizedName.includes('arc') || normalizedName.includes('intel')) return 'INTEL'
  return 'OTHER'
}

function inferMotherboardManufacturer(name) {
  const firstToken = normalizeComponentName(name).split(' ')[0]
  return firstToken || 'Не указано'
}

function estimateGraphicsCardPower(graphicsCardName) {
  const normalizedName = String(graphicsCardName || '').toUpperCase()
  if (normalizedName.includes('4090') || normalizedName.includes('7900 XTX')) return 450
  if (normalizedName.includes('4080') || normalizedName.includes('7900 XT')) return 320
  if (normalizedName.includes('4070') || normalizedName.includes('7800 XT')) return 250
  if (normalizedName.includes('4060') || normalizedName.includes('7700 XT') || normalizedName.includes('6700')) return 200
  if (normalizedName.includes('3060') || normalizedName.includes('6600')) return 170
  return 150
}

function formatMemoryOption(memoryModule) {
  return `${memoryModule.name} — ${memoryModule.generation}, ${memoryModule.totalCapacityGigabytes} ГБ, ${memoryModule.speedMegahertz} МГц`
}

function formatPowerSupplyOption(powerSupply) {
  return `${powerSupply.name} — ${powerSupply.wattage} Вт, ${powerSupply.efficiencyRating}`
}

function initializeSelectors() {
  fillSelector(userInterface.cpuSelect, applicationState.processors.map((processor) => processor.name))
  fillSelector(userInterface.gpuSelect, applicationState.graphicsCards.map((graphicsCard) => graphicsCard.name))
  fillSelector(userInterface.motherboardSelect, applicationState.motherboards.map((motherboard) => motherboard.name))
  fillSelector(userInterface.memorySelect, applicationState.memoryModules.map((memoryModule) => formatMemoryOption(memoryModule)))
  fillSelector(userInterface.powerSupplySelect, applicationState.powerSupplies.map((powerSupply) => formatPowerSupplyOption(powerSupply)))
  applicationState.selectedProcessorName = userInterface.cpuSelect.value
  applicationState.selectedGraphicsCardName = userInterface.gpuSelect.value
  applicationState.selectedMotherboardName = userInterface.motherboardSelect.value
  applicationState.selectedMemoryName = extractNameFromOption(userInterface.memorySelect.value)
  applicationState.selectedPowerSupplyName = extractNameFromOption(userInterface.powerSupplySelect.value)
  initializeComparisonControls()
  bindEvents()
}

function fillSelector(selector, values) {
  selector.innerHTML = ''
  const limitedValues = values.slice(0, 1200)
  for (const value of limitedValues) {
    const optionElement = document.createElement('option')
    optionElement.value = value
    optionElement.textContent = value
    selector.append(optionElement)
  }
}

function extractNameFromOption(optionValue) {
  return String(optionValue || '').split('—')[0].trim()
}

function bindEvents() {
  userInterface.cpuSelect.addEventListener('change', (event) => {
    applicationState.selectedProcessorName = event.target.value
    refreshDashboard()
  })

  userInterface.gpuSelect.addEventListener('change', (event) => {
    applicationState.selectedGraphicsCardName = event.target.value
    refreshDashboard()
  })

  userInterface.motherboardSelect.addEventListener('change', (event) => {
    applicationState.selectedMotherboardName = event.target.value
    refreshDashboard()
  })

  userInterface.memorySelect.addEventListener('change', (event) => {
    applicationState.selectedMemoryName = extractNameFromOption(event.target.value)
    refreshDashboard()
  })

  userInterface.powerSupplySelect.addEventListener('change', (event) => {
    applicationState.selectedPowerSupplyName = extractNameFromOption(event.target.value)
    refreshDashboard()
  })

  userInterface.storageSize.addEventListener('input', refreshDashboard)

  userInterface.comparisonCategory.addEventListener('change', () => {
    initializeComparisonControls()
    refreshComparisonTable()
  })
  userInterface.comparisonSortField.addEventListener('change', () => {
    fillComparisonSelectors()
    refreshComparisonTable()
  })
  userInterface.comparisonSortDirection.addEventListener('change', () => {
    fillComparisonSelectors()
    refreshComparisonTable()
  })
  userInterface.comparisonCompatibilityOnly.addEventListener('change', () => {
    fillComparisonSelectors()
    refreshComparisonTable()
  })
  userInterface.comparisonFirst.addEventListener('change', refreshComparisonTable)
  userInterface.comparisonSecond.addEventListener('change', refreshComparisonTable)

  for (const tabButton of tabButtons) {
    tabButton.addEventListener('click', () => openTab(tabButton.dataset.tab))
  }
}

function getCurrentSelection() {
  const processor = applicationState.processors.find((item) => item.name === applicationState.selectedProcessorName)
  const graphicsCard = applicationState.graphicsCards.find((item) => item.name === applicationState.selectedGraphicsCardName)
  const motherboard = applicationState.motherboards.find((item) => item.name === applicationState.selectedMotherboardName)
  const memoryModule = applicationState.memoryModules.find((item) => item.name === applicationState.selectedMemoryName)
  const powerSupply = applicationState.powerSupplies.find((item) => item.name === applicationState.selectedPowerSupplyName)
  return { processor, graphicsCard, motherboard, memoryModule, powerSupply }
}

function buildSortOptionsForCategory(category) {
  if (category === 'gpu') {
    return [
      { value: 'compatibility', label: 'Совместимость с текущим БП' },
      { value: 'tdpWatts', label: 'Энергопотребление' },
      { value: 'memoryGigabytes', label: 'Объем видеопамяти' },
      { value: 'vendor', label: 'Производитель' }
    ]
  }
  if (category === 'motherboard') {
    return [
      { value: 'compatibility', label: 'Совместимость с текущим CPU' },
      { value: 'chipset', label: 'Чипсет' },
      { value: 'socket', label: 'Сокет' },
      { value: 'manufacturer', label: 'Бренд' }
    ]
  }
  if (category === 'ram') {
    return [
      { value: 'compatibility', label: 'Совместимость с текущей платой' },
      { value: 'generation', label: 'Поколение DDR' },
      { value: 'totalCapacityGigabytes', label: 'Объем комплекта' },
      { value: 'speedMegahertz', label: 'Частота' }
    ]
  }
  if (category === 'psu') {
    return [
      { value: 'compatibility', label: 'Совместимость с текущей сборкой' },
      { value: 'wattage', label: 'Мощность' },
      { value: 'efficiencyRating', label: 'Сертификация' },
      { value: 'modularRank', label: 'Модульность' }
    ]
  }
  return [
    { value: 'compatibility', label: 'Совместимость с текущей платой' },
    { value: 'manufacturer', label: 'Производитель' },
    { value: 'socket', label: 'Сокет' },
    { value: 'cores', label: 'Количество ядер' },
    { value: 'boostClockGigahertz', label: 'Буст-частота' }
  ]
}

function initializeComparisonControls() {
  const options = buildSortOptionsForCategory(userInterface.comparisonCategory.value)
  fillSelector(userInterface.comparisonSortField, options.map((item) => item.value))
  const sortFieldOptions = userInterface.comparisonSortField.querySelectorAll('option')
  sortFieldOptions.forEach((option) => {
    const found = options.find((item) => item.value === option.value)
    option.textContent = found ? found.label : option.value
  })
  fillComparisonSelectors()
}

function getComparisonDataset() {
  const category = userInterface.comparisonCategory.value
  if (category === 'gpu') return applicationState.graphicsCards
  if (category === 'motherboard') return applicationState.motherboards
  if (category === 'ram') return applicationState.memoryModules
  if (category === 'psu') return applicationState.powerSupplies
  return applicationState.processors
}

function computeTotalPower(processor, graphicsCard, memoryModule, storageSize) {
  return processor.tdpWatts + graphicsCard.tdpWatts + Math.ceil(memoryModule.totalCapacityGigabytes * 0.5) + Math.ceil(storageSize / 1000 * 8) + 60
}

function getCompatibilityScore(item, category, selection, totalPower, recommendedPower) {
  if (category === 'cpu') {
    return item.socket === selection.motherboard.socket ? 2 : 0
  }
  if (category === 'gpu') {
    if (selection.powerSupply.wattage >= recommendedPower) return 2
    if (selection.powerSupply.wattage >= totalPower) return 1
    return 0
  }
  if (category === 'motherboard') {
    return item.socket === selection.processor.socket ? 2 : 0
  }
  if (category === 'ram') {
    const boardSocket = selection.motherboard.socket
    if ((boardSocket === 'AM5' || boardSocket === 'LGA1851') && item.generation === 'DDR5') return 2
    if ((boardSocket !== 'AM5' && boardSocket !== 'LGA1851') && (item.generation === 'DDR4' || item.generation === 'DDR3')) return 1
    return 0
  }
  if (category === 'psu') {
    if (item.wattage >= recommendedPower) return 2
    if (item.wattage >= totalPower) return 1
    return 0
  }
  return 0
}

function compareValues(firstValue, secondValue, direction) {
  if (typeof firstValue === 'number' && typeof secondValue === 'number') {
    return direction === 'desc' ? secondValue - firstValue : firstValue - secondValue
  }
  const firstText = String(firstValue || '')
  const secondText = String(secondValue || '')
  return direction === 'desc' ? secondText.localeCompare(firstText, 'ru') : firstText.localeCompare(secondText, 'ru')
}

function getSortedComparisonDataset() {
  const category = userInterface.comparisonCategory.value
  const dataset = getComparisonDataset().slice(0)
  const sortField = userInterface.comparisonSortField.value
  const sortDirection = userInterface.comparisonSortDirection.value
  const compatibilityOnly = userInterface.comparisonCompatibilityOnly.checked
  const selection = getCurrentSelection()
  if (!selection.processor || !selection.graphicsCard || !selection.motherboard || !selection.memoryModule || !selection.powerSupply) {
    return dataset
  }
  const storageSize = toNumber(userInterface.storageSize.value, 1000)
  const totalPower = computeTotalPower(selection.processor, selection.graphicsCard, selection.memoryModule, storageSize)
  const recommendedPower = Math.ceil(totalPower * 1.35)
  const scoredDataset = dataset.map((item) => ({
    item,
    compatibilityScore: getCompatibilityScore(item, category, selection, totalPower, recommendedPower)
  }))
  const filteredDataset = compatibilityOnly ? scoredDataset.filter((entry) => entry.compatibilityScore > 0) : scoredDataset
  filteredDataset.sort((firstEntry, secondEntry) => {
    if (sortField === 'compatibility') {
      return compareValues(firstEntry.compatibilityScore, secondEntry.compatibilityScore, sortDirection)
    }
    return compareValues(firstEntry.item[sortField], secondEntry.item[sortField], sortDirection)
  })
  return filteredDataset.map((entry) => entry.item)
}

function fillComparisonSelectors() {
  const options = getSortedComparisonDataset().map((item) => item.name).slice(0, 1200)
  fillSelector(userInterface.comparisonFirst, options)
  fillSelector(userInterface.comparisonSecond, options.slice(1).concat(options[0] || ''))
}

function refreshDashboard() {
  userInterface.cpuCount.textContent = applicationState.processors.length.toLocaleString('ru-RU')
  userInterface.gpuCount.textContent = applicationState.graphicsCards.length.toLocaleString('ru-RU')
  userInterface.motherboardCount.textContent = applicationState.motherboards.length.toLocaleString('ru-RU')
  refreshCompatibility()
  fillComparisonSelectors()
  refreshComparisonTable()
  refreshAssemblySteps()
}

function refreshCompatibility() {
  const selection = getCurrentSelection()
  if (!selection.processor || !selection.graphicsCard || !selection.motherboard || !selection.memoryModule || !selection.powerSupply) {
    return
  }
  const storageSize = toNumber(userInterface.storageSize.value)
  const totalPower = computeTotalPower(selection.processor, selection.graphicsCard, selection.memoryModule, storageSize)
  const recommendedPower = Math.ceil(totalPower * 1.35)
  const socketCompatible = selection.processor.socket === selection.motherboard.socket

  const compatibilityMessages = [
    {
      level: socketCompatible ? 'good' : 'bad',
      text: socketCompatible
        ? `Сокеты совпадают: ${selection.processor.socket} поддерживается платой ${selection.motherboard.name}.`
        : `Несовместимость сокетов: процессор ${selection.processor.socket}, материнская плата ${selection.motherboard.socket}.`
    },
    {
      level: selection.powerSupply.wattage >= recommendedPower ? 'good' : (selection.powerSupply.wattage >= totalPower ? 'warn' : 'bad'),
      text: selection.powerSupply.wattage >= recommendedPower
        ? `БП ${selection.powerSupply.name} (${selection.powerSupply.wattage} Вт) имеет хороший запас.`
        : selection.powerSupply.wattage >= totalPower
          ? `БП ${selection.powerSupply.name} (${selection.powerSupply.wattage} Вт) запускает систему с минимальным запасом.`
          : `БП ${selection.powerSupply.name} (${selection.powerSupply.wattage} Вт) недостаточен. Рекомендуется минимум ${recommendedPower} Вт.`
    },
    {
      level: selection.memoryModule.totalCapacityGigabytes >= 16 ? 'good' : 'warn',
      text: `Установлена память: ${selection.memoryModule.generation} ${selection.memoryModule.totalCapacityGigabytes} ГБ ${selection.memoryModule.speedMegahertz} МГц.`
    },
    {
      level: storageSize >= 1000 ? 'good' : 'warn',
      text: storageSize >= 1000
        ? `SSD ${storageSize} ГБ удобен для игр и тяжелых проектов.`
        : `SSD ${storageSize} ГБ может быстро заполниться после установки крупных игр.`
    }
  ]

  userInterface.compatibilityList.innerHTML = ''
  for (const compatibilityMessage of compatibilityMessages) {
    const messageElement = document.createElement('li')
    messageElement.className = compatibilityMessage.level
    messageElement.textContent = compatibilityMessage.text
    userInterface.compatibilityList.append(messageElement)
  }

  userInterface.powerEstimation.textContent = `${totalPower} Вт (рекомендовано ${recommendedPower} Вт)`
  userInterface.buildSummary.textContent = `Конфигурация: ${selection.processor.name} + ${selection.graphicsCard.name} + ${selection.motherboard.name}. Память ${selection.memoryModule.generation} ${selection.memoryModule.totalCapacityGigabytes} ГБ, БП ${selection.powerSupply.wattage} Вт.`
}

function refreshComparisonTable() {
  const comparisonData = getSortedComparisonDataset()
  const firstItem = comparisonData.find((item) => item.name === userInterface.comparisonFirst.value)
  const secondItem = comparisonData.find((item) => item.name === userInterface.comparisonSecond.value)
  if (!firstItem || !secondItem) {
    userInterface.comparisonTable.textContent = 'Недостаточно данных для сравнения.'
    return
  }
  const keys = Object.keys(firstItem).filter((key) => key !== 'name')
  const tableElement = document.createElement('table')
  const header = document.createElement('tr')
  header.innerHTML = `<th>Параметр</th><th>${firstItem.name}</th><th>${secondItem.name}</th>`
  tableElement.append(header)
  for (const key of keys) {
    const row = document.createElement('tr')
    row.innerHTML = `<td>${localizeComparisonField(key)}</td><td>${firstItem[key] || '—'}</td><td>${secondItem[key] || '—'}</td>`
    tableElement.append(row)
  }
  userInterface.comparisonTable.innerHTML = ''
  userInterface.comparisonTable.append(tableElement)
}

function localizeComparisonField(fieldName) {
  const labels = {
    manufacturer: 'Производитель',
    socket: 'Сокет',
    cores: 'Ядра',
    boostClockGigahertz: 'Буст-частота, ГГц',
    tdpWatts: 'TDP, Вт',
    architecture: 'Графический чип',
    memory: 'Память',
    memoryGigabytes: 'Объем VRAM, ГБ',
    bus: 'Интерфейс',
    chipset: 'Чипсет',
    generation: 'Тип памяти',
    speedMegahertz: 'Частота памяти',
    totalCapacityGigabytes: 'Объем комплекта, ГБ',
    casLatency: 'CAS latency',
    wattage: 'Мощность БП, Вт',
    efficiencyRating: 'Сертификация БП',
    modular: 'Модульность'
  }
  return labels[fieldName] || fieldName
}

function refreshAssemblySteps() {
  const selection = getCurrentSelection()
  if (!selection.processor || !selection.graphicsCard || !selection.motherboard || !selection.memoryModule || !selection.powerSupply) {
    return
  }
  const steps = [
    `Подготовьте рабочее место: антистатический коврик, отвертка и корпус с блоком питания ${selection.powerSupply.name}.`,
    `Установите процессор ${selection.processor.name} в сокет ${selection.motherboard.socket} на плате ${selection.motherboard.name}.`,
    'Нанесите термопасту и закрепите систему охлаждения согласно креплению сокета.',
    `Установите модули ОЗУ: ${selection.memoryModule.name} (${selection.memoryModule.totalCapacityGigabytes} ГБ) в рекомендованные слоты A2/B2.`,
    `Закрепите материнскую плату в корпусе, подключите питание ATX 24-pin и EPS 8-pin от БП ${selection.powerSupply.name}.`,
    `Установите видеокарту ${selection.graphicsCard.name} в верхний PCIe x16 слот и подключите кабели питания.`,
    `Подключите накопители общим объемом ${userInterface.storageSize.value} ГБ, фронтальную панель и вентиляторы корпуса.`,
    'Выполните первый запуск, проверьте температуры, обновите BIOS и установите драйверы.'
  ]
  userInterface.assemblySteps.innerHTML = ''
  for (const step of steps) {
    const stepElement = document.createElement('li')
    stepElement.textContent = step
    userInterface.assemblySteps.append(stepElement)
  }
}

function openTab(tabName) {
  for (const tabButton of tabButtons) {
    tabButton.classList.toggle('active', tabButton.dataset.tab === tabName)
  }
  for (const tabPanel of tabPanels) {
    tabPanel.classList.toggle('active', tabPanel.id === tabName)
  }
}

loadData().catch(() => {
  userInterface.compatibilityList.innerHTML = '<li class="bad">Не удалось загрузить базу комплектующих. Проверьте структуру файлов.</li>'
})
