import {
  collection,
  addDoc,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  limit,
  query,
  getDocs,
  getDoc,
  deleteDoc,
  getFirestore
} from 'firebase/firestore'
import { initializeApp } from 'firebase/app'
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
}

const firebaseApp = initializeApp(firebaseConfig)
const firestoreDatabase = getFirestore(firebaseApp)
const firebaseAuth = getAuth(firebaseApp)

let authReadyPromise

function ensureFirebaseAuth() {
  if (!authReadyPromise) {
    authReadyPromise = new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(
        firebaseAuth,
        async (user) => {
          if (user) {
            unsubscribe()
            resolve(user)
            return
          }
          try {
            await signInAnonymously(firebaseAuth)
          } catch (error) {
            unsubscribe()
            reject(error)
          }
        },
        (error) => {
          unsubscribe()
          reject(error)
        }
      )
    })
  }

  return authReadyPromise
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function toComponentDoc(category, componentName) {
  return doc(firestoreDatabase, 'PC', normalizeText(category), 'components', normalizeText(componentName))
}

export async function watchFirebaseConnection(onChange) {
  try {
    await ensureFirebaseAuth()
  } catch {
    onChange(false)
    return () => {}
  }

  const statusQuery = query(collection(firestoreDatabase, 'PC_ACTIVITY_LOGS'), limit(1))
  return onSnapshot(
    statusQuery,
    () => onChange(true),
    () => onChange(false)
  )
}

export async function loadComponentsFromFirebase(category) {
  await ensureFirebaseAuth()
  const snapshot = await getDocs(collection(firestoreDatabase, 'PC', normalizeText(category), 'components'))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

export async function loadComponentFromFirebase(category, componentName) {
  await ensureFirebaseAuth()
  const snapshot = await getDoc(toComponentDoc(category, componentName))
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() }
}

export async function saveComponent(category, componentPayload) {
  await ensureFirebaseAuth()

  const normalizedCategory = normalizeText(category)
  const normalizedName = normalizeText(componentPayload?.name)
  const createdAt = new Date().toISOString()

  const componentRef = toComponentDoc(normalizedCategory, normalizedName)
  await setDoc(componentRef, {
    name: normalizedName,
    categoryKey: normalizedCategory,
    price: componentPayload.price || null,
    vendor: componentPayload.vendor || '',
    model: componentPayload.model || '',
    specs: componentPayload.specs || {},
    raw: componentPayload.raw || {},
    source: 'firebase',
    createdAt,
    updatedAt: serverTimestamp()
  })

  await addDoc(collection(firestoreDatabase, 'PC_ACTIVITY_LOGS'), {
    category: normalizedCategory,
    componentName: normalizedName,
    createdAt,
    createdAtServer: serverTimestamp(),
    action: 'upsert'
  })

  return {
    name: normalizedName,
    categoryKey: normalizedCategory,
    specs: componentPayload.specs || {},
    raw: componentPayload.raw || {},
    price: componentPayload.price || null,
    createdAt
  }
}

const CATALOG_JSON_PATHS = [
  'BD/COMPONENTS/case.json',
  'BD/COMPONENTS/cooler.json',
  'BD/COMPONENTS/hdd.json',
  'BD/COMPONENTS/m2.json',
  'BD/COMPONENTS/ssd.json',
  'BD/CPU/AMD.json',
  'BD/CPU/INTEL.json',
  'BD/GPU/AMD.json',
  'BD/GPU/INTEL.json',
  'BD/GPU/NVIDIA.json',
  'BD/GPU/OTHER.json',
  'BD/MOTHERBOARDS/motherboards.json',
  'BD/POWER_SUPPLIES/power_supplies.json',
  'BD/RAM/ddr4.json',
  'BD/RAM/ddr5.json'
]

function resolveCategoryFromPath(filePath) {
  const segments = String(filePath || '').split('/').filter(Boolean)
  return segments.length >= 2 ? segments[1] : ''
}

