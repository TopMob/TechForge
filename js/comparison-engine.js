function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function parseNumber(raw) {
  const match = normalizeText(raw).replace(',', '.').match(/-?\d+(?:\.\d+)?/)
  if (!match) return null
  const value = Number(match[0])
  return Number.isFinite(value) ? value : null
}

function parsePrice(record) {
  const value = Number(record?.price)
  return Number.isFinite(value) && value > 0 ? value : null
}

function parseSpecValue(specName, specValue) {
  const key = normalizeText(specName).toLowerCase()
  const text = normalizeText(specValue)
  if (!text) return { type: 'text', value: null }

  if (key.includes('сокет')) return { type: 'platform', value: text }
  if (key.includes('tdp') || key.includes('энергопотреб')) return { type: 'number_low_better', value: parseNumber(text), unit: 'W' }
  if (key.includes('цена')) return { type: 'number_low_better', value: parseNumber(text), unit: 'RUB' }
  if (key.includes('яд') || key.includes('частот') || key.includes('кэш') || key.includes('объем') || key.includes('скорост')) {
    return { type: 'number_high_better', value: parseNumber(text) }
  }
  if (key.includes('год') || key.includes('покол')) return { type: 'number_high_better', value: parseNumber(text) }
  return { type: 'text', value: text }
}

function compareNormalized(left, right) {
  if (left.type === 'number_low_better' && left.value !== null && right.value !== null) {
    if (left.value < right.value) return 'left'
    if (right.value < left.value) return 'right'
    return 'equal'
  }
  if (left.type === 'number_high_better' && left.value !== null && right.value !== null) {
    if (left.value > right.value) return 'left'
    if (right.value > left.value) return 'right'
    return 'equal'
  }
  if (left.type === 'platform' && right.type === 'platform') return 'neutral'
  if (normalizeText(left.value) === normalizeText(right.value)) return 'equal'
  return 'neutral'
}

function collectSpecNames(firstRecord, secondRecord) {
  const set = new Set()
  for (const key of Object.keys(firstRecord?.specs || {})) if (normalizeText(firstRecord.specs[key])) set.add(key)
  for (const key of Object.keys(secondRecord?.specs || {})) if (normalizeText(secondRecord.specs[key])) set.add(key)
  return Array.from(set)
}

export function buildSemanticComparison(firstRecord, secondRecord, mode = 'all') {
  const specs = collectSpecNames(firstRecord, secondRecord)
  const rows = []
  let leftWins = 0
  let rightWins = 0

  for (const specName of specs) {
    const firstRaw = normalizeText(firstRecord?.specs?.[specName])
    const secondRaw = normalizeText(secondRecord?.specs?.[specName])
    const firstParsed = parseSpecValue(specName, firstRaw)
    const secondParsed = parseSpecValue(specName, secondRaw)
    const status = compareNormalized(firstParsed, secondParsed)
    if (status === 'left') leftWins += 1
    if (status === 'right') rightWins += 1

    const row = {
      name: specName,
      firstValue: firstRaw || '—',
      secondValue: secondRaw || '—',
      status
    }

    if (mode === 'differences' && status === 'equal') continue
    if (mode === 'first_advantages' && status !== 'left') continue
    if (mode === 'second_advantages' && status !== 'right') continue
    rows.push(row)
  }

  return {
    rows,
    summary: {
      leftWins,
      rightWins,
      totalCompared: leftWins + rightWins
    }
  }
}

export function buildComparisonNarrative(firstRecord, secondRecord, semantic) {
  if (!firstRecord || !secondRecord) return []
  const insights = []
  const firstPrice = parsePrice(firstRecord)
  const secondPrice = parsePrice(secondRecord)
  if (firstPrice && secondPrice) {
    if (firstPrice < secondPrice) insights.push(`${firstRecord.name} выгоднее по цене на ${Math.round(secondPrice - firstPrice)} ₽.`)
    if (secondPrice < firstPrice) insights.push(`${secondRecord.name} выгоднее по цене на ${Math.round(firstPrice - secondPrice)} ₽.`)
  }

  const firstTdp = parseSpecValue('TDP', firstRecord?.specs?.TDP || firstRecord?.specs?.Энергопотребление)
  const secondTdp = parseSpecValue('TDP', secondRecord?.specs?.TDP || secondRecord?.specs?.Энергопотребление)
  if (firstTdp.value !== null && secondTdp.value !== null) {
    if (firstTdp.value < secondTdp.value) insights.push(`${firstRecord.name} потенциально холоднее и тише по энергопакету.`)
    if (secondTdp.value < firstTdp.value) insights.push(`${secondRecord.name} потенциально холоднее и тише по энергопакету.`)
  }

  if (semantic.summary.leftWins > semantic.summary.rightWins) insights.push(`${firstRecord.name} сильнее по количеству ключевых преимуществ (${semantic.summary.leftWins} vs ${semantic.summary.rightWins}).`)
  if (semantic.summary.rightWins > semantic.summary.leftWins) insights.push(`${secondRecord.name} сильнее по количеству ключевых преимуществ (${semantic.summary.rightWins} vs ${semantic.summary.leftWins}).`)
  if (semantic.summary.totalCompared === 0) insights.push('Недостаточно нормализуемых числовых параметров для строгого вывода.')

  const firstSocket = normalizeText(firstRecord?.specs?.Сокет)
  const secondSocket = normalizeText(secondRecord?.specs?.Сокет)
  if (firstSocket && secondSocket && firstSocket !== secondSocket) insights.push(`Платформы различаются (${firstSocket} vs ${secondSocket}), это влияет на путь апгрейда.`)
  return insights
}

