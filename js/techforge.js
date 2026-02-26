const supabaseStorageKeys = {
  projectUrl: 'techforge.supabase.url',
  publishableKey: 'techforge.supabase.publishableKey'
}

const fallbackDataPaths = {
  cpu: ['BD/CPU/AMD.json', 'BD/CPU/INTEL.json'],
  gpu: ['BD/GPU/AMD.json', 'BD/GPU/INTEL.json', 'BD/GPU/NVIDIA.json', 'BD/GPU/OTHER.json'],
  ram: ['BD/RAM/ddr4.json', 'BD/RAM/ddr5.json'],
  motherboard: ['BD/MOTHERBOARDS/motherboards.json'],
  power_supply: ['BD/POWER_SUPPLIES/power_supplies.json'],
  m2: ['BD/COMPONENTS/m2.json'],
  ssd: ['BD/COMPONENTS/ssd.json'],
  hdd: ['BD/COMPONENTS/hdd.json'],
  case: ['BD/COMPONENTS/case.json'],
  cooler: ['BD/COMPONENTS/cooler.json']
}

const categoryDisplayNames = {
  cpu: 'Процессоры',
  gpu: 'Видеокарты',
  ram: 'Оперативная память',
  motherboard: 'Материнские платы',
  power_supply: 'Блоки питания',
  m2: 'M.2 накопители',
  ssd: 'SSD накопители',
  hdd: 'HDD накопители',
  case: 'Корпуса',
  cooler: 'Охлаждение'
}

const interfaceElements = {
  urlInput: document.getElementById('supabase-url-input'),
  keyInput: document.getElementById('supabase-key-input'),
  saveButton: document.getElementById('save-supabase-settings'),
  connectionStatus: document.getElementById('connection-status'),
  categoryList: document.getElementById('category-list'),
  componentList: document.getElementById('component-list'),
  activeCategoryTitle: document.getElementById('active-category-title'),
  dataSourceTag: document.getElementById('data-source-tag')
}

const applicationState = {
  activeCategoryKey: 'cpu',
  sourceByCategory: {},
  componentsByCategory: {}
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function readSupabaseSettings() {
  return {
    projectUrl: normalizeText(localStorage.getItem(supabaseStorageKeys.projectUrl)),
    publishableKey: normalizeText(localStorage.getItem(supabaseStorageKeys.publishableKey))
  }
}

function saveSupabaseSettings(projectUrl, publishableKey) {
  localStorage.setItem(supabaseStorageKeys.projectUrl, projectUrl)
  localStorage.setItem(supabaseStorageKeys.publishableKey, publishableKey)
}

async function fetchJson(path) {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(path)
  }
  return response.json()
}

function convertLocalRecord(categoryKey, rawRecord) {
  if (categoryKey === 'cpu') {
    return {
      name: normalizeText(rawRecord.name),
      specs: `${normalizeText(rawRecord.manufacturer)} · ${rawRecord.core_count || 0} ядер · ${rawRecord.boost_clock_ghz || 0} ГГц`
    }
  }
  if (categoryKey === 'gpu') {
    return {
      name: normalizeText(rawRecord?.data?.name || rawRecord.name),
      specs: normalizeText(rawRecord?.data?.chipset || rawRecord.chipset || 'Графический ускоритель')
    }
  }
  if (categoryKey === 'ram') {
    const modules = Array.isArray(rawRecord.modules) ? rawRecord.modules.join('x') : ''
    return {
      name: normalizeText(rawRecord.name),
      specs: `${modules} · ${Array.isArray(rawRecord.speed) ? rawRecord.speed.join(' ') : ''}`
    }
  }
  if (categoryKey === 'motherboard') {
    return {
      name: normalizeText(rawRecord.name),
      specs: `${normalizeText(rawRecord.socket)} · ${normalizeText(rawRecord.chipset)}`
    }
  }
  if (categoryKey === 'power_supply') {
    return {
      name: normalizeText(rawRecord.name),
      specs: `${rawRecord.wattage || 0} Вт · ${normalizeText(rawRecord.efficiency_rating)}`
    }
  }
  return {
    name: normalizeText(rawRecord.name),
    specs: normalizeText(rawRecord.specs || rawRecord.interface || rawRecord.form_factor)
  }
}

function unwrapLocalDataset(categoryKey, payload) {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.items)) return payload.items
  if (Array.isArray(payload.records)) return payload.records
  return []
}

async function readCategoryFromLocalFiles(categoryKey) {
  const paths = fallbackDataPaths[categoryKey] || []
  const mergedItems = []
  for (const path of paths) {
    const payload = await fetchJson(path)
    const entries = unwrapLocalDataset(categoryKey, payload)
    for (const entry of entries) {
      const item = convertLocalRecord(categoryKey, entry)
      if (item.name) mergedItems.push(item)
    }
  }
  return mergedItems
}