async function fetchCatalogBatch(filePath) {
  const response = await fetch(filePath)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${filePath}: ${response.status}`)
  }
  const data = await response.json()
  if (!Array.isArray(data)) {
    throw new Error(`Invalid catalog format for ${filePath}`)
  }
  return data
}

async function syncCatalogFile(filePath) {
  const category = resolveCategoryFromPath(filePath)
  if (!category) {
    throw new Error(`Invalid category path: ${filePath}`)
  }
  const components = await fetchCatalogBatch(filePath)
  let saved = 0
  for (const item of components) {
    await saveComponent(category, item)
    saved += 1
  }
  return {
    files: 1,
    saved
  }
}

export async function autoPopulateCatalog() {
  const stats = {
    files: 0,
    saved: 0
  }

  for (const filePath of CATALOG_JSON_PATHS) {
    try {
      const result = await syncCatalogFile(filePath)
      stats.files += result.files
      stats.saved += result.saved
    } catch {
      stats.files += 1
    }
  }

  return stats
}

export async function deleteComponent(category, componentName) {
  await ensureFirebaseAuth()
  const normalizedCategory = normalizeText(category)
  const normalizedName = normalizeText(componentName)
  if (!normalizedCategory || !normalizedName) return false

  await deleteDoc(toComponentDoc(normalizedCategory, normalizedName))
  await addDoc(collection(firestoreDatabase, 'PC_ACTIVITY_LOGS'), {
    category: normalizedCategory,
    componentName: normalizedName,
    createdAt: new Date().toISOString(),
    createdAtServer: serverTimestamp(),
    action: 'delete'
  })
  return true
}

const categoryFormConfig = {
  cpu: {
    label: 'Процессор',
    requiredHint: 'Обязательно: бренд, модель, цена, базовая частота, ядра, потоки.',
    fields: [
      { key: 'vendor', label: 'Бренд', required: true, control: 'select', options: ['Intel', 'AMD'] },
      { key: 'model', label: 'Модель (чип/серия)', required: true, placeholder: 'Core i5-14600K / Ryzen 7 7800X3D' },
      { key: 'price', label: 'Цена (руб.)', type: 'number', step: '1', min: '0', required: true, placeholder: '32000' },
      { key: 'baseClock', label: 'Базовая частота (ГГц)', type: 'number', step: '0.1', min: '0', required: true, placeholder: '3.5' },
      { key: 'boostClock', label: 'Турбо-частота (ГГц)', type: 'number', step: '0.1', min: '0', placeholder: '5.2' },
      { key: 'cores', label: 'Ядра', type: 'number', step: '1', min: '1', required: true, placeholder: '8' },
      { key: 'threads', label: 'Потоки', type: 'number', step: '1', min: '1', required: true, placeholder: '16' },
      { key: 'socket', label: 'Сокет', control: 'select', options: ['AM4', 'AM5', 'LGA1200', 'LGA1700', 'sTRX4'] },
      { key: 'tdp', label: 'TDP (Вт)', type: 'number', step: '1', min: '0', placeholder: '120' },
      { key: 'cache', label: 'Кэш', placeholder: '96MB L3' },
      { key: 'process', label: 'Техпроцесс', placeholder: '5 nm' },
      { key: 'iGpu', label: 'Встроенная графика', control: 'select', options: ['Есть', 'Нет'] }
    ]
  },
  gpu: {
    label: 'Видеокарта',
    requiredHint: 'Обязательно: бренд, модель, цена, память, турбо-частота, энергопотребление.',
    fields: [
      { key: 'vendor', label: 'Бренд', required: true, control: 'select', options: ['NVIDIA', 'AMD', 'Intel'] },
      { key: 'model', label: 'Модель (чип/серия)', required: true, placeholder: 'RTX 4070 SUPER' },
      { key: 'price', label: 'Цена (руб.)', type: 'number', step: '1', min: '0', required: true, placeholder: '59900' },
      { key: 'chipset', label: 'Графический чип', placeholder: 'AD104 / Navi 32' },
      { key: 'memory', label: 'Память (ГБ)', type: 'number', step: '1', min: '1', required: true, placeholder: '12' },
      { key: 'memoryType', label: 'Тип памяти', control: 'select', options: ['GDDR6', 'GDDR6X', 'HBM'] },
      { key: 'memoryBus', label: 'Шина памяти', placeholder: '192-bit' },
      { key: 'coreClock', label: 'Базовая частота GPU (МГц)', type: 'number', step: '1', min: '0', placeholder: '1980' },
      { key: 'boostClock', label: 'Турбо-частота GPU (МГц)', type: 'number', step: '1', min: '0', required: true, placeholder: '2475' },
      { key: 'tdp', label: 'Энергопотребление (Вт)', type: 'number', step: '1', min: '0', required: true, placeholder: '220' },
      { key: 'length', label: 'Длина карты (мм)', type: 'number', step: '1', min: '0', placeholder: '300' },
      { key: 'connectors', label: 'Разъёмы питания', placeholder: '1x16-pin / 2x8-pin' }
    ]
  },
  ram: {
    label: 'Оперативная память',
    requiredHint: 'Обязательно: бренд, модель, цена, объём, тип, частота.',
    fields: [
      { key: 'vendor', label: 'Бренд', required: true, placeholder: 'Kingston / G.Skill / Corsair' },
      { key: 'model', label: 'Модель (серия)', required: true, placeholder: 'Fury Beast / Trident Z5' },
      { key: 'price', label: 'Цена (руб.)', type: 'number', step: '1', min: '0', required: true, placeholder: '11000' },
      { key: 'capacity', label: 'Объём (ГБ)', type: 'number', step: '1', min: '1', required: true, placeholder: '32' },
      { key: 'modules', label: 'Конфигурация модулей', placeholder: '2x16GB' },
      { key: 'type', label: 'Тип', required: true, control: 'select', options: ['DDR4', 'DDR5'] },
      { key: 'frequency', label: 'Частота (МГц)', type: 'number', step: '1', min: '0', required: true, placeholder: '6000' },
      { key: 'timings', label: 'Тайминги', placeholder: 'CL30-36-36' },
      { key: 'voltage', label: 'Напряжение', placeholder: '1.35V' },
      { key: 'profile', label: 'Профиль', control: 'select', options: ['XMP', 'EXPO', 'XMP и EXPO', 'Нет'] }
    ]
  },
  motherboard: {
    label: 'Материнская плата',
    requiredHint: 'Обязательно: бренд, модель, цена, сокет, чипсет, формфактор.',
    fields: [
      { key: 'vendor', label: 'Бренд', required: true, placeholder: 'ASUS / MSI / Gigabyte / ASRock' },
      { key: 'model', label: 'Модель платы', required: true, placeholder: 'B650 AORUS ELITE AX' },
      { key: 'price', label: 'Цена (руб.)', type: 'number', step: '1', min: '0', required: true, placeholder: '22900' },
      { key: 'socket', label: 'Сокет', required: true, control: 'select', options: ['AM4', 'AM5', 'LGA1200', 'LGA1700'] },
      { key: 'chipset', label: 'Чипсет', required: true, placeholder: 'B650 / X670 / B760 / Z790' },
      { key: 'formFactor', label: 'Формфактор', required: true, control: 'select', options: ['ATX', 'Micro-ATX', 'Mini-ITX', 'E-ATX'] },
      { key: 'memoryType', label: 'Тип ОЗУ', control: 'select', options: ['DDR4', 'DDR5'] },
      { key: 'memorySlots', label: 'Слоты ОЗУ', type: 'number', step: '1', min: '1', placeholder: '4' },
      { key: 'maxMemory', label: 'Макс. объём ОЗУ (ГБ)', type: 'number', step: '1', min: '1', placeholder: '192' },
      { key: 'pcie', label: 'PCIe версия', control: 'select', options: ['PCIe 3.0', 'PCIe 4.0', 'PCIe 5.0'] },
      { key: 'm2slots', label: 'Слоты M.2', type: 'number', step: '1', min: '0', placeholder: '3' }
    ]
  },
  power_supply: {
    label: 'Блок питания',
    requiredHint: 'Обязательно: бренд, модель, цена, мощность, сертификат.',
    fields: [
      { key: 'vendor', label: 'Бренд', required: true, placeholder: 'Corsair / be quiet! / Seasonic' },
      { key: 'model', label: 'Модель БП', required: true, placeholder: 'RM850x' },
      { key: 'price', label: 'Цена (руб.)', type: 'number', step: '1', min: '0', required: true, placeholder: '14900' },
      { key: 'wattage', label: 'Мощность (Вт)', type: 'number', step: '1', min: '1', required: true, placeholder: '850' },
      { key: 'efficiency', label: 'Сертификат', required: true, control: 'select', options: ['80+ Bronze', '80+ Silver', '80+ Gold', '80+ Platinum', '80+ Titanium'] },
      { key: 'modular', label: 'Модульность', control: 'select', options: ['Полная', 'Частичная', 'Нет'] },
      { key: 'atxVersion', label: 'Стандарт', control: 'select', options: ['ATX 2.x', 'ATX 3.0', 'ATX 3.1'] },
      { key: 'fanSize', label: 'Размер вентилятора', placeholder: '120 мм / 135 мм / 140 мм' }
    ]
  },
  ssd: {
    label: 'SSD',
    requiredHint: 'Обязательно: бренд, модель, цена, объём, интерфейс, скорость чтения.',
    fields: [
      { key: 'vendor', label: 'Бренд', required: true, placeholder: 'Samsung / WD / Kingston / Crucial' },
      { key: 'model', label: 'Модель накопителя', required: true, placeholder: '990 PRO' },
      { key: 'price', label: 'Цена (руб.)', type: 'number', step: '1', min: '0', required: true, placeholder: '13900' },
      { key: 'capacity', label: 'Объём (ГБ)', type: 'number', step: '1', min: '1', required: true, placeholder: '1000' },
      { key: 'interface', label: 'Интерфейс', required: true, control: 'select', options: ['NVMe PCIe 3.0', 'NVMe PCIe 4.0', 'NVMe PCIe 5.0', 'SATA'] },
      { key: 'formFactor', label: 'Формфактор', control: 'select', options: ['M.2 2230', 'M.2 2242', 'M.2 2280', '2.5"'] },
      { key: 'readSpeed', label: 'Скорость чтения (МБ/с)', type: 'number', step: '1', min: '1', required: true, placeholder: '7450' },
      { key: 'writeSpeed', label: 'Скорость записи (МБ/с)', type: 'number', step: '1', min: '1', placeholder: '6900' },
      { key: 'tbw', label: 'Ресурс TBW', placeholder: '600 TBW' }
    ]
  },
  case: {
    label: 'Корпус',
    requiredHint: 'Обязательно: бренд, модель, цена, формфактор.',
    fields: [
      { key: 'vendor', label: 'Бренд', required: true, placeholder: 'NZXT / Lian Li / Fractal' },
      { key: 'model', label: 'Модель корпуса', required: true, placeholder: 'H7 Flow' },
      { key: 'price', label: 'Цена (руб.)', type: 'number', step: '1', min: '0', required: true, placeholder: '12900' },
      { key: 'formFactor', label: 'Поддержка материнской платы', required: true, control: 'select', options: ['E-ATX', 'ATX', 'Micro-ATX', 'Mini-ITX'] },
      { key: 'type', label: 'Тип корпуса', control: 'select', options: ['Полная башня', 'Средняя башня', 'Мини-башня'] },
      { key: 'color', label: 'Цвет', placeholder: 'Чёрный / Белый' },
      { key: 'maxGpuLength', label: 'Макс. длина видеокарты (мм)', type: 'number', step: '1', min: '0', placeholder: '400' },
      { key: 'fansIncluded', label: 'Вентиляторы в комплекте', placeholder: '3x120мм' }
    ]
  },
  cooler: {
    label: 'Охлаждение процессора',
    requiredHint: 'Обязательно: бренд, модель, цена, тип, поддержка сокетов.',
    fields: [
      { key: 'vendor', label: 'Бренд', required: true, placeholder: 'DeepCool / Noctua / Arctic' },
      { key: 'model', label: 'Модель охлаждения', required: true, placeholder: 'AK620 / NH-D15 / Liquid Freezer III 360' },
      { key: 'price', label: 'Цена (руб.)', type: 'number', step: '1', min: '0', required: true, placeholder: '7900' },
      { key: 'type', label: 'Тип', required: true, control: 'select', options: ['Воздушное', 'Жидкостное (AIO)'] },
      { key: 'size', label: 'Размер радиатора/вентилятора', control: 'select', options: ['92 мм', '120 мм', '140 мм', '240 мм', '280 мм', '360 мм'] },
      { key: 'socketSupport', label: 'Совместимые сокеты', required: true, placeholder: 'AM5, AM4, LGA1700' },
      { key: 'noise', label: 'Уровень шума', placeholder: '28 dBA' },
      { key: 'tdp', label: 'Поддерживаемый TDP (Вт)', type: 'number', step: '1', min: '0', placeholder: '260' }
    ]
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderInputField(field) {
  return `
    <input
      name="field_${escapeHtml(field.key)}"
      data-field-key="${escapeHtml(field.key)}"
      type="${escapeHtml(field.type || 'text')}"
      placeholder="${escapeHtml(field.placeholder || '')}"
      ${field.min !== undefined ? `min="${escapeHtml(field.min)}"` : ''}
      ${field.step !== undefined ? `step="${escapeHtml(field.step)}"` : ''}
      ${field.required ? 'required' : ''}
    >
  `
}

function renderSelectField(field) {
  const optionsMarkup = (field.options || []).map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join('')
  return `
    <select name="field_${escapeHtml(field.key)}" data-field-key="${escapeHtml(field.key)}" ${field.required ? 'required' : ''}>
      <option value="">Выберите значение</option>
      ${optionsMarkup}
    </select>
  `
}

function buildSpecsByCategory(categoryKey, values) {
  if (categoryKey === 'cpu') return { Производитель: values.vendor, Модель: values.model, Ядра: values.cores, Потоки: values.threads, 'Базовая частота': values.baseClock ? `${values.baseClock} ГГц` : '', 'Турбо-частота': values.boostClock ? `${values.boostClock} ГГц` : '', Сокет: values.socket, TDP: values.tdp ? `${values.tdp} Вт` : '', Кэш: values.cache, Техпроцесс: values.process, iGPU: values.iGpu }
  if (categoryKey === 'gpu') return { Производитель: values.vendor, Модель: values.model, Чип: values.chipset, Память: values.memory ? `${values.memory} ГБ` : '', 'Тип памяти': values.memoryType, 'Шина памяти': values.memoryBus, 'Базовая частота GPU': values.coreClock ? `${values.coreClock} МГц` : '', 'Турбо-частота GPU': values.boostClock ? `${values.boostClock} МГц` : '', Энергопотребление: values.tdp ? `${values.tdp} Вт` : '', 'Длина карты': values.length ? `${values.length} мм` : '', 'Разъёмы питания': values.connectors }
  if (categoryKey === 'ram') return { Производитель: values.vendor, Модель: values.model, Объем: values.capacity ? `${values.capacity} ГБ` : '', Модули: values.modules, Тип: values.type, Частота: values.frequency ? `${values.frequency} МГц` : '', Тайминги: values.timings, Напряжение: values.voltage, Профиль: values.profile }
  if (categoryKey === 'motherboard') return { Производитель: values.vendor, Модель: values.model, Сокет: values.socket, Чипсет: values.chipset, Формфактор: values.formFactor, 'Тип ОЗУ': values.memoryType, 'Слоты ОЗУ': values.memorySlots, 'Макс. ОЗУ': values.maxMemory ? `${values.maxMemory} ГБ` : '', PCIe: values.pcie, 'M.2 слоты': values.m2slots }
  if (categoryKey === 'power_supply') return { Производитель: values.vendor, Модель: values.model, Мощность: values.wattage ? `${values.wattage} Вт` : '', Сертификат: values.efficiency, Модульность: values.modular, Стандарт: values.atxVersion, Вентилятор: values.fanSize }
  if (categoryKey === 'ssd') return { Производитель: values.vendor, Модель: values.model, Объем: values.capacity ? `${values.capacity} ГБ` : '', Интерфейс: values.interface, Формфактор: values.formFactor, 'Скорость чтения': values.readSpeed ? `${values.readSpeed} МБ/с` : '', 'Скорость записи': values.writeSpeed ? `${values.writeSpeed} МБ/с` : '', TBW: values.tbw }
  if (categoryKey === 'case') return { Производитель: values.vendor, Модель: values.model, Формфактор: values.formFactor, Тип: values.type, Цвет: values.color, 'Макс. длина видеокарты': values.maxGpuLength ? `${values.maxGpuLength} мм` : '', 'Вентиляторы в комплекте': values.fansIncluded }
  if (categoryKey === 'cooler') return { Производитель: values.vendor, Модель: values.model, Тип: values.type, Размер: values.size, Совместимость: values.socketSupport, Шум: values.noise, TDP: values.tdp ? `${values.tdp} Вт` : '' }
  return {}
}

function getComponentDisplayName(component) {
  const vendor = normalizeText(component?.vendor || component?.raw?.vendor || component?.specs?.Производитель)
  const model = normalizeText(component?.model || component?.raw?.model || component?.specs?.Модель)
  const cardName = normalizeText(component?.name)
  const modelName = [vendor, model].filter(Boolean).join(' ')
  if (!modelName && !cardName) return 'Без названия'
  if (!modelName) return cardName
  if (!cardName) return modelName
  if (modelName.toLowerCase() === cardName.toLowerCase()) return modelName
  return `${modelName} · ${cardName}`
}

export const firebaseCategoryOptions = Object.entries(categoryFormConfig).map(([key, value]) => ({ key, label: value.label }))

export function renderFirebaseCategoryFields(container, hintElement, categoryKey) {
  const config = categoryFormConfig[categoryKey]
  if (!config) {
    container.innerHTML = ''
    if (hintElement) hintElement.textContent = ''
    return
  }

  container.innerHTML = config.fields.map((field) => `
      <label>
        ${escapeHtml(field.label)}${field.required ? ' *' : ''}
        ${field.control === 'select' ? renderSelectField(field) : renderInputField(field)}
      </label>
    `).join('')

  if (hintElement) hintElement.textContent = `${config.requiredHint} Поля со * обязательны.`
}

export function collectFirebasePayload(formElement, categoryKey) {
  const config = categoryFormConfig[categoryKey]
  if (!config) return { errors: ['Неизвестная категория'], payload: null }

  const values = {}
  const errors = []
  for (const field of config.fields) {
    const input = formElement.querySelector(`[data-field-key="${field.key}"]`)
    const value = normalizeText(input?.value)
    values[field.key] = value
    if (field.required && !value) errors.push(`Заполните поле: ${field.label}`)
  }

  const vendor = normalizeText(values.vendor)
  const model = normalizeText(values.model)
  const composedName = [vendor, model].filter(Boolean).join(' ')
  const componentName = normalizeText(formElement.elements.firebaseComponentName?.value)
  const name = componentName || composedName

  return {
    errors,
    payload: {
      name,
      price: Number(values.price) || null,
      vendor,
      model,
      raw: values,
      specs: buildSpecsByCategory(categoryKey, values)
    }
  }
}

export function fillFirebaseFormByComponent(formElement, categoryKey, componentRecord) {
  const config = categoryFormConfig[categoryKey]
  if (!config || !componentRecord) return

  const rawValues = componentRecord.raw || {}
  const fallbackValues = {
    vendor: normalizeText(componentRecord.vendor || componentRecord.specs?.Производитель),
    model: normalizeText(componentRecord.model || componentRecord.specs?.Модель),
    price: componentRecord.price
  }

  const vendorValue = normalizeText(rawValues.vendor || fallbackValues.vendor)
  const modelValue = normalizeText(rawValues.model || fallbackValues.model)
  const nameValue = normalizeText(componentRecord.name || [vendorValue, modelValue].filter(Boolean).join(' '))

  if (formElement.elements.firebaseCategory) formElement.elements.firebaseCategory.value = categoryKey
  if (formElement.elements.firebaseComponentName) formElement.elements.firebaseComponentName.value = nameValue

  for (const field of config.fields) {
    const input = formElement.querySelector(`[data-field-key="${field.key}"]`)
    if (!input) continue
    const rawValue = rawValues[field.key]
    if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
      input.value = String(rawValue)
      continue
    }
    if (field.key === 'vendor') input.value = vendorValue
    else if (field.key === 'model') input.value = modelValue
    else if (field.key === 'price') input.value = fallbackValues.price || ''
    else input.value = ''
  }
}

export function setupFirebaseEditor({ formElement, specsContainer, requiredHint, statusElement, editorCategorySelect, editorComponentSelect, refreshAfterSave, refreshCatalog, loadComponentsFromFirebase, loadComponentFromFirebase, saveComponent, deleteComponent }) {
  function setStatus(message) {
    if (statusElement) statusElement.textContent = message
  }

  function getCurrentCategory() {
    return normalizeText(formElement.elements.firebaseCategory.value)
  }

  function renderFormByCategory(categoryKey) {
    renderFirebaseCategoryFields(specsContainer, requiredHint, categoryKey)
  }

  function syncCategorySelectors(categoryKey) {
    if (editorCategorySelect.value !== categoryKey) editorCategorySelect.value = categoryKey
    if (formElement.elements.firebaseCategory.value !== categoryKey) {
      formElement.elements.firebaseCategory.value = categoryKey
      renderFormByCategory(categoryKey)
    }
  }

  async function loadEditorComponentList(categoryKey) {
    editorComponentSelect.innerHTML = '<option value="">Загрузка...</option>'
    const components = await loadComponentsFromFirebase(categoryKey)
    components.sort((a, b) => getComponentDisplayName(a).localeCompare(getComponentDisplayName(b), 'ru'))
    editorComponentSelect.innerHTML = ['<option value="">Выберите компонент</option>', ...components.map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(getComponentDisplayName(item))}</option>`)].join('')
  }

  async function handleLoadToForm() {
    const category = normalizeText(editorCategorySelect.value)
    const componentName = normalizeText(editorComponentSelect.value)
    if (!category || !componentName) return setStatus('Выберите категорию и компонент для загрузки.')
    syncCategorySelectors(category)
    const componentRecord = await loadComponentFromFirebase(category, componentName)
    if (!componentRecord) return setStatus('Компонент не найден в Firebase.')
    fillFirebaseFormByComponent(formElement, category, componentRecord)
    setStatus(`Данные загружены в форму: ${componentName}`)
  }

  async function handleUpdateFromForm() {
    const category = getCurrentCategory()
    const { errors, payload } = collectFirebasePayload(formElement, category)
    if (errors.length > 0) return setStatus(errors[0])
    if (!payload?.name || !payload?.price) return setStatus('Заполните название, модель и цену.')
    await saveComponent(category, payload)
    await refreshCatalog(category, payload)
    await loadEditorComponentList(category)
    editorComponentSelect.value = payload.name
    refreshAfterSave()
    setStatus(`Компонент обновлён: ${payload.name}`)
  }

  async function handleDelete() {
    const category = normalizeText(editorCategorySelect.value)
    const componentName = normalizeText(editorComponentSelect.value)
    if (!category || !componentName) return setStatus('Выберите компонент для удаления.')
    await deleteComponent(category, componentName)
    await refreshCatalog(category)
    await loadEditorComponentList(category)
    if (normalizeText(formElement.elements.firebaseComponentName.value) === componentName) {
      formElement.reset()
      formElement.elements.firebaseCategory.value = category
      renderFormByCategory(category)
    }
    refreshAfterSave()
    setStatus(`Компонент удалён: ${componentName}`)
  }

  async function initialize(initialCategory) {
    syncCategorySelectors(initialCategory)
    await loadEditorComponentList(initialCategory)

    editorCategorySelect.addEventListener('change', async () => {
      const category = normalizeText(editorCategorySelect.value)
      syncCategorySelectors(category)
      await loadEditorComponentList(category)
      setStatus('')
    })

    editorComponentSelect.addEventListener('change', () => setStatus(''))

    return {
      loadToForm: handleLoadToForm,
      updateFromForm: handleUpdateFromForm,
      deleteFromFirebase: handleDelete,
      refresh: async () => loadEditorComponentList(normalizeText(editorCategorySelect.value))
    }
  }

  return { initialize }
}
