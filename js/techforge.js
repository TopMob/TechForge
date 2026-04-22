import { saveComponent, watchFirebaseConnection, loadComponentsFromFirebase, loadComponentFromFirebase, deleteComponent } from './firebase.js'
import { saveBuild, loadBuild, deleteBuild, getSlotNames, getAllBuilds, exportBuildPayload, importBuildPayload, getWizardDefaults, buildWizardPlan, buildWizardSummary, auditBuild, compareBuilds } from './build-tools.js'
import { setupDiagnosticsModule } from './diagnostics.js'
import { createTechnicalImportController, technicalImportOptions } from './technical-city-import.js'
import { t, setLanguage, getLanguage, applyStaticTranslations, formatPrice as formatLocalizedPrice, getCategoryTitle } from './app-merged.js'
import { evaluateCompatibility, buildRecommendations, buildSemanticComparison, buildComparisonNarrative, rankBestChoices, getRankingProfiles, parseUrlState, pushUrlState, buildRelatedComponents, renderComponentCard, withViewTransition } from './app-merged.js'
import { firebaseCategoryOptions, renderFirebaseCategoryFields, collectFirebasePayload, setupFirebaseEditor } from './firebase-ui.js'


const categorySettings = {
  gpu: { title: getCategoryTitle('gpu') },
  cpu: { title: getCategoryTitle('cpu') },
  ram: { title: getCategoryTitle('ram') },
  ssd: { title: getCategoryTitle('ssd') },
  motherboard: { title: getCategoryTitle('motherboard') },
  power_supply: { title: getCategoryTitle('power_supply') },
  case: { title: getCategoryTitle('case') },
  cooler: { title: getCategoryTitle('cooler') }
}

const configuratorCategoryOrder = ['cpu', 'motherboard', 'gpu', 'ram', 'ssd', 'power_supply', 'case', 'cooler']



const interfaceElements = {
  mainTabsContainer: document.getElementById('main-tabs'),
  mainPanels: document.querySelectorAll('[data-main-panel]'),
  comparisonCategoryTabs: document.getElementById('comparison-category-tabs'),
  comparisonFirstInput: document.getElementById('comparison-first-input'),
  comparisonSecondInput: document.getElementById('comparison-second-input'),
  comparisonFirstOptions: document.getElementById('comparison-first-options'),
  comparisonSecondOptions: document.getElementById('comparison-second-options'),
  comparisonCount: document.getElementById('comparison-count'),
  comparisonMode: document.getElementById('comparison-mode'),
  bestChoiceProfile: document.getElementById('best-choice-profile'),
  shareStateButton: document.getElementById('share-state'),
  comparisonResult: document.getElementById('comparison-result'),
  wizardBudgetInput: document.getElementById('wizard-budget'),
  wizardScenarioSelect: document.getElementById('wizard-scenario'),
  wizardPrioritySelect: document.getElementById('wizard-priority'),
  wizardApplyButton: document.getElementById('wizard-apply'),
  wizardResult: document.getElementById('wizard-result'),
  buildAuditIssues: document.getElementById('build-audit-issues'),
  buildFixMinimal: document.getElementById('build-fix-minimal'),
  buildFixOptimal: document.getElementById('build-fix-optimal'),
  buildFixBudget: document.getElementById('build-fix-budget'),
  buildCompareSlotA: document.getElementById('build-compare-slot-a'),
  buildCompareSlotB: document.getElementById('build-compare-slot-b'),
  buildCompareRunButton: document.getElementById('build-compare-run'),
  buildCompareResult: document.getElementById('build-compare-result'),
  buildTransformMode: document.getElementById('build-transform-mode'),
  buildTransformRunButton: document.getElementById('build-transform-run'),
  bestChoiceResult: document.getElementById('best-choice-result'),
  componentCard: document.getElementById('component-card'),
  configuratorGrid: document.getElementById('configurator-grid'),
  configuratorResetButton: document.getElementById('configurator-reset'),
  configurationList: document.getElementById('configuration-list'),
  configurationTotal: document.getElementById('configuration-total'),
  configurationWarning: document.getElementById('configuration-warning'),
  firebaseForm: document.getElementById('firebase-component-form'),
  firebaseSpecsContainer: document.getElementById('firebase-specs-container'),
  firebaseStatus: document.getElementById('firebase-status'),
  firebaseConnectionInfo: document.getElementById('firebase-connection-info'),
  firebaseRequiredHint: document.getElementById('firebase-required-hint'),
  firebaseBuildNameButton: document.getElementById('firebase-build-name'),
  firebaseEditorCategory: document.getElementById('firebase-editor-category'),
  firebaseEditorComponent: document.getElementById('firebase-editor-component'),
  firebaseEditorLoadButton: document.getElementById('firebase-editor-load'),
  firebaseEditorUpdateButton: document.getElementById('firebase-editor-update'),
  firebaseEditorDeleteButton: document.getElementById('firebase-editor-delete'),
  comparisonInsights: document.getElementById('comparison-insights'),
  budgetInput: document.getElementById('budget-input'),
  budgetStatus: document.getElementById('budget-status'),
  buildSlotSelect: document.getElementById('build-slot-select'),
  saveBuildButton: document.getElementById('save-build'),
  loadBuildButton: document.getElementById('load-build'),
  deleteBuildButton: document.getElementById('delete-build'),
  exportBuildButton: document.getElementById('export-build'),
  importBuildButton: document.getElementById('import-build'),
  buildStatus: document.getElementById('build-status'),
  recommendationsList: document.getElementById('recommendations-list'),
  diagnosticsRoot: document.getElementById('diagnostics-root'),
  technicalImportSource: document.getElementById('technical-import-source'),
  technicalImportSearch: document.getElementById('technical-import-search'),
  technicalImportComponent: document.getElementById('technical-import-component'),
  technicalImportApplyButton: document.getElementById('technical-import-apply'),
  technicalImportApproveButton: document.getElementById('technical-import-approve'),
  technicalImportStatus: document.getElementById('technical-import-status'),
  technicalImportPreview: document.getElementById('technical-import-preview'),
  languageSelect: document.getElementById('language-select')
}

