const translations = {
  ru: {
    languageLabel: 'Язык',
    tabComparison: 'Сравнение',
    tabConfigurator: 'Конфигуратор',
    tabDiagnostics: 'Диагностика',
    tabGuide: 'Инструкция',
    headerStatus: 'Современный подбор и сравнение комплектующих',
    comparisonTitle: 'Сравнение компонентов',
    comparisonSubtitle: 'Выберите категорию и сравните две модели по цене и характеристикам.',
    firstModel: 'Первая модель',
    secondModel: 'Вторая модель',
    enterModel: 'Введите модель',
    comparisonMode: 'Режим сравнения',
    modeAll: 'Все параметры',
    modeDiff: 'Только различия',
    modeFirst: 'Преимущества первой',
    modeSecond: 'Преимущества второй',
    bestProfile: 'Профиль лучшего выбора',
    shareLink: 'Поделиться ссылкой',
    configuratorTitle: 'Конфигуратор ПК',
    configuratorSubtitle: 'Подберите комплектующие, сохраните сборку и сразу увидите итоговую стоимость.',
    reset: 'Сбросить выбор',
    exportJson: 'Экспорт JSON',
    importJson: 'Импорт JSON',
    diagnosticsTitle: 'Тесты и диагностика ПК',
    diagnosticsSubtitle: 'Проверка клавиатуры и мыши, оценка сборки, тест периферии и прогноз по играм.',
    guideTitle: 'Инструкция по сборке ПК',
    guideSubtitle: 'Базовый порядок действий перед первым запуском.',
    firebaseTitle: 'Добавление компонентов в Firebase',
    firebaseSubtitle: 'Вносите и редактируйте компоненты во вкладке Firebase. Записи сохраняются в Firestore в структуру PC/Категория/components/Название.',
    sharedStateText: 'Состояние сравнения и сборки',
    sharedCopied: 'Ссылка на текущее состояние скопирована в буфер обмена.',
    category_gpu: 'Видеокарты',
    category_cpu: 'Процессоры',
    category_ram: 'Оперативная память',
    category_ssd: 'SSD',
    category_motherboard: 'Материнские платы',
    category_power_supply: 'Блоки питания',
    category_case: 'Корпуса',
    category_cooler: 'Охлаждение'
  },
  en: {
    languageLabel: 'Language',
    tabComparison: 'Comparison',
    tabConfigurator: 'Configurator',
    tabDiagnostics: 'Diagnostics',
    tabGuide: 'Guide',
    headerStatus: 'Modern PC component selection and comparison',
    comparisonTitle: 'Component Comparison',
    comparisonSubtitle: 'Pick a category and compare two models by price and specifications.',
    firstModel: 'First model',
    secondModel: 'Second model',
    enterModel: 'Enter model',
    comparisonMode: 'Comparison mode',
    modeAll: 'All parameters',
    modeDiff: 'Differences only',
    modeFirst: 'First model advantages',
    modeSecond: 'Second model advantages',
    bestProfile: 'Best choice profile',
    shareLink: 'Share link',
    configuratorTitle: 'PC Configurator',
    configuratorSubtitle: 'Choose components, save your build, and instantly see the total cost.',
    reset: 'Reset selection',
    exportJson: 'Export JSON',
    importJson: 'Import JSON',
    diagnosticsTitle: 'PC Tests & Diagnostics',
    diagnosticsSubtitle: 'Keyboard and mouse checks, build evaluation, peripherals testing, and game forecasts.',
    guideTitle: 'PC Build Guide',
    guideSubtitle: 'Basic steps before first boot.',
    firebaseTitle: 'Add Components to Firebase',
    firebaseSubtitle: 'Create and edit components in the Firebase tab. Records are saved in Firestore under PC/Category/components/Name.',
    sharedStateText: 'Comparison and build state',
    sharedCopied: 'Current state link copied to clipboard.',
    category_gpu: 'Graphics Cards',
    category_cpu: 'Processors',
    category_ram: 'Memory',
    category_ssd: 'SSD',
    category_motherboard: 'Motherboards',
    category_power_supply: 'Power Supplies',
    category_case: 'Cases',
    category_cooler: 'Cooling'
  }
}

let currentLanguage = localStorage.getItem('techforge_language') || 'ru'

if (!translations[currentLanguage]) currentLanguage = 'ru'

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

