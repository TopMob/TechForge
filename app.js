const applicationState = {
  processors: [],
  graphicsCards: [],
  motherboards: [],
  selectedProcessorName: '',
  selectedGraphicsCardName: '',
  selectedMotherboardName: ''
}

const userInterface = {
  cpuSelect: document.getElementById('cpu-select'),
  gpuSelect: document.getElementById('gpu-select'),
  motherboardSelect: document.getElementById('motherboard-select'),
  memorySize: document.getElementById('memory-size'),
  storageSize: document.getElementById('storage-size'),
  powerSupply: document.getElementById('power-supply'),
  compatibilityList: document.getElementById('compatibility-list'),
  powerEstimation: document.getElementById('power-estimation'),
  buildSummary: document.getElementById('build-summary'),
  comparisonCategory: document.getElementById('comparison-category'),
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
    if (values.length === 0) {
      continue
    }
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
  return componentName.replace(/\s+/g, ' ').trim()
}

function parsePowerValue(powerText) {
  const numericPart = powerText.match(/\d+/)
  return numericPart ? Number(numericPart[0]) : 0
}

function parseSocket(socketText) {
  return socketText.replace('Socket', '').replace(/\s+/g, '').toUpperCase()
}

async function loadData() {
  const [processorResponse, graphicsResponse, motherboardResponse] = await Promise.all([
    fetch('BD/cpu.csv'),
    fetch('BD/gpu.csv'),
    fetch('BD/PC-Components-main/motherboards.json')
  ])

  const processorRows = parseCommaSeparatedValues(await processorResponse.text())
  const graphicsRows = parseCommaSeparatedValues(await graphicsResponse.text())
  const motherboardRows = await motherboardResponse.json()

  applicationState.processors = processorRows
    .filter((processor) => processor.Name && processor.Socket)
    .map((processor) => ({
      name: normalizeComponentName(processor.Name),
      socket: parseSocket(processor.Socket),
      cores: processor.Cores,
      boostClock: processor.Clock,
      tdpWatts: parsePowerValue(processor.TDP)
    }))

  applicationState.graphicsCards = graphicsRows
    .filter((graphicsCard) => graphicsCard.Name)
    .map((graphicsCard) => ({
      name: normalizeComponentName(graphicsCard.Name),
      architecture: normalizeComponentName(graphicsCard.GPUChip || 'Не указано'),
      memory: graphicsCard.Memory || 'Не указано',
      bus: graphicsCard.Bus || 'Не указано',
      tdpWatts: estimateGraphicsCardPower(graphicsCard.Name)
    }))

  applicationState.motherboards = motherboardRows
    .filter((motherboard) => motherboard.name && motherboard.socket)
    .map((motherboard) => ({
      name: motherboard.name,
      socket: parseSocket(motherboard.socket),
      chipset: motherboard.chipset || 'Не указано'
    }))

  initializeSelectors()
  refreshDashboard()
}

function estimateGraphicsCardPower(graphicsCardName) {
  const normalizedName = graphicsCardName.toUpperCase()
  if (normalizedName.includes('4090') || normalizedName.includes('7900 XTX')) {
    return 450
  }
  if (normalizedName.includes('4080') || normalizedName.includes('7900 XT')) {
    return 320
  }
  if (normalizedName.includes('4070') || normalizedName.includes('7800 XT')) {
    return 250
  }
  if (normalizedName.includes('4060') || normalizedName.includes('7700 XT') || normalizedName.includes('6700')) {
    return 200
  }
  if (normalizedName.includes('3060') || normalizedName.includes('6600')) {
    return 170
  }
  return 150
}

function initializeSelectors() {
  fillSelector(userInterface.cpuSelect, applicationState.processors.map((processor) => processor.name))
  fillSelector(userInterface.gpuSelect, applicationState.graphicsCards.map((graphicsCard) => graphicsCard.name))
  fillSelector(userInterface.motherboardSelect, applicationState.motherboards.map((motherboard) => motherboard.name))
  applicationState.selectedProcessorName = userInterface.cpuSelect.value
  applicationState.selectedGraphicsCardName = userInterface.gpuSelect.value
  applicationState.selectedMotherboardName = userInterface.motherboardSelect.value
  fillComparisonSelectors()
  bindEvents()
}

function fillSelector(selector, values) {
  selector.innerHTML = ''
  const limitedValues = values.slice(0, 700)
  for (const value of limitedValues) {
    const optionElement = document.createElement('option')
    optionElement.value = value
    optionElement.textContent = value
    selector.append(optionElement)
  }
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

  userInterface.memorySize.addEventListener('input', refreshDashboard)
  userInterface.storageSize.addEventListener('input', refreshDashboard)
  userInterface.powerSupply.addEventListener('input', refreshDashboard)

  userInterface.comparisonCategory.addEventListener('change', () => {
    fillComparisonSelectors()
    refreshComparisonTable()
  })

  userInterface.comparisonFirst.addEventListener('change', refreshComparisonTable)
  userInterface.comparisonSecond.addEventListener('change', refreshComparisonTable)

  for (const tabButton of tabButtons) {
    tabButton.addEventListener('click', () => openTab(tabButton.dataset.tab))
  }
}