function safe(value) {
  return Number.isFinite(value) ? value : 0
}

function extractScoreSignals(record) {
  const price = parsePrice(record) || 0
  const tdp = parseSpecValue('TDP', record?.specs?.TDP || record?.specs?.Энергопотребление).value || 0
  const cores = parseSpecValue('Ядра', record?.specs?.Ядра || record?.specs?.Потоки).value || 0
  const frequency = parseSpecValue('Частота', record?.specs?.Частота || record?.specs?.['Базовая частота']).value || 0
  const cache = parseSpecValue('Кэш', record?.specs?.Кэш || record?.specs?.['Кэш L3']).value || 0
  const generation = parseSpecValue('Поколение', record?.specs?.Поколение || record?.specs?.['Год выхода']).value || 0
  return { price, tdp, cores, frequency, cache, generation }
}

const rankingProfiles = {
  gaming: { performance: 0.45, value: 0.2, efficiency: 0.1, platform: 0.15, upgrade: 0.1 },
  budget: { performance: 0.2, value: 0.45, efficiency: 0.15, platform: 0.05, upgrade: 0.15 },
  quiet: { performance: 0.2, value: 0.15, efficiency: 0.4, platform: 0.1, upgrade: 0.15 },
  upgrade: { performance: 0.2, value: 0.1, efficiency: 0.1, platform: 0.25, upgrade: 0.35 },
  balanced: { performance: 0.3, value: 0.25, efficiency: 0.15, platform: 0.15, upgrade: 0.15 }
}

function normalizeRank(value, min, max, reverse = false) {
  if (max === min) return 0.5
  const scaled = (value - min) / (max - min)
  return reverse ? 1 - scaled : scaled
}

export function getRankingProfiles() {
  return Object.keys(rankingProfiles)
}

export function rankBestChoices(records, profileKey, budgetLimit = 0, maxItems = 5) {
  const profile = rankingProfiles[profileKey] || rankingProfiles.balanced
  const source = records.filter((item) => !budgetLimit || (item.price && item.price <= budgetLimit))
  if (source.length === 0) return []
  const signals = source.map((record) => ({ record, signal: extractScoreSignals(record) }))

  const bounds = {
    performance: [Math.min(...signals.map((x) => safe(x.signal.cores * 2 + x.signal.frequency + x.signal.cache * 0.1))), Math.max(...signals.map((x) => safe(x.signal.cores * 2 + x.signal.frequency + x.signal.cache * 0.1)))],
    value: [Math.min(...signals.map((x) => safe(x.signal.price / Math.max(1, x.signal.cores + x.signal.frequency)))), Math.max(...signals.map((x) => safe(x.signal.price / Math.max(1, x.signal.cores + x.signal.frequency))))],
    efficiency: [Math.min(...signals.map((x) => safe(x.signal.tdp))), Math.max(...signals.map((x) => safe(x.signal.tdp)))],
    platform: [Math.min(...signals.map((x) => safe(x.signal.generation))), Math.max(...signals.map((x) => safe(x.signal.generation)))],
    upgrade: [Math.min(...signals.map((x) => safe((x.signal.generation * 0.7) + (x.signal.cores * 0.3)))), Math.max(...signals.map((x) => safe((x.signal.generation * 0.7) + (x.signal.cores * 0.3))))]
  }

  return signals
    .map((entry) => {
      const perfSignal = safe(entry.signal.cores * 2 + entry.signal.frequency + entry.signal.cache * 0.1)
      const valueSignal = safe(entry.signal.price / Math.max(1, entry.signal.cores + entry.signal.frequency))
      const efficiencySignal = safe(entry.signal.tdp)
      const platformSignal = safe(entry.signal.generation)
      const upgradeSignal = safe((entry.signal.generation * 0.7) + (entry.signal.cores * 0.3))
      const score =
        normalizeRank(perfSignal, ...bounds.performance) * profile.performance +
        normalizeRank(valueSignal, ...bounds.value, true) * profile.value +
        normalizeRank(efficiencySignal, ...bounds.efficiency, true) * profile.efficiency +
        normalizeRank(platformSignal, ...bounds.platform) * profile.platform +
        normalizeRank(upgradeSignal, ...bounds.upgrade) * profile.upgrade
      return { record: entry.record, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems)
}