function parseWatts(value) {
  const match = String(value || '').match(/(\d+(?:[.,]\d+)?)/)
  if (!match) return 0
  return Number(match[1].replace(',', '.')) || 0
}

function normalizeLower(value) {
  return String(value || '').trim().toLowerCase()
}

function isEnglish() {
  return document.documentElement.lang === 'en'
}

function safe(value) {
  return Number.isFinite(value) ? value : 0
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

export function getLanguage() {
  return currentLanguage
}

export function setLanguage(language) {
  if (!translations[language]) return
  currentLanguage = language
  localStorage.setItem('techforge_language', language)
  document.documentElement.lang = language
}

export function t(key) {
  return translations[currentLanguage][key] || translations.ru[key] || key
}

export function formatPrice(priceValue) {
  const locale = currentLanguage === 'en' ? 'en-US' : 'ru-RU'
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(Math.round(priceValue))
}

export function getCategoryTitle(categoryKey) {
  return t(`category_${categoryKey}`)
}

export function applyStaticTranslations() {
  const assignments = [
    ['#language-label', 'languageLabel'],
    ['.main-tab[data-main-tab="comparison"]', 'tabComparison'],
    ['.main-tab[data-main-tab="configurator"]', 'tabConfigurator'],
    ['.main-tab[data-main-tab="diagnostics"]', 'tabDiagnostics'],
    ['.main-tab[data-main-tab="guide"]', 'tabGuide'],
    ['.application-status', 'headerStatus'],
    ['[data-main-panel="comparison"] .panel-header h2', 'comparisonTitle'],
    ['[data-main-panel="comparison"] .panel-header p', 'comparisonSubtitle'],
    ['label[for="comparison-first-options"], .comparison-selectors label:nth-child(1)', 'firstModel'],
    ['label[for="comparison-second-options"], .comparison-selectors label:nth-child(2)', 'secondModel'],
    ['.comparison-actions label:nth-child(2)', 'comparisonMode'],
    ['.comparison-actions label:nth-child(3)', 'bestProfile'],
    ['#share-state', 'shareLink'],
    ['[data-main-panel="configurator"] .panel-header h2', 'configuratorTitle'],
    ['[data-main-panel="configurator"] .panel-header p', 'configuratorSubtitle'],
    ['#configurator-reset', 'reset'],
    ['#export-build', 'exportJson'],
    ['#import-build', 'importJson'],
    ['[data-main-panel="diagnostics"] .panel-header h2', 'diagnosticsTitle'],
    ['[data-main-panel="diagnostics"] .panel-header p', 'diagnosticsSubtitle'],
    ['[data-main-panel="guide"] .panel-header h2', 'guideTitle'],
    ['[data-main-panel="guide"] .panel-header p', 'guideSubtitle'],
    ['[data-main-panel="firebase"] .panel-header h2', 'firebaseTitle']
  ]

  for (const [selector, key] of assignments) {
    const element = document.querySelector(selector)
    if (element) element.childNodes[0].nodeValue = t(key)
  }

  const firstInput = document.getElementById('comparison-first-input')
  const secondInput = document.getElementById('comparison-second-input')
  if (firstInput) firstInput.placeholder = t('enterModel')
  if (secondInput) secondInput.placeholder = t('enterModel')

  const modeOptions = {
    all: 'modeAll',
    differences: 'modeDiff',
    first_advantages: 'modeFirst',
    second_advantages: 'modeSecond'
  }
  const select = document.getElementById('comparison-mode')
  if (select) {
    for (const option of select.options) {
      if (modeOptions[option.value]) option.textContent = t(modeOptions[option.value])
    }
  }
}

export function evaluateCompatibility({ getRecordById, selectedConfigurationByCategory }) {
  const issues = []
  const warnings = []
  const notes = []
  const cpu = getRecordById('cpu', selectedConfigurationByCategory.cpu)
  const motherboard = getRecordById('motherboard', selectedConfigurationByCategory.motherboard)
  const gpu = getRecordById('gpu', selectedConfigurationByCategory.gpu)
  const psu = getRecordById('power_supply', selectedConfigurationByCategory.power_supply)
  const ram = getRecordById('ram', selectedConfigurationByCategory.ram)
  const cooler = getRecordById('cooler', selectedConfigurationByCategory.cooler)

  if (cpu && motherboard) {
    const cpuSocket = normalizeLower(cpu.specs.Сокет)
    const mbSocket = normalizeLower(motherboard.specs.Сокет)
    if (cpuSocket && mbSocket && cpuSocket !== mbSocket) issues.push(`Сокет процессора (${cpu.specs.Сокет}) не совпадает с сокетом материнской платы (${motherboard.specs.Сокет}).`)
    else if (cpuSocket && mbSocket) notes.push('Пара CPU и материнской платы совместима по сокету.')
  }

  const cpuTdp = parseWatts(cpu?.specs?.TDP)
  const gpuTdp = parseWatts(gpu?.specs?.Энергопотребление)
  const psuPower = parseWatts(psu?.specs?.Мощность)
  const recommendedPower = Math.round((cpuTdp + gpuTdp) * 1.45)

  if (psuPower > 0 && recommendedPower > 0) {
    if (psuPower < recommendedPower) {
      const margin = psuPower / recommendedPower
      if (margin < 0.9) issues.push(`Мощности БП недостаточно: ${psuPower} Вт при рекомендации от ${recommendedPower} Вт.`)
      else warnings.push(`БП впритык: ${psuPower} Вт при рекомендации от ${recommendedPower} Вт.`)
    } else {
      notes.push('Запас мощности БП достаточный.')
    }
  }

  const coolerTdp = parseWatts(cooler?.specs?.TDP)
  if (cooler && cpuTdp > 0 && coolerTdp > 0 && coolerTdp < cpuTdp) issues.push(`Кулер может быть слабым: TDP кулера ${coolerTdp} Вт при CPU ${cpuTdp} Вт.`)

  if (cpu && gpu && cpu.price && gpu.price) {
    const ratio = cpu.price / Math.max(gpu.price, 1)
    if (ratio > 2.2) warnings.push('Дисбаланс: процессор сильно дороже видеокарты, возможна потеря FPS/рубль.')
  }

  if (ram) {
    const ramType = normalizeLower(ram.specs.Тип)
    if (ramType && motherboard) {
      const chipset = normalizeLower(motherboard.specs.Чипсет)
      if (ramType === 'ddr5' && chipset.includes('b4')) warnings.push('Проверьте ОЗУ: DDR5 редко совместима со старыми чипсетами B4xx.')
    }
  }

  const quality = issues.length > 0 ? 'плохо' : warnings.length > 0 ? 'условно ок' : 'ок'
  return { quality, issues, warnings, notes, estimatedPower: cpuTdp + gpuTdp, recommendedPower }
}

export function buildRecommendations({ selectedRecords, totalPrice, budgetValue, compatibility }) {
  const recommendations = []

  if (compatibility.issues.length === 0) recommendations.push(isEnglish() ? 'No critical compatibility conflicts found.' : 'Критичных конфликтов совместимости не найдено.')
  else recommendations.push(...compatibility.issues)

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

function parseSpecValue(specName, specValue) {
  const key = normalizeText(specName).toLowerCase()
  const text = normalizeText(specValue)
  if (!text) return { type: 'text', value: null }
  if (key.includes('сокет')) return { type: 'platform', value: text }
  if (key.includes('tdp') || key.includes('энергопотреб')) return { type: 'number_low_better', value: parseNumber(text), unit: 'W' }
  if (key.includes('цена')) return { type: 'number_low_better', value: parseNumber(text), unit: 'RUB' }
  if (key.includes('яд') || key.includes('частот') || key.includes('кэш') || key.includes('объем') || key.includes('скорост')) return { type: 'number_high_better', value: parseNumber(text) }
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

    const row = { name: specName, firstValue: firstRaw || '—', secondValue: secondRaw || '—', status }
    if (mode === 'differences' && status === 'equal') continue
    if (mode === 'first_advantages' && status !== 'left') continue
    if (mode === 'second_advantages' && status !== 'right') continue
    rows.push(row)
  }

  return { rows, summary: { leftWins, rightWins, totalCompared: leftWins + rightWins } }
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
    compareSlotA: normalizeText(params.get('slotA')),
    compareSlotB: normalizeText(params.get('slotB')),
    transformMode: normalizeText(params.get('transform')),
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
  if (state.buildCompare?.slotA) params.set('slotA', state.buildCompare.slotA)
  if (state.buildCompare?.slotB) params.set('slotB', state.buildCompare.slotB)
  if (state.buildCompare?.transformMode) params.set('transform', state.buildCompare.transformMode)

  for (const [category, id] of Object.entries(state.selectedConfigurationByCategory || {})) {
    if (id) params.set(`cfg_${category}`, id)
  }

  const next = `${window.location.pathname}?${params.toString()}`
  window.history.replaceState(null, '', next)
  return window.location.href
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

export function withViewTransition(work) {
  if (document.startViewTransition) return document.startViewTransition(() => work())
  work()
  return null
}

const sourceCatalog = {
  cpu: { path: './BD/CPU/AMD.json', categoryKey: 'cpu' },
  cpu_intel: { path: './BD/CPU/INTEL.json', categoryKey: 'cpu' },
  gpu_nvidia: { path: './BD/GPU/NVIDIA.json', categoryKey: 'gpu' },
  gpu_amd: { path: './BD/GPU/AMD.json', categoryKey: 'gpu' },
  gpu_intel: { path: './BD/GPU/INTEL.json', categoryKey: 'gpu' },
  ram_ddr4: { path: './BD/RAM/ddr4.json', categoryKey: 'ram' },
  ram_ddr5: { path: './BD/RAM/ddr5.json', categoryKey: 'ram' },
  motherboard: { path: './BD/MOTHERBOARDS/motherboards.json', categoryKey: 'motherboard' },
  power_supply: { path: './BD/POWER_SUPPLIES/power_supplies.json', categoryKey: 'power_supply' },
  ssd: { path: './BD/COMPONENTS/ssd.json', categoryKey: 'ssd' },
  case: { path: './BD/COMPONENTS/case.json', categoryKey: 'case' },
  cooler: { path: './BD/COMPONENTS/cooler.json', categoryKey: 'cooler' }
}

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function usdToRub(value) {
  const amount = toNumber(value)
  if (!amount) return null
  return Math.round(amount * 90)
}

function splitVendorModel(name, fallbackVendor = '') {
  const normalizedName = normalizeText(name)
  const parts = normalizedName.split(' ').filter(Boolean)
  const vendor = normalizeText(fallbackVendor || parts[0] || '')
  const model = normalizeText(parts.slice(vendor ? 1 : 0).join(' '))
  return { vendor, model: model || normalizedName }
}

function extractCollection(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.records)) return payload.records
  return []
}

