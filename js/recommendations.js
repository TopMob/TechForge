function asNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function buildRecommendations({ selectedRecords, totalPrice, budgetValue, compatibility }) {
  const recommendations = []

  if (compatibility.issues.length === 0) {
    recommendations.push('Критичных конфликтов совместимости не найдено.')
  } else {
    recommendations.push(...compatibility.issues)
  }

  if (compatibility.warnings?.length) recommendations.push(...compatibility.warnings)
  recommendations.push(`Статус совместимости: ${compatibility.quality}.`)

  if (budgetValue > 0) {
    const delta = totalPrice - budgetValue
    if (delta > 0) recommendations.push(`Сборка превышает бюджет на ${Math.round(delta)} руб.`) 
    if (delta < 0) recommendations.push(`До лимита бюджета остаётся ${Math.round(Math.abs(delta))} руб.`) 
    if (delta === 0) recommendations.push('Сборка идеально попадает в бюджет.')
  }

  const withoutPrice = selectedRecords.filter((record) => !record.price)
  if (withoutPrice.length > 0) recommendations.push(`Нет цен у ${withoutPrice.length} выбранных компонентов, итог может быть занижен.`)

  if (compatibility.recommendedPower > 0) {
    recommendations.push(`Оценка энергопотребления процессора и видеокарты: ${compatibility.estimatedPower} Вт, рекомендованный БП: от ${compatibility.recommendedPower} Вт.`)
  }

  return recommendations
}

export function buildComparisonInsights(firstRecord, secondRecord) {
  if (!firstRecord || !secondRecord) return []

  const insights = []
  if (asNumber(firstRecord.price) > 0 && asNumber(secondRecord.price) > 0) {
    const first = asNumber(firstRecord.price)
    const second = asNumber(secondRecord.price)
    if (first < second) insights.push(`${firstRecord.name} дешевле на ${Math.round(second - first)} руб.`)
    if (second < first) insights.push(`${secondRecord.name} дешевле на ${Math.round(first - second)} руб.`)
    if (first === second) insights.push('Цены моделей совпадают.')
  }

  const firstSpecs = Object.values(firstRecord.specs || {}).filter(Boolean).length
  const secondSpecs = Object.values(secondRecord.specs || {}).filter(Boolean).length
  if (firstSpecs > secondSpecs) insights.push(`${firstRecord.name} имеет более полное заполнение характеристик.`)
  if (secondSpecs > firstSpecs) insights.push(`${secondRecord.name} имеет более полное заполнение характеристик.`)

  return insights
}