function fillComparisonSelectors() {
  const options = getComparisonDataset().map((item) => item.name).slice(0, 700)
  fillSelector(userInterface.comparisonFirst, options)
  fillSelector(userInterface.comparisonSecond, options.slice(1).concat(options[0]))
}

function getComparisonDataset() {
  if (userInterface.comparisonCategory.value === 'gpu') {
    return applicationState.graphicsCards
  }
  if (userInterface.comparisonCategory.value === 'motherboard') {
    return applicationState.motherboards
  }
  return applicationState.processors
}

function refreshDashboard() {
  userInterface.cpuCount.textContent = applicationState.processors.length.toLocaleString('ru-RU')
  userInterface.gpuCount.textContent = applicationState.graphicsCards.length.toLocaleString('ru-RU')
  userInterface.motherboardCount.textContent = applicationState.motherboards.length.toLocaleString('ru-RU')
  refreshCompatibility()
  refreshComparisonTable()
  refreshAssemblySteps()
}

function refreshCompatibility() {
  const selectedProcessor = applicationState.processors.find((processor) => processor.name === applicationState.selectedProcessorName)
  const selectedMotherboard = applicationState.motherboards.find((motherboard) => motherboard.name === applicationState.selectedMotherboardName)
  const selectedGraphicsCard = applicationState.graphicsCards.find((graphicsCard) => graphicsCard.name === applicationState.selectedGraphicsCardName)
  if (!selectedProcessor || !selectedMotherboard || !selectedGraphicsCard) {
    return
  }

  const memorySize = Number(userInterface.memorySize.value) || 0
  const storageSize = Number(userInterface.storageSize.value) || 0
  const powerSupplyValue = Number(userInterface.powerSupply.value) || 0
  const totalPower = selectedProcessor.tdpWatts + selectedGraphicsCard.tdpWatts + Math.ceil(memorySize * 0.5) + Math.ceil(storageSize / 1000 * 8) + 60
  const recommendedPower = Math.ceil(totalPower * 1.35)
  const socketCompatible = selectedProcessor.socket === selectedMotherboard.socket

  const compatibilityMessages = [
    {
      level: socketCompatible ? 'good' : 'bad',
      text: socketCompatible
        ? `Сокеты совпадают: ${selectedProcessor.socket} поддерживается платой ${selectedMotherboard.name}.`
        : `Несовместимость сокетов: процессор ${selectedProcessor.socket}, материнская плата ${selectedMotherboard.socket}.`
    },
    {
      level: powerSupplyValue >= recommendedPower ? 'good' : (powerSupplyValue >= totalPower ? 'warn' : 'bad'),
      text: powerSupplyValue >= recommendedPower
        ? `Блок питания ${powerSupplyValue} Вт имеет хороший запас для системы.`
        : powerSupplyValue >= totalPower
          ? `Блок питания ${powerSupplyValue} Вт запустит систему, но запас по мощности минимальный.`
          : `Блок питания ${powerSupplyValue} Вт недостаточен. Рекомендуется минимум ${recommendedPower} Вт.`
    },
    {
      level: memorySize >= 16 ? 'good' : 'warn',
      text: memorySize >= 16
        ? `Объем ОЗУ ${memorySize} ГБ подходит для современных игр и рабочих задач.`
        : `ОЗУ ${memorySize} ГБ хватит только для базовых сценариев, лучше от 16 ГБ.`
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
  userInterface.buildSummary.textContent = `Конфигурация: ${selectedProcessor.name} + ${selectedGraphicsCard.name} + ${selectedMotherboard.name}. Чипсет ${selectedMotherboard.chipset}.`
}

function refreshComparisonTable() {
  const comparisonData = getComparisonDataset()
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
    socket: 'Сокет',
    cores: 'Ядра / потоки',
    boostClock: 'Частота',
    tdpWatts: 'TDP, Вт',
    architecture: 'Графический чип',
    memory: 'Память',
    bus: 'Интерфейс',
    chipset: 'Чипсет'
  }
  return labels[fieldName] || fieldName
}

function refreshAssemblySteps() {
  const selectedProcessor = applicationState.processors.find((processor) => processor.name === applicationState.selectedProcessorName)
  const selectedMotherboard = applicationState.motherboards.find((motherboard) => motherboard.name === applicationState.selectedMotherboardName)
  const selectedGraphicsCard = applicationState.graphicsCards.find((graphicsCard) => graphicsCard.name === applicationState.selectedGraphicsCardName)
  const powerSupplyValue = Number(userInterface.powerSupply.value) || 0
  if (!selectedProcessor || !selectedMotherboard || !selectedGraphicsCard) {
    return
  }

  const steps = [
    `Подготовьте рабочее место: антистатический коврик, отвертка и корпус с блоком питания ${powerSupplyValue} Вт.`,
    `Установите процессор ${selectedProcessor.name} в сокет ${selectedMotherboard.socket} на плате ${selectedMotherboard.name}.`,
    'Нанесите термопасту и закрепите систему охлаждения согласно креплению сокета.',
    `Установите модули ОЗУ объемом ${userInterface.memorySize.value} ГБ в рекомендованные слоты A2/B2.`,
    `Закрепите материнскую плату в корпусе, подключите питание ATX 24-pin и EPS 8-pin.`,
    `Установите видеокарту ${selectedGraphicsCard.name} в верхний PCIe x16 слот и подключите кабели питания.`,
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
