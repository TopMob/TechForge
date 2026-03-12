function asNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function isEnglish() {
  return document.documentElement.lang === 'en'
}

export function buildRecommendations({ selectedRecords, totalPrice, budgetValue, compatibility }) {
  const recommendations = []

  if (compatibility.issues.length === 0) {
    recommendations.push(isEnglish() ? 'No critical compatibility conflicts found.' : 'Критичных конфликтов совместимости не найдено.')
  } else {
    recommendations.push(...compatibility.issues)
  }

  if (compatibility.warnings?.length) recommendations.push(...compatibility.warnings)
  recommendations.push(isEnglish() ? `Compatibility status: ${compatibility.quality}.` : `Статус совместимости: ${compatibility.quality}.`)

  if (budgetValue > 0) {
    const delta = totalPrice - budgetValue
    if (delta > 0) recommendations.push(isEnglish() ? `Build exceeds budget by ${Math.round(delta)} RUB.` : `Сборка превышает бюджет на ${Math.round(delta)} руб.`)
    if (delta < 0) recommendations.push(isEnglish() ? `${Math.round(Math.abs(delta))} RUB remaining to budget limit.` : `До лимита бюджета остаётся ${Math.round(Math.abs(delta))} руб.`)
    if (delta === 0) recommendations.push(isEnglish() ? 'Build perfectly matches the budget.' : 'Сборка идеально попадает в бюджет.')
  }

  const withoutPrice = selectedRecords.filter((record) => !record.price)
  if (withoutPrice.length > 0) recommendations.push(isEnglish() ? `No price for ${withoutPrice.length} selected components, total may be underestimated.` : `Нет цен у ${withoutPrice.length} выбранных компонентов, итог может быть занижен.`)

  if (compatibility.recommendedPower > 0) {
    recommendations.push(isEnglish() ? `Estimated CPU/GPU power: ${compatibility.estimatedPower} W, recommended PSU: from ${compatibility.recommendedPower} W.` : `Оценка энергопотребления процессора и видеокарты: ${compatibility.estimatedPower} Вт, рекомендованный БП: от ${compatibility.recommendedPower} Вт.`)
  }

  return recommendations
}

export function buildComparisonInsights(firstRecord, secondRecord) {
  if (!firstRecord || !secondRecord) return []

  const insights = []
  if (asNumber(firstRecord.price) > 0 && asNumber(secondRecord.price) > 0) {
    const first = asNumber(firstRecord.price)
    const second = asNumber(secondRecord.price)
    if (first < second) insights.push(isEnglish() ? `${firstRecord.name} is cheaper by ${Math.round(second - first)} RUB.` : `${firstRecord.name} дешевле на ${Math.round(second - first)} руб.`)
    if (second < first) insights.push(isEnglish() ? `${secondRecord.name} is cheaper by ${Math.round(first - second)} RUB.` : `${secondRecord.name} дешевле на ${Math.round(first - second)} руб.`)
    if (first === second) insights.push(isEnglish() ? 'Model prices are equal.' : 'Цены моделей совпадают.')
  }

  const firstSpecs = Object.values(firstRecord.specs || {}).filter(Boolean).length
  const secondSpecs = Object.values(secondRecord.specs || {}).filter(Boolean).length
  if (firstSpecs > secondSpecs) insights.push(isEnglish() ? `${firstRecord.name} has more complete specifications.` : `${firstRecord.name} имеет более полное заполнение характеристик.`)
  if (secondSpecs > firstSpecs) insights.push(isEnglish() ? `${secondRecord.name} has more complete specifications.` : `${secondRecord.name} имеет более полное заполнение характеристик.`)

  return insights
}