const applicationState = {
  activeMainTab: 'comparison',
  activeComparisonCategory: 'gpu',
  componentsByCategory: {},
  selectedConfigurationByCategory: {},
  comparisonInput: {
    first: '',
    second: ''
  },
  comparisonSelectionBySide: {
    first: '',
    second: ''
  },
  comparisonMode: 'all',
  bestChoiceProfile: 'balanced',
  wizard: getWizardDefaults(),
  buildCompare: { slotA: '', slotB: '', transformMode: 'cheaper' },
  configuratorSearchByCategory: {},
  budgetValue: '',
  firebaseEditorController: null,
  diagnosticsController: null,
  technicalImportController: createTechnicalImportController(),
  technicalImportRecords: [],
  technicalImportFilteredRecords: [],
  technicalImportSelectedRecordName: ''
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizeNameForDedupe(name) {
  return normalizeText(name)
    .toLowerCase()
    .replace(/[×xх]\s*\d+/gi, '')
    .replace(/\b\d+\s*gb\b/gi, '')
    .replace(/[()\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function parseNumber(value) {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

function createIdentifier(categoryKey, componentName) {
  return `${categoryKey}-${componentName}`.toLowerCase()
}

function formatPrice(priceValue) {
  return formatLocalizedPrice(priceValue)
}

function syncUrlState() {
  pushUrlState(applicationState)
}

async function shareCurrentState() {
  const url = pushUrlState(applicationState)
  if (navigator.share) {
    try {
      await navigator.share({ title: 'TechForge', text: t('sharedStateText'), url })
      return
    } catch {
    }
  }
  await navigator.clipboard.writeText(url)
  interfaceElements.buildStatus.textContent = t('sharedCopied')
}

function getRecordCompleteness(record) {
  const specValues = Object.values(record.specs || {})
  const nonEmptySpecs = specValues.filter((specValue) => normalizeText(specValue)).length
  const hasPrice = record.price ? 1 : 0
  return nonEmptySpecs + hasPrice
}

function buildUniqueList(records, categoryKey) {
  if (categoryKey === 'power_supply') return records

  const recordsByName = new Map()
  for (const record of records) {
    const nameKey = normalizeNameForDedupe(record.name)
    if (!recordsByName.has(nameKey)) {
      recordsByName.set(nameKey, record)
      continue
    }

    const existingRecord = recordsByName.get(nameKey)
    if (getRecordCompleteness(record) > getRecordCompleteness(existingRecord)) {
      recordsByName.set(nameKey, record)
    }
  }
  return Array.from(recordsByName.values())
}

function convertFirebaseRecord(categoryKey, sourceRecord) {
  const componentName = normalizeText(sourceRecord?.name)
  if (!componentName) return null
  return {
    id: createIdentifier(categoryKey, componentName),
    name: componentName,
    categoryKey,
    price: parseNumber(sourceRecord?.price),
    specs: sourceRecord?.specs || {}
  }
}

async function loadCategory(categoryKey) {
  const allRecords = []

  try {
    const firebaseRecords = await loadComponentsFromFirebase(categoryKey)
    for (const firebaseRecord of firebaseRecords) {
      const convertedFirebaseRecord = convertFirebaseRecord(categoryKey, firebaseRecord)
      if (convertedFirebaseRecord) allRecords.push(convertedFirebaseRecord)
    }
  } catch {
  }

  const uniqueRecords = buildUniqueList(allRecords, categoryKey)
  uniqueRecords.sort((leftRecord, rightRecord) => leftRecord.name.localeCompare(rightRecord.name, 'ru'))
  return uniqueRecords
}

function getRecordById(categoryKey, recordId) {
  const records = applicationState.componentsByCategory[categoryKey] || []
  return records.find((record) => record.id === recordId) || null
}

function getCategoryRecords(categoryKey) {
  return applicationState.componentsByCategory[categoryKey] || []
}

function renderWizardPlan() {
  if (!interfaceElements.wizardResult) return
  const plan = buildWizardPlan({
    componentsByCategory: applicationState.componentsByCategory,
    wizardState: applicationState.wizard
  })
  const summary = buildWizardSummary(plan)
  interfaceElements.wizardResult.innerHTML = summary.rows.length === 0
    ? '<p class="comparison-count">Недостаточно данных для автоматического подбора.</p>'
    : `<p class="comparison-count">Черновой план мастера: ${summary.rows.length} позиций · ${summary.total > 0 ? formatPrice(summary.total) : 'без цены'}</p><ul>${summary.rows.map((row) => `<li><strong>${escapeHtml(categorySettings[row.category]?.title || row.category)}:</strong> ${escapeHtml(row.name)}${row.price ? ` · ${escapeHtml(formatPrice(row.price))}` : ''}</li>`).join('')}</ul>`
  return plan
}

function applyWizardPlan() {
  const plan = buildWizardPlan({
    componentsByCategory: applicationState.componentsByCategory,
    wizardState: applicationState.wizard
  })
  const updates = {}
  for (const [categoryKey, record] of Object.entries(plan)) {
    if (!record?.id) continue
    updates[categoryKey] = record.id
  }
  applicationState.selectedConfigurationByCategory = {
    ...applicationState.selectedConfigurationByCategory,
    ...updates
  }
  renderConfigurator()
  renderConfigurationSummary()
  renderWizardPlan()
  syncUrlState()
}

function renderBuildAudit(recordsByCategory, totalPrice) {
  if (!interfaceElements.buildAuditIssues) return
  const audit = auditBuild({
    selectedRecordsByCategory: recordsByCategory,
    budgetValue: applicationState.budgetValue,
    getCategoryRecords
  })
  const issueRows = audit.issues.length > 0
    ? audit.issues
    : ['Критичных проблем не выявлено.']

  interfaceElements.buildAuditIssues.innerHTML = issueRows.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
  interfaceElements.buildFixMinimal.innerHTML = audit.fixes.minimal.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
  interfaceElements.buildFixOptimal.innerHTML = audit.fixes.optimal.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
  interfaceElements.buildFixBudget.innerHTML = audit.fixes.noBudgetIncrease.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
}

function renderMainTabs() {
  const diagnosticsIsActive = applicationState.activeMainTab === 'diagnostics'
  if (!diagnosticsIsActive) applicationState.diagnosticsController?.stopActiveMedia()
  withViewTransition(() => {
    const allMainTabs = interfaceElements.mainTabsContainer.querySelectorAll('[data-main-tab]')
    for (const mainTabButton of allMainTabs) {
      const isActive = mainTabButton.dataset.mainTab === applicationState.activeMainTab
      mainTabButton.classList.toggle('active', isActive)
    }
    for (const mainPanel of interfaceElements.mainPanels) {
      const isActive = mainPanel.dataset.mainPanel === applicationState.activeMainTab
      mainPanel.classList.toggle('active', isActive)
    }
  })
}

function renderComparisonCategoryTabs() {
  interfaceElements.comparisonCategoryTabs.innerHTML = Object.keys(categorySettings)
    .map((categoryKey) => {
      const isActive = categoryKey === applicationState.activeComparisonCategory
      const count = applicationState.componentsByCategory[categoryKey]?.length || 0
      return `<button type="button" class="category-tab ${isActive ? 'active' : ''}" data-comparison-category="${escapeHtml(categoryKey)}">${escapeHtml(categorySettings[categoryKey].title)} <span>${count}</span></button>`
    })
    .join('')
}

function getFilteredRecords(categoryKey, searchValue) {
  const categoryRecords = applicationState.componentsByCategory[categoryKey] || []
  const normalizedSearchValue = normalizeText(searchValue).toLowerCase()

  if (!normalizedSearchValue) return categoryRecords

  return categoryRecords.filter((record) => {
    if (record.name.toLowerCase().includes(normalizedSearchValue)) return true
    return Object.values(record.specs || {}).some((specValue) => normalizeText(specValue).toLowerCase().includes(normalizedSearchValue))
  })
}

const comparisonVisibleLimit = 25

function findRecordIdByExactName(records, searchValue) {
  const normalizedSearchValue = normalizeText(searchValue).toLowerCase()
  if (!normalizedSearchValue) return ''
  const matchedRecord = records.find((record) => record.name.toLowerCase() === normalizedSearchValue)
  return matchedRecord ? matchedRecord.id : ''
}

function buildComparisonDatalist(records, side) {
  const optionsElement = side === 'first' ? interfaceElements.comparisonFirstOptions : interfaceElements.comparisonSecondOptions
  if (!optionsElement) return

  optionsElement.innerHTML = records
    .slice(0, comparisonVisibleLimit)
    .map((record) => `<option value="${escapeHtml(record.name)}"></option>`)
    .join('')
}

function renderComparisonSelectors() {
  const categoryKey = applicationState.activeComparisonCategory
  const firstRecords = getFilteredRecords(categoryKey, applicationState.comparisonInput.first)
  const secondRecords = getFilteredRecords(categoryKey, applicationState.comparisonInput.second)

  const firstSelectedId = findRecordIdByExactName(firstRecords, applicationState.comparisonInput.first) || applicationState.comparisonSelectionBySide.first
  const secondSelectedId = findRecordIdByExactName(secondRecords, applicationState.comparisonInput.second) || applicationState.comparisonSelectionBySide.second

  applicationState.comparisonSelectionBySide.first = firstRecords.some((record) => record.id === firstSelectedId) ? firstSelectedId : ''
  applicationState.comparisonSelectionBySide.second = secondRecords.some((record) => record.id === secondSelectedId) ? secondSelectedId : ''

  buildComparisonDatalist(firstRecords, 'first')
  buildComparisonDatalist(secondRecords, 'second')

  interfaceElements.comparisonCount.textContent = `${Math.min(firstRecords.length, comparisonVisibleLimit)} из ${firstRecords.length} в первой модели · ${Math.min(secondRecords.length, comparisonVisibleLimit)} из ${secondRecords.length} во второй`
  renderBestChoice()

  if (applicationState.comparisonSelectionBySide.first && applicationState.comparisonSelectionBySide.second) {
    renderComparisonTable()
    syncUrlState()
    return
  }

  interfaceElements.comparisonResult.innerHTML = '<p class="empty-state">Введите точное название из списка, чтобы сравнить модели.</p>'
  renderComparisonInsights(null, null)
  renderComponentDetails(null)
  syncUrlState()
}

function renderComparisonTable() {
  const categoryKey = applicationState.activeComparisonCategory
  const firstRecord = getRecordById(categoryKey, applicationState.comparisonSelectionBySide.first)
  const secondRecord = getRecordById(categoryKey, applicationState.comparisonSelectionBySide.second)

  if (!firstRecord || !secondRecord) {
    interfaceElements.comparisonResult.innerHTML = '<p class="empty-state">Недостаточно данных для сравнения выбранной категории.</p>'
    renderComparisonInsights(null, null)
    return
  }

  const semantic = buildSemanticComparison(firstRecord, secondRecord, applicationState.comparisonMode)
  const specRows = semantic.rows
    .map((row) => `<tr><th>${escapeHtml(row.name)}</th><td>${escapeHtml(row.firstValue)}</td><td>${escapeHtml(row.secondValue)}</td></tr>`)
    .join('')

  const priceRow = `<tr><th>Цена</th><td>${firstRecord.price ? escapeHtml(formatPrice(firstRecord.price)) : '—'}</td><td>${secondRecord.price ? escapeHtml(formatPrice(secondRecord.price)) : '—'}</td></tr>`

  interfaceElements.comparisonResult.innerHTML = `<table class="comparison-table"><thead><tr><th>Параметр</th><th>${escapeHtml(firstRecord.name)}</th><th>${escapeHtml(secondRecord.name)}</th></tr></thead><tbody>${priceRow}${specRows || '<tr><th>Результат</th><td colspan="2">В выбранном режиме нет строк для отображения.</td></tr>'}</tbody></table>`
  renderComparisonInsights(firstRecord, secondRecord, semantic)
  renderComponentDetails(firstRecord)
}

function renderConfigurator() {
  interfaceElements.configuratorGrid.innerHTML = configuratorCategoryOrder
    .map((categoryKey) => {
      const searchValue = applicationState.configuratorSearchByCategory[categoryKey] || ''
      const categoryRecords = getFilteredRecords(categoryKey, searchValue)
      const datalistId = `configurator-options-${categoryKey}`
      const optionsMarkup = categoryRecords
        .map((categoryRecord) => {
          const priceLabel = categoryRecord.price ? ` · ${formatPrice(categoryRecord.price)}` : ''
          return `<option value="${escapeHtml(categoryRecord.name)}" label="${escapeHtml(categoryRecord.name + priceLabel)}"></option>`
        })
        .join('')

      return `
        <label class="configurator-field">
          ${escapeHtml(categorySettings[categoryKey].title)}
          <input class="configurator-search" data-configurator-search="${escapeHtml(categoryKey)}" list="${escapeHtml(datalistId)}" type="search" placeholder="Начните писать для выбора компонента" autocomplete="off">
          <datalist id="${escapeHtml(datalistId)}">${optionsMarkup}</datalist>
        </label>
      `
    })
    .join('')

  for (const categoryKey of configuratorCategoryOrder) {
    const selectedRecordId = applicationState.selectedConfigurationByCategory[categoryKey] || ''
    const selectedRecord = getRecordById(categoryKey, selectedRecordId)
    const searchElement = interfaceElements.configuratorGrid.querySelector(`[data-configurator-search="${categoryKey}"]`)
    if (searchElement) {
      searchElement.value = selectedRecord ? selectedRecord.name : (applicationState.configuratorSearchByCategory[categoryKey] || '')
    }
  }
}

function renderConfiguratorOptionsByCategory(categoryKey) {
  const searchValue = applicationState.configuratorSearchByCategory[categoryKey] || ''
  const categoryRecords = getFilteredRecords(categoryKey, searchValue)
  const datalistId = `configurator-options-${categoryKey}`
  const datalistElement = interfaceElements.configuratorGrid.querySelector(`#${datalistId}`)
  if (!datalistElement) return

  datalistElement.innerHTML = categoryRecords
    .map((categoryRecord) => {
      const priceLabel = categoryRecord.price ? ` · ${formatPrice(categoryRecord.price)}` : ''
      return `<option value="${escapeHtml(categoryRecord.name)}" label="${escapeHtml(categoryRecord.name + priceLabel)}"></option>`
    })
    .join('')
}

function validateSocketCompatibility() {
  const processorRecord = getRecordById('cpu', applicationState.selectedConfigurationByCategory.cpu)
  const motherboardRecord = getRecordById('motherboard', applicationState.selectedConfigurationByCategory.motherboard)
  if (!processorRecord || !motherboardRecord) return ''

  const processorSocket = normalizeText(processorRecord.specs.Сокет)
  const motherboardSocket = normalizeText(motherboardRecord.specs.Сокет)
  if (processorSocket && motherboardSocket && processorSocket !== motherboardSocket) {
    return `Сокет процессора (${processorSocket}) не совпадает с сокетом материнской платы (${motherboardSocket}).`
  }
  return ''
}

function renderConfigurationSummary() {
  const summaryItems = []
  const selectedByCategory = {}
  let totalPrice = 0

  for (const categoryKey of configuratorCategoryOrder) {
    const selectedRecord = getRecordById(categoryKey, applicationState.selectedConfigurationByCategory[categoryKey])
    if (!selectedRecord) continue
    selectedByCategory[categoryKey] = selectedRecord
    if (selectedRecord.price) totalPrice += selectedRecord.price
    const priceLabel = selectedRecord.price ? ` · ${formatPrice(selectedRecord.price)}` : ''
    summaryItems.push(`<li><strong>${escapeHtml(categorySettings[categoryKey].title)}:</strong> ${escapeHtml(selectedRecord.name)}${escapeHtml(priceLabel)}</li>`)
  }

  interfaceElements.configurationList.innerHTML = summaryItems.join('') || '<li>Выберите комплектующие в конфигураторе.</li>'
  interfaceElements.configurationTotal.textContent = totalPrice > 0 ? `Общая стоимость: ${formatPrice(totalPrice)}` : 'Общая стоимость: нет данных по ценам'
  const compatibility = evaluateCompatibility({
    getRecordById,
    selectedConfigurationByCategory: applicationState.selectedConfigurationByCategory
  })
  interfaceElements.configurationWarning.textContent = compatibility.issues[0] || compatibility.warnings?.[0] || `Совместимость: ${compatibility.quality}`
  renderBudgetState(totalPrice)
  renderRecommendations(getSelectedRecords(), totalPrice, compatibility)
  renderBuildAudit(selectedByCategory, totalPrice)
}



function renderComparisonInsights(firstRecord, secondRecord, semantic = null) {
  if (!interfaceElements.comparisonInsights) return
  const fallbackSemantic = semantic || buildSemanticComparison(firstRecord, secondRecord, applicationState.comparisonMode)
  const insights = buildComparisonNarrative(firstRecord, secondRecord, fallbackSemantic)
  if (insights.length === 0) {
    interfaceElements.comparisonInsights.innerHTML = '<p class="comparison-count">Инсайты появятся после выбора двух моделей с заполненными данными.</p>'
    return
  }
  interfaceElements.comparisonInsights.innerHTML = `<ul>${insights.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
}

function renderBestChoice() {
  const records = applicationState.componentsByCategory[applicationState.activeComparisonCategory] || []
  const budgetLimit = parseNumber(applicationState.budgetValue) || 0
  const ranked = rankBestChoices(records, applicationState.bestChoiceProfile, budgetLimit, 5)
  if (ranked.length === 0) {
    interfaceElements.bestChoiceResult.innerHTML = '<p class="comparison-count">Нет данных для ранжирования по текущим условиям.</p>'
    return
  }
  interfaceElements.bestChoiceResult.innerHTML = `<h3>Лучший выбор (${escapeHtml(applicationState.bestChoiceProfile)})</h3><ol>${ranked.map((entry) => `<li>${escapeHtml(entry.record.name)} · score ${entry.score.toFixed(3)}${entry.record.price ? ` · ${escapeHtml(formatPrice(entry.record.price))}` : ''}</li>`).join('')}</ol>`
}

function renderComponentDetails(record) {
  const allRecords = Object.values(applicationState.componentsByCategory).flat()
  const related = buildRelatedComponents(record, allRecords)
  withViewTransition(() => renderComponentCard(interfaceElements.componentCard, record, related))
}

function getSelectedRecords() {
  return configuratorCategoryOrder
    .map((categoryKey) => getRecordById(categoryKey, applicationState.selectedConfigurationByCategory[categoryKey]))
    .filter(Boolean)
}

function getTotalPriceForSelectedRecords(records) {
  return records.reduce((sum, record) => sum + (record.price || 0), 0)
}

function renderBudgetState(totalPrice) {
  const budgetValue = parseNumber(applicationState.budgetValue)
  if (!budgetValue) {
    interfaceElements.budgetStatus.textContent = 'Укажите бюджет, чтобы увидеть отклонение.'
    interfaceElements.budgetStatus.className = 'comparison-count'
    return
  }
  const difference = totalPrice - budgetValue
  if (difference > 0) {
    interfaceElements.budgetStatus.textContent = `Перебор бюджета: +${formatPrice(difference)}`
    interfaceElements.budgetStatus.className = 'comparison-count bad-state'
    return
  }
  interfaceElements.budgetStatus.textContent = `Запас бюджета: ${formatPrice(Math.abs(difference))}`
  interfaceElements.budgetStatus.className = 'comparison-count good-state'
}

function renderRecommendations(records, totalPrice, compatibility) {
  const budgetValue = parseNumber(applicationState.budgetValue)
  const recommendations = buildRecommendations({
    selectedRecords: records,
    totalPrice,
    budgetValue,
    compatibility
  })
  interfaceElements.recommendationsList.innerHTML = recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
}

function populateBuildSlots() {
  const slotNames = getSlotNames()
  interfaceElements.buildSlotSelect.innerHTML = slotNames.map((slotName) => `<option value="${escapeHtml(slotName)}">${escapeHtml(slotName)}</option>`).join('')
}


function populateBuildCompareSlots() {
  const slotNames = getSlotNames()
  interfaceElements.buildCompareSlotA.innerHTML = slotNames.map((slotName) => `<option value="${escapeHtml(slotName)}">${escapeHtml(slotName)}</option>`).join('')
  interfaceElements.buildCompareSlotB.innerHTML = slotNames.map((slotName) => `<option value="${escapeHtml(slotName)}">${escapeHtml(slotName)}</option>`).join('')
  if (applicationState.buildCompare.slotA && slotNames.includes(applicationState.buildCompare.slotA)) interfaceElements.buildCompareSlotA.value = applicationState.buildCompare.slotA
  if (applicationState.buildCompare.slotB && slotNames.includes(applicationState.buildCompare.slotB)) interfaceElements.buildCompareSlotB.value = applicationState.buildCompare.slotB
  if (!applicationState.buildCompare.slotA) applicationState.buildCompare.slotA = slotNames[0] || ''
  if (!applicationState.buildCompare.slotB) applicationState.buildCompare.slotB = slotNames[1] || slotNames[0] || ''
  interfaceElements.buildCompareSlotA.value = applicationState.buildCompare.slotA
  interfaceElements.buildCompareSlotB.value = applicationState.buildCompare.slotB
}

function getBuildBySlot(slotName) {
  const payload = loadBuild(slotName)
  if (!payload?.selectedConfigurationByCategory) return {}
  const result = {}
  for (const categoryKey of configuratorCategoryOrder) {
    const recordId = payload.selectedConfigurationByCategory[categoryKey]
    if (!recordId) continue
    const record = getRecordById(categoryKey, recordId)
    if (record) result[categoryKey] = record
  }
  return result
}

function renderBuildCompareResult() {
  const left = getBuildBySlot(applicationState.buildCompare.slotA)
  const right = getBuildBySlot(applicationState.buildCompare.slotB)
  const comparison = compareBuilds({
    buildAByCategory: left,
    buildBByCategory: right,
    categoryOrder: configuratorCategoryOrder
  })

  const lines = [
    `<li>Цена: ${comparison.totals.buildA.price > 0 ? formatPrice(comparison.totals.buildA.price) : '—'} → ${comparison.totals.buildB.price > 0 ? formatPrice(comparison.totals.buildB.price) : '—'} (Δ ${comparison.delta.price >= 0 ? '+' : ''}${Math.round(comparison.delta.price)} ₽)</li>`,
    `<li>Мощность: ${comparison.totals.buildA.performance.toFixed(1)} → ${comparison.totals.buildB.performance.toFixed(1)} (Δ ${comparison.delta.performance >= 0 ? '+' : ''}${comparison.delta.performance.toFixed(1)})</li>`,
    `<li>Потребление: ${comparison.totals.buildA.power.toFixed(0)}Вт → ${comparison.totals.buildB.power.toFixed(0)}Вт (Δ ${comparison.delta.power >= 0 ? '+' : ''}${comparison.delta.power.toFixed(0)}Вт)</li>`,
    `<li>Апгрейд-потенциал: ${comparison.totals.buildA.upgrade.toFixed(1)} → ${comparison.totals.buildB.upgrade.toFixed(1)} (Δ ${comparison.delta.upgrade >= 0 ? '+' : ''}${comparison.delta.upgrade.toFixed(1)})</li>`
  ]

  const changes = comparison.changes.length > 0
    ? comparison.changes.map((change) => `<li><strong>${escapeHtml(categorySettings[change.categoryKey]?.title || change.categoryKey)}:</strong> ${escapeHtml(change.left?.name || '—')} → ${escapeHtml(change.right?.name || '—')}</li>`).join('')
    : '<li>Состав сборок совпадает.</li>'

  interfaceElements.buildCompareResult.innerHTML = `<h4>${escapeHtml(applicationState.buildCompare.slotA)} vs ${escapeHtml(applicationState.buildCompare.slotB)}</h4><ul>${lines.join('')}</ul><h4>Что изменилось</h4><ul>${changes}</ul>`
}

function applyBuildTransformMode() {
  const mode = applicationState.buildCompare.transformMode
  const records = getSelectedRecords()
  if (records.length === 0) {
    interfaceElements.buildStatus.textContent = 'Сначала соберите текущий ПК, затем применяйте режим изменения.'
    return
  }

  if (mode === 'cheaper') {
    const mostExpensive = [...records].sort((a, b) => (b.price || 0) - (a.price || 0))[0]
    if (!mostExpensive) return
    const alternatives = getCategoryRecords(mostExpensive.categoryKey)
      .filter((record) => record.id !== mostExpensive.id && (record.price || 0) < (mostExpensive.price || 0))
      .sort((a, b) => (b.price || 0) - (a.price || 0))
    if (alternatives[0]) applicationState.selectedConfigurationByCategory[mostExpensive.categoryKey] = alternatives[0].id
  }

  if (mode === 'quieter') {
    const cpu = getRecordById('cpu', applicationState.selectedConfigurationByCategory.cpu)
    const coolers = getCategoryRecords('cooler')
    const cpuTdp = Number(String(cpu?.specs?.TDP || '').match(/\d+/)?.[0] || 0)
    const alternative = coolers
      .filter((record) => Number(String(record?.specs?.TDP || '').match(/\d+/)?.[0] || 0) >= cpuTdp)
      .sort((a, b) => (Number(String(b?.specs?.TDP || '').match(/\d+/)?.[0] || 0) - Number(String(a?.specs?.TDP || '').match(/\d+/)?.[0] || 0)))[0]
    if (alternative) applicationState.selectedConfigurationByCategory.cooler = alternative.id
  }

  if (mode === 'stronger') {
    const gpu = getRecordById('gpu', applicationState.selectedConfigurationByCategory.gpu)
    const currentPrice = gpu?.price || 0
    const alternatives = getCategoryRecords('gpu')
      .filter((record) => record.id !== gpu?.id && (record.price || 0) <= currentPrice + 10000)
      .sort((a, b) => (b.price || 0) - (a.price || 0))
    if (alternatives[0]) applicationState.selectedConfigurationByCategory.gpu = alternatives[0].id
  }

  renderConfigurator()
  renderConfigurationSummary()
  interfaceElements.buildStatus.textContent = 'Режим изменения применён к текущей сборке.'
  syncUrlState()
}

function handleSaveBuild() {
  const slotName = normalizeText(interfaceElements.buildSlotSelect.value)
  if (!slotName) return
  saveBuild(slotName, applicationState.selectedConfigurationByCategory, applicationState.budgetValue)
  populateBuildSlots()
  populateBuildCompareSlots()
  interfaceElements.buildStatus.textContent = `Сборка сохранена в слот: ${slotName}`
  syncUrlState()
}

function handleLoadBuild() {
  const slotName = normalizeText(interfaceElements.buildSlotSelect.value)
  const payload = loadBuild(slotName)
  if (!payload) {
    interfaceElements.buildStatus.textContent = 'В выбранном слоте нет сохранения.'
    return
  }
  applicationState.selectedConfigurationByCategory = payload.selectedConfigurationByCategory || {}
  applicationState.budgetValue = payload.budgetValue || ''
  interfaceElements.budgetInput.value = applicationState.budgetValue
  renderConfigurator()
  renderConfigurationSummary()
  interfaceElements.buildStatus.textContent = `Сборка загружена: ${slotName}`
  syncUrlState()
}

function handleDeleteBuild() {
  const slotName = normalizeText(interfaceElements.buildSlotSelect.value)
  const deleted = deleteBuild(slotName)
  populateBuildSlots()
  populateBuildCompareSlots()
  interfaceElements.buildStatus.textContent = deleted ? `Сборка удалена: ${slotName}` : 'Удалять нечего: слот пуст.'
  syncUrlState()
}

function handleExportBuild() {
  const payload = {
    selectedConfigurationByCategory: applicationState.selectedConfigurationByCategory,
    budgetValue: applicationState.budgetValue
  }
  const exported = exportBuildPayload(payload)
  navigator.clipboard.writeText(exported)
    .then(() => {
      interfaceElements.buildStatus.textContent = 'JSON сборки скопирован в буфер обмена.'
    })
    .catch(() => {
      interfaceElements.buildStatus.textContent = exported
    })
}

function handleImportBuild() {
  const raw = prompt('Вставьте JSON сборки')
  if (!raw) return
  try {
    const imported = importBuildPayload(raw)
    applicationState.selectedConfigurationByCategory = imported.selectedConfigurationByCategory || {}
    applicationState.budgetValue = imported.budgetValue || ''
    interfaceElements.budgetInput.value = applicationState.budgetValue
    renderConfigurator()
    renderConfigurationSummary()
    interfaceElements.buildStatus.textContent = 'Сборка импортирована из JSON.'
    syncUrlState()
  } catch (error) {
    interfaceElements.buildStatus.textContent = `Ошибка импорта: ${error.message}`
  }
}

function renderFirebaseFormByCategory() {
  const categoryKey = normalizeText(interfaceElements.firebaseForm.elements.firebaseCategory.value)
  renderFirebaseCategoryFields(interfaceElements.firebaseSpecsContainer, interfaceElements.firebaseRequiredHint, categoryKey)
}


function composeComponentNameFromFields() {
  const vendorField = interfaceElements.firebaseForm.querySelector('[data-field-key="vendor"]')
  const modelField = interfaceElements.firebaseForm.querySelector('[data-field-key="model"]')
  const vendor = normalizeText(vendorField?.value)
  const model = normalizeText(modelField?.value)
  return [vendor, model].filter(Boolean).join(' ')
}

function syncComponentNameFromFields() {
  const currentName = normalizeText(interfaceElements.firebaseForm.elements.firebaseComponentName.value)
  const composedName = composeComponentNameFromFields()
  if (!composedName) return
  if (!currentName) {
    interfaceElements.firebaseForm.elements.firebaseComponentName.value = composedName
    return
  }
  const normalizedCurrent = currentName.toLowerCase()
  const normalizedComposed = composedName.toLowerCase()
  if (normalizedCurrent === normalizedComposed) {
    interfaceElements.firebaseForm.elements.firebaseComponentName.value = composedName
  }
}

function buildComponentNameFromFields() {
  const composedName = composeComponentNameFromFields()
  if (!composedName) {
    interfaceElements.firebaseStatus.textContent = 'Сначала заполните бренд и модель.'
    return
  }
  interfaceElements.firebaseForm.elements.firebaseComponentName.value = composedName
  interfaceElements.firebaseStatus.textContent = ''
}

function prefillVendorAndModelFromName() {
  const value = normalizeText(interfaceElements.firebaseForm.elements.firebaseComponentName.value)
  if (!value) return
  const parts = value.split(' ')
  if (parts.length < 2) return

  const vendorField = interfaceElements.firebaseForm.querySelector('[data-field-key="vendor"]')
  const modelField = interfaceElements.firebaseForm.querySelector('[data-field-key="model"]')
  if (vendorField && !normalizeText(vendorField.value)) vendorField.value = parts[0]
  if (modelField && !normalizeText(modelField.value)) modelField.value = parts.slice(1).join(' ')
}

async function refreshCategoryFromFirebase(categoryKey) {
  applicationState.componentsByCategory[categoryKey] = await loadCategory(categoryKey)
  renderComparisonCategoryTabs()
  renderComparisonSelectors()
  renderConfigurator()
  renderWizardPlan()
  renderConfigurationSummary()
}

function mergeComponentIntoState(categoryKey, payload) {
  const converted = convertFirebaseRecord(categoryKey, payload)
  if (!converted) return
  const current = applicationState.componentsByCategory[categoryKey] || []
  const merged = current.filter((record) => record.id !== converted.id)
  merged.push(converted)
  merged.sort((leftRecord, rightRecord) => leftRecord.name.localeCompare(rightRecord.name, 'ru'))
  applicationState.componentsByCategory[categoryKey] = merged
}

function refreshAfterComponentSave() {
  renderComparisonCategoryTabs()
  renderComparisonSelectors()
  renderConfigurator()
  renderWizardPlan()
  renderConfigurationSummary()
}


function renderTechnicalImportPreview(record) {
  if (!interfaceElements.technicalImportPreview) return
  if (!record) {
    interfaceElements.technicalImportPreview.textContent = 'Выберите компонент из источника для предпросмотра.'
    return
  }
  interfaceElements.technicalImportPreview.textContent = JSON.stringify({
    category: record.categoryKey,
    name: record.name,
    vendor: record.vendor,
    model: record.model,
    price: record.price,
    specs: record.specs
  }, null, 2)
}

function renderTechnicalImportComponents() {
  const selectElement = interfaceElements.technicalImportComponent
  if (!selectElement) return

  const options = applicationState.technicalImportFilteredRecords
  selectElement.innerHTML = [
    '<option value="">Выберите компонент</option>',
    ...options.slice(0, 500).map((record) => `<option value="${escapeHtml(record.name)}">${escapeHtml(record.name)}</option>`)
  ].join('')

  if (applicationState.technicalImportSelectedRecordName && options.some((record) => record.name === applicationState.technicalImportSelectedRecordName)) {
    selectElement.value = applicationState.technicalImportSelectedRecordName
  } else {
    applicationState.technicalImportSelectedRecordName = ''
  }

  const selected = options.find((record) => record.name === applicationState.technicalImportSelectedRecordName) || null
  renderTechnicalImportPreview(selected)
}

function applyTechnicalImportFilter() {
  const searchValue = normalizeText(interfaceElements.technicalImportSearch?.value).toLowerCase()
  const sourceRecords = applicationState.technicalImportRecords
  applicationState.technicalImportFilteredRecords = !searchValue
    ? sourceRecords
    : sourceRecords.filter((record) => record.name.toLowerCase().includes(searchValue))
  renderTechnicalImportComponents()
}

async function reloadTechnicalImportRecords() {
  const sourceKey = normalizeText(interfaceElements.technicalImportSource?.value)
  if (!sourceKey) {
    applicationState.technicalImportRecords = []
    applicationState.technicalImportFilteredRecords = []
    applicationState.technicalImportSelectedRecordName = ''
    renderTechnicalImportComponents()
    return
  }

  interfaceElements.technicalImportStatus.textContent = 'Загрузка источника...'
  try {
    applicationState.technicalImportRecords = await applicationState.technicalImportController.loadRecords(sourceKey)
    applicationState.technicalImportSelectedRecordName = ''
    applyTechnicalImportFilter()
    interfaceElements.technicalImportStatus.textContent = `Источник загружен: ${applicationState.technicalImportRecords.length} записей.`
  } catch (error) {
    applicationState.technicalImportRecords = []
    applicationState.technicalImportFilteredRecords = []
    applicationState.technicalImportSelectedRecordName = ''
    renderTechnicalImportComponents()
    interfaceElements.technicalImportStatus.textContent = `Ошибка загрузки источника: ${error.message}`
  }
}

function getSelectedTechnicalImportRecord() {
  return applicationState.technicalImportFilteredRecords.find((record) => record.name === applicationState.technicalImportSelectedRecordName) || null
}

function fillFirebaseFormFromImportRecord(record) {
  if (!record) return false
  interfaceElements.firebaseForm.elements.firebaseCategory.value = record.categoryKey
  renderFirebaseFormByCategory()
  interfaceElements.firebaseForm.elements.firebaseComponentName.value = record.name
  for (const [key, value] of Object.entries(record.raw || {})) {
    const input = interfaceElements.firebaseForm.querySelector(`[data-field-key="${key}"]`)
    if (!input) continue
    input.value = normalizeText(value)
  }
  return true
}

async function approveTechnicalImportRecord() {
  const record = getSelectedTechnicalImportRecord()
  if (!record) {
    interfaceElements.technicalImportStatus.textContent = 'Сначала выберите компонент для переноса.'
    return
  }

  try {
    await saveComponent(record.categoryKey, {
      name: record.name,
      vendor: record.vendor,
      model: record.model,
      price: record.price,
      specs: record.specs,
      raw: record.raw
    })
    mergeComponentIntoState(record.categoryKey, record)
    refreshAfterComponentSave()
    await applicationState.firebaseEditorController?.refresh()
    interfaceElements.technicalImportStatus.textContent = `Перенесено в Firebase: ${record.name}`
  } catch (error) {
    interfaceElements.technicalImportStatus.textContent = `Ошибка переноса: ${error.message}`
  }
}

function resetFirebaseDynamicFields() {
  interfaceElements.firebaseForm.elements.firebaseComponentName.value = ''
  renderFirebaseFormByCategory()
}

function renderFirebaseConnectionState() {
  if (!interfaceElements.firebaseConnectionInfo) return
  interfaceElements.firebaseConnectionInfo.textContent = 'Firebase подключен: выполняется проверка соединения...'
  interfaceElements.firebaseConnectionInfo.classList.remove('firebase-disconnected')
  interfaceElements.firebaseConnectionInfo.classList.add('firebase-connected')
}

async function saveComponentToFirebase(event) {
  event.preventDefault()
  interfaceElements.firebaseStatus.textContent = ''

  const category = normalizeText(interfaceElements.firebaseForm.elements.firebaseCategory.value)
  const { errors, payload } = collectFirebasePayload(interfaceElements.firebaseForm, category)

  if (errors.length > 0) {
    interfaceElements.firebaseStatus.textContent = errors[0]
    return
  }

  if (!payload?.name || !payload?.price) {
    interfaceElements.firebaseStatus.textContent = 'Заполните название, модель и цену.'
    return
  }

  try {
    await saveComponent(category, payload)
    mergeComponentIntoState(category, payload)
    refreshAfterComponentSave()
    interfaceElements.firebaseStatus.textContent = `Компонент сохранён: PC/${category}/components/${payload.name}`
    await applicationState.firebaseEditorController?.refresh()
    resetFirebaseDynamicFields()
  } catch (error) {
    interfaceElements.firebaseStatus.textContent = `Не удалось сохранить в Firebase: ${error.message}`
  }
}


function getConfigurationSnapshot() {
  const snapshot = {}
  for (const categoryKey of configuratorCategoryOrder) {
    snapshot[categoryKey] = getRecordById(categoryKey, applicationState.selectedConfigurationByCategory[categoryKey])
  }
  return snapshot
}

function initializeDiagnosticsModule() {
  if (!interfaceElements.diagnosticsRoot) return
  applicationState.diagnosticsController = setupDiagnosticsModule({
    rootElement: interfaceElements.diagnosticsRoot,
    getConfigurationSnapshot
  })
}

function bindEvents() {
  interfaceElements.mainTabsContainer.addEventListener('click', (event) => {
    const tabButton = event.target.closest('[data-main-tab]')
    if (!tabButton) return
    applicationState.activeMainTab = tabButton.dataset.mainTab
    renderMainTabs()
    syncUrlState()
  })

  interfaceElements.comparisonCategoryTabs.addEventListener('click', (event) => {
    const tabButton = event.target.closest('[data-comparison-category]')
    if (!tabButton) return
    applicationState.activeComparisonCategory = tabButton.dataset.comparisonCategory
    applicationState.comparisonInput.first = ''
    applicationState.comparisonInput.second = ''
    applicationState.comparisonSelectionBySide.first = ''
    applicationState.comparisonSelectionBySide.second = ''
    interfaceElements.comparisonFirstInput.value = ''
    interfaceElements.comparisonSecondInput.value = ''
    renderComparisonCategoryTabs()
    renderComparisonSelectors()
  })

  interfaceElements.comparisonMode.addEventListener('change', () => {
    applicationState.comparisonMode = normalizeText(interfaceElements.comparisonMode.value) || 'all'
    renderComparisonSelectors()
  })

  interfaceElements.bestChoiceProfile.addEventListener('change', () => {
    applicationState.bestChoiceProfile = normalizeText(interfaceElements.bestChoiceProfile.value) || 'balanced'
    renderBestChoice()
    syncUrlState()
  })

  interfaceElements.shareStateButton.addEventListener('click', () => {
    shareCurrentState().catch(() => {
      interfaceElements.buildStatus.textContent = 'Не удалось поделиться ссылкой в этом браузере.'
    })
  })

  interfaceElements.comparisonFirstInput.addEventListener('input', (event) => {
    applicationState.comparisonInput.first = event.target.value
    applicationState.comparisonSelectionBySide.first = findRecordIdByExactName(
      getFilteredRecords(applicationState.activeComparisonCategory, event.target.value),
      event.target.value
    )
    renderComparisonSelectors()
  })

  interfaceElements.comparisonSecondInput.addEventListener('input', (event) => {
    applicationState.comparisonInput.second = event.target.value
    applicationState.comparisonSelectionBySide.second = findRecordIdByExactName(
      getFilteredRecords(applicationState.activeComparisonCategory, event.target.value),
      event.target.value
    )
    renderComparisonSelectors()
  })

  interfaceElements.configuratorGrid.addEventListener('input', (event) => {
    const searchInput = event.target.closest('[data-configurator-search]')
    if (!searchInput) return

    const categoryKey = searchInput.dataset.configuratorSearch
    const inputValue = normalizeText(searchInput.value)
    applicationState.configuratorSearchByCategory[categoryKey] = inputValue

    const categoryRecords = applicationState.componentsByCategory[categoryKey] || []
    const matchedRecord = categoryRecords.find((record) => record.name.toLowerCase() === inputValue.toLowerCase())
    applicationState.selectedConfigurationByCategory[categoryKey] = matchedRecord ? matchedRecord.id : ''

    renderConfiguratorOptionsByCategory(categoryKey)
    renderConfigurationSummary()
    applicationState.diagnosticsController?.rerender()
    syncUrlState()
  })

  interfaceElements.configuratorResetButton.addEventListener('click', () => {
    applicationState.selectedConfigurationByCategory = {}
    applicationState.configuratorSearchByCategory = {}
    renderConfigurator()
    renderConfigurationSummary()
    applicationState.diagnosticsController?.rerender()
    syncUrlState()
  })

  interfaceElements.firebaseForm.elements.firebaseCategory.addEventListener('change', () => {
    renderFirebaseFormByCategory()
    interfaceElements.firebaseEditorCategory.value = interfaceElements.firebaseForm.elements.firebaseCategory.value
    applicationState.firebaseEditorController?.refresh()
    interfaceElements.firebaseStatus.textContent = ''
  })
  interfaceElements.firebaseForm.elements.firebaseComponentName.addEventListener('input', () => prefillVendorAndModelFromName())
  interfaceElements.firebaseSpecsContainer.addEventListener('input', (event) => {
    const field = event.target.closest('[data-field-key]')
    if (!field) return
    if (field.dataset.fieldKey === 'vendor' || field.dataset.fieldKey === 'model') {
      syncComponentNameFromFields()
    }
  })
  interfaceElements.firebaseBuildNameButton.addEventListener('click', () => buildComponentNameFromFields())
  interfaceElements.firebaseEditorLoadButton.addEventListener('click', () => applicationState.firebaseEditorController?.loadToForm())
  interfaceElements.firebaseEditorUpdateButton.addEventListener('click', () => applicationState.firebaseEditorController?.updateFromForm())
  interfaceElements.firebaseEditorDeleteButton.addEventListener('click', () => applicationState.firebaseEditorController?.deleteFromFirebase())
  interfaceElements.firebaseForm.addEventListener('submit', saveComponentToFirebase)
  interfaceElements.technicalImportSource.addEventListener('change', async () => {
    applicationState.technicalImportSelectedRecordName = ''
    await reloadTechnicalImportRecords()
  })
  interfaceElements.technicalImportSearch.addEventListener('input', () => {
    applicationState.technicalImportSelectedRecordName = ''
    applyTechnicalImportFilter()
  })
  interfaceElements.technicalImportComponent.addEventListener('change', () => {
    applicationState.technicalImportSelectedRecordName = normalizeText(interfaceElements.technicalImportComponent.value)
    renderTechnicalImportPreview(getSelectedTechnicalImportRecord())
    interfaceElements.technicalImportStatus.textContent = ''
  })
  interfaceElements.technicalImportApplyButton.addEventListener('click', () => {
    const record = getSelectedTechnicalImportRecord()
    if (!record) {
      interfaceElements.technicalImportStatus.textContent = 'Сначала выберите компонент для заполнения формы.'
      return
    }
    fillFirebaseFormFromImportRecord(record)
    interfaceElements.technicalImportStatus.textContent = `Форма подготовлена: ${record.name}`
  })
  interfaceElements.technicalImportApproveButton.addEventListener('click', approveTechnicalImportRecord)
  interfaceElements.budgetInput.addEventListener('input', () => {
    applicationState.budgetValue = normalizeText(interfaceElements.budgetInput.value)
    renderConfigurationSummary()
    renderBestChoice()
    syncUrlState()
  })

  interfaceElements.wizardBudgetInput.addEventListener('input', () => {
    applicationState.wizard.budgetValue = normalizeText(interfaceElements.wizardBudgetInput.value)
    renderWizardPlan()
  })

  interfaceElements.wizardScenarioSelect.addEventListener('change', () => {
    applicationState.wizard.scenario = normalizeText(interfaceElements.wizardScenarioSelect.value) || 'balanced'
    renderWizardPlan()
  })

  interfaceElements.wizardPrioritySelect.addEventListener('change', () => {
    applicationState.wizard.priority = normalizeText(interfaceElements.wizardPrioritySelect.value) || 'minimal_price'
    renderWizardPlan()
  })

  interfaceElements.wizardApplyButton.addEventListener('click', () => applyWizardPlan())

  interfaceElements.saveBuildButton.addEventListener('click', handleSaveBuild)
  interfaceElements.loadBuildButton.addEventListener('click', handleLoadBuild)
  interfaceElements.deleteBuildButton.addEventListener('click', handleDeleteBuild)
  interfaceElements.exportBuildButton.addEventListener('click', handleExportBuild)
  interfaceElements.importBuildButton.addEventListener('click', handleImportBuild)

  interfaceElements.buildCompareSlotA.addEventListener('change', () => {
    applicationState.buildCompare.slotA = normalizeText(interfaceElements.buildCompareSlotA.value)
    renderBuildCompareResult()
    syncUrlState()
  })

  interfaceElements.buildCompareSlotB.addEventListener('change', () => {
    applicationState.buildCompare.slotB = normalizeText(interfaceElements.buildCompareSlotB.value)
    renderBuildCompareResult()
    syncUrlState()
  })

  interfaceElements.buildTransformMode.addEventListener('change', () => {
    applicationState.buildCompare.transformMode = normalizeText(interfaceElements.buildTransformMode.value) || 'cheaper'
    syncUrlState()
  })

  interfaceElements.buildCompareRunButton.addEventListener('click', () => renderBuildCompareResult())
  interfaceElements.buildTransformRunButton.addEventListener('click', () => applyBuildTransformMode())
}

function setupLanguage() {
  if (!interfaceElements.languageSelect) return
  interfaceElements.languageSelect.value = getLanguage()
  applyStaticTranslations()
  interfaceElements.languageSelect.addEventListener('change', () => {
    setLanguage(interfaceElements.languageSelect.value)
    window.location.reload()
  })
}
async function initializeApplication() {
  setupLanguage()
  const urlState = parseUrlState()
  if (urlState.tab) applicationState.activeMainTab = urlState.tab
  if (urlState.compareCategory) applicationState.activeComparisonCategory = urlState.compareCategory
  if (urlState.compareA) applicationState.comparisonInput.first = urlState.compareA
  if (urlState.compareB) applicationState.comparisonInput.second = urlState.compareB
  if (urlState.budget) applicationState.budgetValue = urlState.budget
  if (urlState.compareMode) applicationState.comparisonMode = urlState.compareMode
  if (urlState.bestProfile) applicationState.bestChoiceProfile = urlState.bestProfile
  if (urlState.wizardBudget) applicationState.wizard.budgetValue = urlState.wizardBudget
  if (urlState.wizardScenario) applicationState.wizard.scenario = urlState.wizardScenario
  if (urlState.wizardPriority) applicationState.wizard.priority = urlState.wizardPriority
  if (urlState.compareSlotA) applicationState.buildCompare.slotA = urlState.compareSlotA
  if (urlState.compareSlotB) applicationState.buildCompare.slotB = urlState.compareSlotB
  if (urlState.transformMode) applicationState.buildCompare.transformMode = urlState.transformMode

  interfaceElements.firebaseForm.elements.firebaseCategory.innerHTML = firebaseCategoryOptions
    .map((option) => `<option value="${escapeHtml(option.key)}">${escapeHtml(option.label)}</option>`)
    .join('')
  interfaceElements.firebaseEditorCategory.innerHTML = firebaseCategoryOptions
    .map((option) => `<option value="${escapeHtml(option.key)}">${escapeHtml(option.label)}</option>`)
    .join('')
  renderFirebaseFormByCategory()
  interfaceElements.technicalImportSource.innerHTML = technicalImportOptions
    .map((option) => `<option value="${escapeHtml(option.key)}">${escapeHtml(option.label)}</option>`)
    .join('')
  interfaceElements.technicalImportSearch.value = ''
  interfaceElements.technicalImportStatus.textContent = ''
  renderTechnicalImportPreview(null)
  interfaceElements.bestChoiceProfile.innerHTML = getRankingProfiles()
    .map((profileKey) => `<option value="${escapeHtml(profileKey)}">${escapeHtml(profileKey)}</option>`)
    .join('')
  interfaceElements.bestChoiceProfile.value = applicationState.bestChoiceProfile
  interfaceElements.comparisonMode.value = applicationState.comparisonMode
  interfaceElements.comparisonFirstInput.value = applicationState.comparisonInput.first
  interfaceElements.comparisonSecondInput.value = applicationState.comparisonInput.second
  interfaceElements.wizardBudgetInput.value = applicationState.wizard.budgetValue
  interfaceElements.wizardScenarioSelect.value = applicationState.wizard.scenario
  interfaceElements.wizardPrioritySelect.value = applicationState.wizard.priority
  interfaceElements.buildTransformMode.value = applicationState.buildCompare.transformMode
  await reloadTechnicalImportRecords()

  for (const categoryKey of Object.keys(categorySettings)) {
    applicationState.componentsByCategory[categoryKey] = await loadCategory(categoryKey)
  }

  applicationState.selectedConfigurationByCategory = {
    ...urlState.selectedConfigurationByCategory,
    ...applicationState.selectedConfigurationByCategory
  }

  const firstProcessor = applicationState.componentsByCategory.cpu[0]
  const firstMotherboard = applicationState.componentsByCategory.motherboard[0]
  if (firstProcessor && !applicationState.selectedConfigurationByCategory.cpu) applicationState.selectedConfigurationByCategory.cpu = firstProcessor.id
  if (firstMotherboard && !applicationState.selectedConfigurationByCategory.motherboard) applicationState.selectedConfigurationByCategory.motherboard = firstMotherboard.id

  renderMainTabs()
  initializeDiagnosticsModule()
  renderComparisonCategoryTabs()
  renderComparisonSelectors()
  renderConfigurator()
  renderWizardPlan()
  populateBuildSlots()
  populateBuildCompareSlots()
  interfaceElements.budgetInput.value = applicationState.budgetValue
  renderConfigurationSummary()
  renderBuildCompareResult()
  renderFirebaseConnectionState()
  const firebaseEditor = setupFirebaseEditor({
    formElement: interfaceElements.firebaseForm,
    specsContainer: interfaceElements.firebaseSpecsContainer,
    requiredHint: interfaceElements.firebaseRequiredHint,
    statusElement: interfaceElements.firebaseStatus,
    editorCategorySelect: interfaceElements.firebaseEditorCategory,
    editorComponentSelect: interfaceElements.firebaseEditorComponent,
    refreshAfterSave: () => {
      renderComparisonCategoryTabs()
      renderComparisonSelectors()
      renderConfigurator()
      renderConfigurationSummary()
    },
    refreshCatalog: async (categoryKey, payload) => {
      if (payload) {
        mergeComponentIntoState(categoryKey, payload)
      } else {
        await refreshCategoryFromFirebase(categoryKey)
      }
    },
    loadComponentsFromFirebase,
    loadComponentFromFirebase,
    saveComponent,
    deleteComponent
  })
  applicationState.firebaseEditorController = await firebaseEditor.initialize(normalizeText(interfaceElements.firebaseForm.elements.firebaseCategory.value))

  await watchFirebaseConnection((connected) => {
    if (!interfaceElements.firebaseConnectionInfo) return
    interfaceElements.firebaseConnectionInfo.textContent = connected
      ? 'Firebase подключен: соединение с Firestore активно.'
      : 'Firebase недоступен: проверьте правила Firestore и включение анонимной аутентификации.'
    interfaceElements.firebaseConnectionInfo.classList.toggle('firebase-connected', connected)
    interfaceElements.firebaseConnectionInfo.classList.toggle('firebase-disconnected', !connected)
  })
  bindEvents()
}

initializeApplication()
