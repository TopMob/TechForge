export function renderDashboardMetrics({ container, categories, categorySettings, selectedConfigurationByCategory, getRecordById, formatPrice, configuratorCategoryOrder }) {
  if (!container) return

  const totalComponents = categories.reduce((sum, categoryKey) => sum + (categorySettings[categoryKey]?.count || 0), 0)
  const selectedRecords = configuratorCategoryOrder
    .map((categoryKey) => getRecordById(categoryKey, selectedConfigurationByCategory[categoryKey]))
    .filter(Boolean)

  const selectedCount = selectedRecords.length
  const totalCost = selectedRecords.reduce((sum, record) => sum + (record.price || 0), 0)
  const pricedCount = selectedRecords.filter((record) => Boolean(record.price)).length

  container.innerHTML = [
    { label: 'Компонентов в базе', value: String(totalComponents) },
    { label: 'Категорий', value: String(categories.length) },
    { label: 'Выбрано в сборке', value: String(selectedCount) },
    { label: 'Позиции с ценой', value: String(pricedCount) },
    { label: 'Текущая стоимость', value: totalCost > 0 ? formatPrice(totalCost) : 'нет данных' }
  ]
    .map((metric) => `<article class="metric-card"><p class="metric-label">${metric.label}</p><p class="metric-value">${metric.value}</p></article>`)
    .join('')
}