async function requestSupabaseCategoryRows(projectUrl, publishableKey, categoryKey) {
  const tableUrl = `${projectUrl}/rest/v1/components?select=name,specs,category_key&category_key=eq.${encodeURIComponent(categoryKey)}&order=name.asc`
  const response = await fetch(tableUrl, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`
    }
  })
  if (!response.ok) {
    throw new Error(`supabase components ${response.status}`)
  }
  const records = await response.json()
  return records.map((record) => ({
    name: normalizeText(record.name),
    specs: normalizeText(record.specs)
  })).filter((record) => record.name)
}

async function ensureSupabaseCategories(projectUrl, publishableKey) {
  const categories = Object.keys(fallbackDataPaths)
  const payload = categories.map((categoryKey) => ({
    key: categoryKey,
    name: categoryDisplayNames[categoryKey] || categoryKey
  }))
  await fetch(`${projectUrl}/rest/v1/component_categories?on_conflict=key`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(payload)
  })
}

async function loadCategory(categoryKey, projectUrl, publishableKey) {
  const hasSupabaseSettings = projectUrl && publishableKey
  if (hasSupabaseSettings) {
    try {
      const supabaseItems = await requestSupabaseCategoryRows(projectUrl, publishableKey, categoryKey)
      if (supabaseItems.length > 0) {
        applicationState.sourceByCategory[categoryKey] = 'supabase'
        applicationState.componentsByCategory[categoryKey] = supabaseItems
        return
      }
    } catch (error) {
      interfaceElements.connectionStatus.textContent = `Supabase недоступен: ${error.message}. Используется локальная база.`
    }
  }
  const localItems = await readCategoryFromLocalFiles(categoryKey)
  applicationState.sourceByCategory[categoryKey] = 'local'
  applicationState.componentsByCategory[categoryKey] = localItems
}

function renderCategories() {
  interfaceElements.categoryList.innerHTML = Object.keys(fallbackDataPaths).map((categoryKey) => {
    const isActive = categoryKey === applicationState.activeCategoryKey
    const count = applicationState.componentsByCategory[categoryKey]?.length || 0
    return `<li><button type="button" class="category-button ${isActive ? 'active' : ''}" data-category-key="${categoryKey}">${categoryDisplayNames[categoryKey]} (${count})</button></li>`
  }).join('')
}

function renderComponents() {
  const categoryKey = applicationState.activeCategoryKey
  const displayName = categoryDisplayNames[categoryKey]
  const sourceType = applicationState.sourceByCategory[categoryKey] === 'supabase' ? 'Supabase' : 'локальная база'
  const categoryItems = applicationState.componentsByCategory[categoryKey] || []
  interfaceElements.activeCategoryTitle.textContent = displayName
  interfaceElements.dataSourceTag.textContent = `Источник: ${sourceType}`
  interfaceElements.componentList.innerHTML = categoryItems.map((item) => `<li class="component-item"><h3 class="component-name">${escapeHtml(item.name)}</h3><p class="component-specs">${escapeHtml(item.specs || 'Характеристики уточняются')}</p></li>`).join('')
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function attachEvents() {
  interfaceElements.saveButton.addEventListener('click', async () => {
    const projectUrl = normalizeText(interfaceElements.urlInput.value).replace(/\/$/, '')
    const publishableKey = normalizeText(interfaceElements.keyInput.value)
    saveSupabaseSettings(projectUrl, publishableKey)
    await bootstrapData()
  })

  interfaceElements.categoryList.addEventListener('click', (event) => {
    const targetButton = event.target.closest('[data-category-key]')
    if (!targetButton) return
    applicationState.activeCategoryKey = targetButton.dataset.categoryKey
    renderCategories()
    renderComponents()
  })
}

async function bootstrapData() {
  const settings = readSupabaseSettings()
  interfaceElements.urlInput.value = settings.projectUrl
  interfaceElements.keyInput.value = settings.publishableKey || 'sb_publishable_Zcp9g8pEacMiu5dOsk6OdA_Cp6mx4Qf'

  if (settings.projectUrl && settings.publishableKey) {
    try {
      await ensureSupabaseCategories(settings.projectUrl, settings.publishableKey)
      interfaceElements.connectionStatus.textContent = 'Подключение к Supabase сохранено. Категории синхронизируются автоматически.'
    } catch (error) {
      interfaceElements.connectionStatus.textContent = 'Не удалось создать категории в Supabase с publishable key. Для записи может понадобиться service role key.'
    }
  } else {
    interfaceElements.connectionStatus.textContent = 'Укажите Supabase URL и ключ для загрузки данных из облака.'
  }

  for (const categoryKey of Object.keys(fallbackDataPaths)) {
    await loadCategory(categoryKey, settings.projectUrl, settings.publishableKey || interfaceElements.keyInput.value)
  }

  renderCategories()
  renderComponents()
}

attachEvents()
bootstrapData()