function normalizeCpu(item) {
  const name = normalizeText(item.name)
  if (!name) return null
  const vendor = normalizeText(item.manufacturer || '')
  const split = splitVendorModel(name, vendor)
  const cores = toNumber(item.core_count)
  const threads = toNumber(item.thread_count)
  const baseClock = toNumber(item.core_clock_ghz)
  const boostClock = toNumber(item.boost_clock_ghz)
  const tdp = toNumber(item.tdp_watts)
  return {
    categoryKey: 'cpu',
    name,
    vendor: split.vendor,
    model: split.model,
    price: usdToRub(item.price_last_usd || item.price_usd),
    raw: { vendor: split.vendor, model: split.model, price: usdToRub(item.price_last_usd || item.price_usd) || '', cores: cores || '', threads: threads || '', baseClock: baseClock || '', boostClock: boostClock || '', socket: normalizeText(item.socket), tdp: tdp || '', cache: normalizeText(item.cache), process: normalizeText(item.process_node || item.process), iGpu: normalizeText(item.graphics) ? 'Есть' : '' },
    specs: { Производитель: split.vendor, Модель: split.model, Ядра: cores ? String(cores) : '', Потоки: threads ? String(threads) : '', 'Базовая частота': baseClock ? `${baseClock} ГГц` : '', 'Турбо-частота': boostClock ? `${boostClock} ГГц` : '', Сокет: normalizeText(item.socket), TDP: tdp ? `${tdp} Вт` : '', Кэш: normalizeText(item.cache), Техпроцесс: normalizeText(item.process_node || item.process), iGPU: normalizeText(item.graphics) ? 'Есть' : '' }
  }
}

