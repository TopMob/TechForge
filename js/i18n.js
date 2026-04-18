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
