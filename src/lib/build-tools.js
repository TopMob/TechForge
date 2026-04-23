const storageKey = 'techforge-build-slots-v1'

function safeParse(raw) {
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function readSlots() {
  const raw = localStorage.getItem(storageKey)
  return safeParse(raw)
}

function writeSlots(slots) {
  localStorage.setItem(storageKey, JSON.stringify(slots))
}

export function getAllBuilds() {
  return readSlots()
}

export function getSlotNames() {
  const slots = readSlots()
  const base = ['Мой ПК #1', 'Мой ПК #2', 'Мой ПК #3', 'Игровой', 'Рабочий']
  const dynamic = Object.keys(slots)
  return Array.from(new Set([...base, ...dynamic]))
}

export function saveBuild(slotName, selectedConfigurationByCategory, budgetValue) {
  const slots = readSlots()
  slots[slotName] = {
    selectedConfigurationByCategory,
    budgetValue: budgetValue || '',
    updatedAt: new Date().toISOString()
  }
  writeSlots(slots)
}

export function loadBuild(slotName) {
  const slots = readSlots()
  return slots[slotName] || null
}

export function deleteBuild(slotName) {
  const slots = readSlots()
  if (!slots[slotName]) return false
  delete slots[slotName]
  writeSlots(slots)
  return true
}

export function exportBuildPayload(payload) {
  return JSON.stringify(payload, null, 2)
}

export function importBuildPayload(raw) {
  const parsed = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object' || !parsed.selectedConfigurationByCategory) {
    throw new Error('Некорректный JSON сборки')
  }
  return parsed
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function parseNumeric(value) {
  const match = normalizeText(value).replace(',', '.').match(/\d+(?:\.\d+)?/)
  if (!match) return 0
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : 0
}

function cpuScore(record, profile) {
  const cores = parseNumeric(record?.specs?.Ядра || record?.specs?.Потоки)
  const frequency = parseNumeric(record?.specs?.Частота || record?.specs?.['Базовая частота'])
  const tdp = parseNumeric(record?.specs?.TDP)
  const price = Number(record?.price) || 0
  const perf = (cores * 2.5) + frequency
  const efficiency = tdp > 0 ? perf / tdp : perf
  const value = price > 0 ? perf / price : perf

  if (profile.scenario === 'office') return value * 0.6 + efficiency * 0.4
  if (profile.scenario === 'editing') return perf * 0.7 + value * 0.3
  if (profile.scenario === 'gaming') return perf * 0.6 + value * 0.4
  return perf * 0.45 + value * 0.35 + efficiency * 0.2
}

function sortByScore(records, scorer) {
  return records
    .map((record) => ({ record, score: scorer(record) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.record)
}

function pickCpu(records, wizard) {
  const budget = Number(wizard.budgetValue) || 0
  const filtered = budget > 0 ? records.filter((record) => (record.price || 0) <= budget * 0.45) : records
  const source = filtered.length > 0 ? filtered : records
  const ranked = sortByScore(source, (record) => cpuScore(record, wizard))
  return ranked[0] || null
}

function pickMotherboard(cpuRecord, motherboardRecords, wizard) {
  if (!cpuRecord) return null
  const socket = normalizeText(cpuRecord?.specs?.Сокет)
  const source = socket ? motherboardRecords.filter((record) => normalizeText(record?.specs?.Сокет) === socket) : motherboardRecords
  if (source.length === 0) return null
  const budgetBias = wizard.priority === 'minimal_price' ? 1 : 0.75
  const ranked = source.sort((a, b) => ((a.price || 0) * budgetBias) - ((b.price || 0) * budgetBias))
  return ranked[0] || null
}

function pickRam(motherboardRecord, ramRecords, wizard) {
  if (ramRecords.length === 0) return null
  const chipset = normalizeText(motherboardRecord?.specs?.Чипсет)
  const preferredType = chipset.includes('b6') || chipset.includes('x6') || chipset.includes('z7') ? 'ddr5' : ''
  const typeFiltered = preferredType ? ramRecords.filter((record) => normalizeText(record?.specs?.Тип).includes(preferredType)) : ramRecords
  const source = typeFiltered.length > 0 ? typeFiltered : ramRecords
  const ranked = source.sort((a, b) => {
    const priceDelta = (a.price || 0) - (b.price || 0)
    if (wizard.priority === 'fps') return ((parseNumeric(b?.specs?.Частота) - parseNumeric(a?.specs?.Частота)) * 10) + priceDelta
    return priceDelta
  })
  return ranked[0] || null
}

function pickCooler(cpuRecord, coolerRecords, wizard) {
  if (coolerRecords.length === 0) return null
  const cpuTdp = parseNumeric(cpuRecord?.specs?.TDP)
  const adequate = coolerRecords.filter((record) => parseNumeric(record?.specs?.TDP) >= cpuTdp)
  const source = adequate.length > 0 ? adequate : coolerRecords
  const ranked = source.sort((a, b) => {
    if (wizard.priority === 'quiet') return parseNumeric(b?.specs?.TDP) - parseNumeric(a?.specs?.TDP)
    return (a.price || 0) - (b.price || 0)
  })
  return ranked[0] || null
}

function pickByPrice(records, ascending = true) {
  const source = [...records]
  source.sort((a, b) => ascending ? ((a.price || 0) - (b.price || 0)) : ((b.price || 0) - (a.price || 0)))
  return source[0] || null
}

export function getWizardDefaults() {
  return {
    budgetValue: '',
    scenario: 'balanced',
    priority: 'minimal_price'
  }
}

export function buildWizardPlan({ componentsByCategory, wizardState }) {
  const cpu = pickCpu(componentsByCategory.cpu || [], wizardState)
  const motherboard = pickMotherboard(cpu, componentsByCategory.motherboard || [], wizardState)
  const ram = pickRam(motherboard, componentsByCategory.ram || [], wizardState)
  const cooler = pickCooler(cpu, componentsByCategory.cooler || [], wizardState)
  const gpu = pickByPrice(componentsByCategory.gpu || [], wizardState.priority !== 'fps')
  const ssd = pickByPrice(componentsByCategory.ssd || [], true)
  const powerSupply = pickByPrice(componentsByCategory.power_supply || [], false)
  const pcCase = pickByPrice(componentsByCategory.case || [], true)

  return {
    cpu,
    motherboard,
    ram,
    cooler,
    gpu,
    ssd,
    power_supply: powerSupply,
    case: pcCase
  }
}

export function buildWizardSummary(plan) {
  const rows = Object.entries(plan)
    .filter(([, record]) => record)
    .map(([category, record]) => ({
      category,
      id: record.id,
      name: record.name,
      price: Number(record.price) || 0
    }))
  const total = rows.reduce((sum, row) => sum + row.price, 0)
  return { rows, total }
}

function perfScore(record) {
  if (!record) return 0
  const cores = parseNumeric(record?.specs?.Ядра || record?.specs?.Потоки)
  const freq = parseNumeric(record?.specs?.Частота || record?.specs?.['Базовая частота'])
  const cache = parseNumeric(record?.specs?.Кэш || record?.specs?.['Кэш L3'])
  return (cores * 3) + freq + (cache * 0.08)
}

function nearestByPrice(records, targetPrice) {
  return [...records]
    .filter((record) => record.price)
    .sort((a, b) => Math.abs((a.price || 0) - targetPrice) - Math.abs((b.price || 0) - targetPrice))[0] || null
}

function betterByPerf(records, baselineScore, maxPrice) {
  return [...records]
    .filter((record) => (record.price || 0) <= maxPrice && perfScore(record) > baselineScore)
    .sort((a, b) => perfScore(b) - perfScore(a))[0] || null
}

export function auditBuild({ selectedRecordsByCategory, budgetValue, getCategoryRecords }) {
  const issues = []
  const fixesMinimal = []
  const fixesOptimal = []
  const fixesNoBudgetIncrease = []

  const cpu = selectedRecordsByCategory.cpu
  const gpu = selectedRecordsByCategory.gpu
  const motherboard = selectedRecordsByCategory.motherboard
  const cooler = selectedRecordsByCategory.cooler
  const powerSupply = selectedRecordsByCategory.power_supply
  const ssd = selectedRecordsByCategory.ssd

  const totalPrice = Object.values(selectedRecordsByCategory).reduce((sum, record) => sum + (record?.price || 0), 0)
  const budget = Number(budgetValue) || 0

  if (!ssd) {
    issues.push('В сборке нет SSD: система и загрузки будут заметно медленнее.')
    const ssdCandidate = nearestByPrice(getCategoryRecords('ssd'), 5000)
    if (ssdCandidate) {
      fixesMinimal.push(`Добавить SSD: ${ssdCandidate.name}.`)
      fixesOptimal.push(`Добавить SSD и перенести систему на ${ssdCandidate.name}.`)
      fixesNoBudgetIncrease.push(`Добавить ${ssdCandidate.name} и компенсировать бюджет за счёт менее дорогого корпуса.`)
    }
  }

  if (cpu && gpu && cpu.price && gpu.price) {
    const ratio = cpu.price / Math.max(gpu.price, 1)
    if (ratio > 2.2) {
      issues.push('GPU слишком слабый относительно CPU: часть потенциала процессора теряется в играх.')
      const strongerGpu = betterByPerf(getCategoryRecords('gpu'), perfScore(gpu), (gpu.price || 0) + 15000)
      if (strongerGpu) fixesOptimal.push(`Заменить GPU на ${strongerGpu.name} для более сбалансированной связки.`)
      const cheaperCpu = nearestByPrice(getCategoryRecords('cpu'), gpu.price * 1.6)
      if (cheaperCpu) fixesNoBudgetIncrease.push(`Снизить CPU до ${cheaperCpu.name}, сохранив текущий GPU без роста бюджета.`)
    }
  }

  if (motherboard && cpu && motherboard.price && cpu.price && motherboard.price > cpu.price * 0.95) {
    issues.push('Есть риск переплаты за материнскую плату относительно выбранного CPU.')
    const cheaperBoard = nearestByPrice(getCategoryRecords('motherboard'), cpu.price * 0.55)
    if (cheaperBoard) {
      fixesMinimal.push(`Рассмотреть более рациональную плату: ${cheaperBoard.name}.`)
      fixesNoBudgetIncrease.push('Перенаправить экономию с платы на более сильный GPU или SSD.')
    }
  }

  const cpuTdp = parseNumeric(cpu?.specs?.TDP)
  const coolerTdp = parseNumeric(cooler?.specs?.TDP)
  if (cpu && cooler && cpuTdp > 0 && coolerTdp > 0 && coolerTdp < cpuTdp) {
    issues.push('Кулер слабоват для текущего CPU: возможны высокие температуры и шум.')
    const strongerCooler = betterByPerf(getCategoryRecords('cooler'), coolerTdp, (cooler.price || 0) + 5000)
    if (strongerCooler) {
      fixesMinimal.push(`Поменять кулер на ${strongerCooler.name}.`)
      fixesOptimal.push(`Усилить охлаждение до ${strongerCooler.name} для стабильных буст-частот.`)
    }
  }

  const cpuPower = parseNumeric(cpu?.specs?.TDP)
  const gpuPower = parseNumeric(gpu?.specs?.Энергопотребление)
  const psuPower = parseNumeric(powerSupply?.specs?.Мощность)
  const requiredPower = Math.round((cpuPower + gpuPower) * 1.45)
  if (powerSupply && requiredPower > 0 && psuPower < requiredPower) {
    issues.push('БП без запаса: мощности может не хватить под нагрузкой и апгрейдом.')
    const strongerPsu = nearestByPrice(getCategoryRecords('power_supply'), requiredPower)
    if (strongerPsu) {
      fixesMinimal.push(`Установить БП не ниже ${requiredPower} Вт, например ${strongerPsu.name}.`)
      fixesOptimal.push(`Поставить более эффективный БП ${strongerPsu.name} с запасом по мощности.`)
    }
  }

  if (budget > 0 && totalPrice > budget) {
    issues.push('Сборка превышает бюджет.')
    fixesMinimal.push('Снизить стоимость одной самой дорогой позиции на следующий класс ниже.')
    const mostExpensive = Object.values(selectedRecordsByCategory).filter(Boolean).sort((a, b) => (b.price || 0) - (a.price || 0))[0]
    if (mostExpensive) {
      const alternative = nearestByPrice(getCategoryRecords(mostExpensive.categoryKey), (mostExpensive.price || 0) * 0.85)
      if (alternative) fixesNoBudgetIncrease.push(`Заменить ${mostExpensive.name} на ${alternative.name} чтобы вернуться в лимит.`)
    }
  }

  if (issues.length === 0) {
    fixesMinimal.push('Критичных проблем не найдено, можно оставить текущий набор.')
    fixesOptimal.push('Для апгрейда в будущем держите запас по БП и охлаждению.')
    fixesNoBudgetIncrease.push('Без увеличения бюджета сборка уже выглядит сбалансированной.')
  }

  return {
    issues,
    fixes: {
      minimal: fixesMinimal,
      optimal: fixesOptimal,
      noBudgetIncrease: fixesNoBudgetIncrease
    }
  }
}

function performanceScore(record) {
  if (!record) return 0
  const cores = parseNumeric(record?.specs?.Ядра || record?.specs?.Потоки)
  const freq = parseNumeric(record?.specs?.Частота || record?.specs?.['Базовая частота'])
  const cache = parseNumeric(record?.specs?.Кэш || record?.specs?.['Кэш L3'])
  return (cores * 3) + freq + (cache * 0.08)
}

function powerScore(record) {
  if (!record) return 0
  return parseNumeric(record?.specs?.TDP || record?.specs?.Энергопотребление)
}

function upgradeScore(record) {
  if (!record) return 0
  const generation = parseNumeric(record?.specs?.Поколение || record?.specs?.['Год выхода'])
  const cores = parseNumeric(record?.specs?.Ядра || record?.specs?.Потоки)
  return (generation * 0.7) + (cores * 0.3)
}

function sumBy(records, scorer) {
  return records.reduce((sum, record) => sum + scorer(record), 0)
}

export function compareBuilds({ buildAByCategory, buildBByCategory, categoryOrder }) {
  const recordsA = categoryOrder.map((key) => buildAByCategory[key]).filter(Boolean)
  const recordsB = categoryOrder.map((key) => buildBByCategory[key]).filter(Boolean)

  const totalPriceA = recordsA.reduce((sum, record) => sum + (record.price || 0), 0)
  const totalPriceB = recordsB.reduce((sum, record) => sum + (record.price || 0), 0)
  const perfA = sumBy(recordsA, performanceScore)
  const perfB = sumBy(recordsB, performanceScore)
  const powerA = sumBy(recordsA, powerScore)
  const powerB = sumBy(recordsB, powerScore)
  const upgradeA = sumBy(recordsA, upgradeScore)
  const upgradeB = sumBy(recordsB, upgradeScore)

  const changes = categoryOrder
    .map((categoryKey) => ({
      categoryKey,
      left: buildAByCategory[categoryKey] || null,
      right: buildBByCategory[categoryKey] || null
    }))
    .filter((entry) => entry.left?.id !== entry.right?.id)

  return {
    delta: {
      price: totalPriceB - totalPriceA,
      performance: perfB - perfA,
      power: powerB - powerA,
      upgrade: upgradeB - upgradeA
    },
    totals: {
      buildA: { price: totalPriceA, performance: perfA, power: powerA, upgrade: upgradeA },
      buildB: { price: totalPriceB, performance: perfB, power: powerB, upgrade: upgradeB }
    },
    changes
  }
}