function normalizeGpu(item) {
  const payload = item.data || item
  const name = normalizeText(payload.name)
  if (!name) return null
  const split = splitVendorModel(name)
  const memory = toNumber(payload.memory || payload.vram_size)
  const coreClock = toNumber(payload.core_clock)
  const boostClock = toNumber(payload.boost_clock)
  const tdp = toNumber(payload.tdp || payload.tgp)
  const length = toNumber(payload.length)
  return {
    categoryKey: 'gpu',
    name,
    vendor: split.vendor,
    model: split.model,
    price: usdToRub(payload.price_last_usd || payload.price),
    raw: { vendor: split.vendor, model: split.model, price: usdToRub(payload.price_last_usd || payload.price) || '', chipset: normalizeText(payload.chipset || payload.architecture), memory: memory || '', memoryType: normalizeText(payload.memory_type || payload.vram_type), memoryBus: normalizeText(payload.memory_bus || payload.bus_width), coreClock: coreClock || '', boostClock: boostClock || '', tdp: tdp || '', length: length || '', connectors: normalizeText(payload.power_connectors) },
    specs: { Производитель: split.vendor, Модель: split.model, Чип: normalizeText(payload.chipset || payload.architecture), Память: memory ? `${memory} ГБ` : '', 'Тип памяти': normalizeText(payload.memory_type || payload.vram_type), 'Шина памяти': normalizeText(payload.memory_bus || payload.bus_width), 'Базовая частота GPU': coreClock ? `${coreClock} МГц` : '', 'Турбо-частота GPU': boostClock ? `${boostClock} МГц` : '', Энергопотребление: tdp ? `${tdp} Вт` : '', 'Длина карты': length ? `${length} мм` : '', 'Разъёмы питания': normalizeText(payload.power_connectors) }
  }
}

