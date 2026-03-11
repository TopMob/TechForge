function parseNumeric(value) {
  const match = String(value || '').replace(',', '.').match(/\d+(?:\.\d+)?/)
  if (!match) return 0
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : 0
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
