function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function scoreSimilarity(base, candidate) {
  let score = 0
  if (!base || !candidate) return score
  if (base.categoryKey === candidate.categoryKey) score += 2
  if (normalizeText(base.specs?.Сокет) && normalizeText(base.specs?.Сокет) === normalizeText(candidate.specs?.Сокет)) score += 2
  const basePrice = Number(base.price) || 0
  const candidatePrice = Number(candidate.price) || 0
  if (basePrice > 0 && candidatePrice > 0) {
    const ratio = Math.abs(basePrice - candidatePrice) / basePrice
    score += Math.max(0, 2 - ratio * 2)
  }
  return score
}

export function buildRelatedComponents(baseRecord, records) {
  if (!baseRecord) return { similar: [], cheaper: [], better: [] }
  const sameCategory = records.filter((item) => item.categoryKey === baseRecord.categoryKey && item.id !== baseRecord.id)
  const similar = sameCategory
    .map((item) => ({ item, score: scoreSimilarity(baseRecord, item) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.item)

  const basePrice = Number(baseRecord.price) || 0
  const cheaper = sameCategory
    .filter((item) => (Number(item.price) || 0) > 0 && (Number(item.price) || 0) < basePrice)
    .sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))
    .slice(0, 3)

  const better = sameCategory
    .filter((item) => (Number(item.price) || 0) > basePrice)
    .sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))
    .slice(0, 3)

  return { similar, cheaper, better }
}

export function renderComponentCard(container, record, related) {
  if (!container) return
  if (!record) {
    container.innerHTML = '<p class="empty-state">Выберите компонент в сравнении для карточки.</p>'
    return
  }

  const specs = Object.entries(record.specs || {})
    .filter(([, value]) => normalizeText(value))
    .slice(0, 8)
    .map(([name, value]) => `<li><strong>${escapeHtml(name)}:</strong> ${escapeHtml(value)}</li>`)
    .join('')

  const renderList = (title, list) => `<div><h4>${title}</h4><ul>${list.map((item) => `<li data-related-id="${escapeHtml(item.id)}">${escapeHtml(item.name)}</li>`).join('') || '<li>Нет данных</li>'}</ul></div>`

  container.innerHTML = `
    <article class="component-card">
      <h3>${escapeHtml(record.name)}</h3>
      <p>${record.price ? `${Math.round(record.price)} ₽` : 'Цена неизвестна'}</p>
      <ul>${specs || '<li>Характеристики не заполнены</li>'}</ul>
      <div class="component-related-grid">
        ${renderList('Похожие', related.similar)}
        ${renderList('Дешевле', related.cheaper)}
        ${renderList('Альтернативы выше классом', related.better)}
      </div>
    </article>
  `
}