function normalizeRam(item, memoryType) {
  const name = normalizeText(item.name)
  if (!name) return null
  const split = splitVendorModel(name)
  const capacity = toNumber(item?.modules?.[0]) && toNumber(item?.modules?.[1]) ? toNumber(item.modules[0]) * toNumber(item.modules[1]) : null
  const modules = toNumber(item?.modules?.[0]) && toNumber(item?.modules?.[1]) ? `${item.modules[0]}x${item.modules[1]}GB` : ''
  const frequency = toNumber(item?.speed?.[1])
  return {
    categoryKey: 'ram',
    name,
    vendor: split.vendor,
    model: split.model,
    price: toNumber(item.price),
    raw: { vendor: split.vendor, model: split.model, price: toNumber(item.price) || '', capacity: capacity || '', modules, type: memoryType, frequency: frequency || '', timings: item.cas_latency ? `CL${item.cas_latency}` : '', voltage: '', profile: '' },
    specs: { Производитель: split.vendor, Модель: split.model, Объем: capacity ? `${capacity} ГБ` : '', Модули: modules, Тип: memoryType, Частота: frequency ? `${frequency} МГц` : '', Тайминги: item.cas_latency ? `CL${item.cas_latency}` : '', Напряжение: '', Профиль: '' }
  }
}

function normalizeMotherboard(item) {
  const name = normalizeText(item.name)
  if (!name) return null
  const split = splitVendorModel(name)
  return {
    categoryKey: 'motherboard',
    name,
    vendor: split.vendor,
    model: split.model,
    price: toNumber(item.price),
    raw: { vendor: split.vendor, model: split.model, price: toNumber(item.price) || '', socket: normalizeText(item.socket), chipset: normalizeText(item.chipset), formFactor: normalizeText(item.form_factor), memoryType: normalizeText(item.memory_type), memorySlots: toNumber(item.memory_slots) || '', maxMemory: toNumber(item.max_memory) || '', pcie: normalizeText(item.pcie), m2slots: toNumber(item.m2slots) || '' },
    specs: { Производитель: split.vendor, Модель: split.model, Сокет: normalizeText(item.socket), Чипсет: normalizeText(item.chipset), Формфактор: normalizeText(item.form_factor), 'Тип ОЗУ': normalizeText(item.memory_type), 'Слоты ОЗУ': normalizeText(item.memory_slots), 'Макс. ОЗУ': toNumber(item.max_memory) ? `${item.max_memory} ГБ` : '', PCIe: normalizeText(item.pcie), 'M.2 слоты': normalizeText(item.m2slots) }
  }
}

