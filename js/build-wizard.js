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
