function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

export function parseUrlState() {
  const params = new URLSearchParams(window.location.search)
  const selected = {}
  for (const [key, value] of params.entries()) {
    if (!key.startsWith('cfg_')) continue
    selected[key.replace('cfg_', '')] = normalizeText(value)
  }
  return {
    tab: normalizeText(params.get('tab')),
    compareCategory: normalizeText(params.get('category')),
    compareA: normalizeText(params.get('a')),
    compareB: normalizeText(params.get('b')),
    budget: normalizeText(params.get('budget')),
    compareMode: normalizeText(params.get('compareMode')),
    bestProfile: normalizeText(params.get('bestProfile')),
    wizardBudget: normalizeText(params.get('wBudget')),
    wizardScenario: normalizeText(params.get('wScenario')),
    wizardPriority: normalizeText(params.get('wPriority')),
    selectedConfigurationByCategory: selected
  }
}

export function pushUrlState(state) {
  const params = new URLSearchParams()
  if (state.activeMainTab) params.set('tab', state.activeMainTab)
  if (state.activeComparisonCategory) params.set('category', state.activeComparisonCategory)
  if (state.comparisonInput?.first) params.set('a', state.comparisonInput.first)
  if (state.comparisonInput?.second) params.set('b', state.comparisonInput.second)
  if (state.budgetValue) params.set('budget', state.budgetValue)
  if (state.comparisonMode) params.set('compareMode', state.comparisonMode)
  if (state.bestChoiceProfile) params.set('bestProfile', state.bestChoiceProfile)
  if (state.wizard?.budgetValue) params.set('wBudget', state.wizard.budgetValue)
  if (state.wizard?.scenario) params.set('wScenario', state.wizard.scenario)
  if (state.wizard?.priority) params.set('wPriority', state.wizard.priority)

  for (const [category, id] of Object.entries(state.selectedConfigurationByCategory || {})) {
    if (id) params.set(`cfg_${category}`, id)
  }

  const next = `${window.location.pathname}?${params.toString()}`
  window.history.replaceState(null, '', next)
  return window.location.href
}