function normalizePowerSupply(item) {
  const name = normalizeText(item.name)
  if (!name) return null
  const split = splitVendorModel(name)
  const wattage = toNumber(item.wattage)
  return {
    categoryKey: 'power_supply',
    name,
    vendor: split.vendor,
    model: split.model,
    price: usdToRub(item.price_usd || item.price_last_usd),
    raw: { vendor: split.vendor, model: split.model, price: usdToRub(item.price_usd || item.price_last_usd) || '', wattage: wattage || '', efficiency: normalizeText(item.efficiency_rating), modular: normalizeText(item.is_modular), atxVersion: normalizeText(item.form_factor), fanSize: '' },
    specs: { Производитель: split.vendor, Модель: split.model, Мощность: wattage ? `${wattage} Вт` : '', Сертификат: normalizeText(item.efficiency_rating), Модульность: normalizeText(item.is_modular), Стандарт: normalizeText(item.form_factor), Вентилятор: '' }
  }
}

function normalizeSimpleComponent(item, categoryKey, typeLabel) {
  const name = normalizeText(item.name)
  if (!name) return null
  const split = splitVendorModel(name)
  const specsText = normalizeText(item.specs)
  return {
    categoryKey,
    name,
    vendor: split.vendor,
    model: split.model,
    price: toNumber(item.price),
    raw: { vendor: split.vendor, model: split.model, price: toNumber(item.price) || '', type: typeLabel, size: '', socketSupport: '', noise: '', tdp: '' },
    specs: { Производитель: split.vendor, Модель: split.model, Описание: specsText }
  }
}

function toImportRecord(sourceKey, item) {
  if (sourceKey === 'cpu' || sourceKey === 'cpu_intel') return normalizeCpu(item)
  if (sourceKey.startsWith('gpu')) return normalizeGpu(item)
  if (sourceKey === 'ram_ddr4') return normalizeRam(item, 'DDR4')
  if (sourceKey === 'ram_ddr5') return normalizeRam(item, 'DDR5')
  if (sourceKey === 'motherboard') return normalizeMotherboard(item)
  if (sourceKey === 'power_supply') return normalizePowerSupply(item)
  if (sourceKey === 'ssd') return normalizeSimpleComponent(item, 'ssd', 'SSD')
  if (sourceKey === 'case') return normalizeSimpleComponent(item, 'case', 'Корпус')
  if (sourceKey === 'cooler') return normalizeSimpleComponent(item, 'cooler', 'Кулер')
  return null
}

export const technicalImportOptions = [
  { key: 'cpu', label: 'Technical City · Процессоры AMD' },
  { key: 'cpu_intel', label: 'Technical City · Процессоры Intel' },
  { key: 'gpu_nvidia', label: 'Technical City · Видеокарты NVIDIA' },
  { key: 'gpu_amd', label: 'Technical City · Видеокарты AMD' },
  { key: 'gpu_intel', label: 'Technical City · Видеокарты Intel' },
  { key: 'ram_ddr4', label: 'Technical City · ОЗУ DDR4' },
  { key: 'ram_ddr5', label: 'Technical City · ОЗУ DDR5' },
  { key: 'motherboard', label: 'Technical City · Материнские платы' },
  { key: 'power_supply', label: 'Technical City · Блоки питания' },
  { key: 'ssd', label: 'Technical City · SSD' },
  { key: 'case', label: 'Technical City · Корпуса' },
  { key: 'cooler', label: 'Technical City · Кулеры' }
]

export function createTechnicalImportController() {
  const cache = new Map()

  async function loadRecords(sourceKey) {
    const meta = sourceCatalog[sourceKey]
    if (!meta) return []
    if (cache.has(sourceKey)) return cache.get(sourceKey)

    const response = await fetch(meta.path)
    if (!response.ok) throw new Error(`Источник недоступен: ${meta.path}`)
    const payload = await response.json()
    const collection = extractCollection(payload)

    const recordsByName = new Map()
    for (const item of collection) {
      const record = toImportRecord(sourceKey, item)
      if (!record?.name) continue
      const key = record.name.toLowerCase()
      if (!recordsByName.has(key)) recordsByName.set(key, record)
    }

    const normalized = Array.from(recordsByName.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    cache.set(sourceKey, normalized)
    return normalized
  }

  return {
    loadRecords,
    getTargetCategory: (sourceKey) => sourceCatalog[sourceKey]?.categoryKey || ''
  }
}
