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

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
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
    raw: {
      vendor: split.vendor,
      model: split.model,
      price: usdToRub(item.price_last_usd || item.price_usd) || '',
      cores: cores || '',
      threads: threads || '',
      baseClock: baseClock || '',
      boostClock: boostClock || '',
      socket: normalizeText(item.socket),
      tdp: tdp || '',
      cache: normalizeText(item.cache),
      process: normalizeText(item.process_node || item.process),
      iGpu: normalizeText(item.graphics) ? 'Есть' : ''
    },
    specs: {
      Производитель: split.vendor,
      Модель: split.model,
      Ядра: cores ? String(cores) : '',
      Потоки: threads ? String(threads) : '',
      'Базовая частота': baseClock ? `${baseClock} ГГц` : '',
      'Турбо-частота': boostClock ? `${boostClock} ГГц` : '',
      Сокет: normalizeText(item.socket),
      TDP: tdp ? `${tdp} Вт` : '',
      Кэш: normalizeText(item.cache),
      Техпроцесс: normalizeText(item.process_node || item.process),
      iGPU: normalizeText(item.graphics) ? 'Есть' : ''
    }
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
    raw: {
      vendor: split.vendor,
      model: split.model,
      price: usdToRub(payload.price_last_usd || payload.price) || '',
      chipset: normalizeText(payload.chipset || payload.architecture),
      memory: memory || '',
      memoryType: normalizeText(payload.memory_type || payload.vram_type),
      memoryBus: normalizeText(payload.memory_bus || payload.bus_width),
      coreClock: coreClock || '',
      boostClock: boostClock || '',
      tdp: tdp || '',
      length: length || '',
      connectors: normalizeText(payload.power_connectors)
    },
    specs: {
      Производитель: split.vendor,
      Модель: split.model,
      Чип: normalizeText(payload.chipset || payload.architecture),
      Память: memory ? `${memory} ГБ` : '',
      'Тип памяти': normalizeText(payload.memory_type || payload.vram_type),
      'Шина памяти': normalizeText(payload.memory_bus || payload.bus_width),
      'Базовая частота GPU': coreClock ? `${coreClock} МГц` : '',
      'Турбо-частота GPU': boostClock ? `${boostClock} МГц` : '',
      Энергопотребление: tdp ? `${tdp} Вт` : '',
      'Длина карты': length ? `${length} мм` : '',
      'Разъёмы питания': normalizeText(payload.power_connectors)
    }
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
    raw: {
      vendor: split.vendor,
      model: split.model,
      price: toNumber(item.price) || '',
      capacity: capacity || '',
      modules,
      type: memoryType,
      frequency: frequency || '',
      timings: item.cas_latency ? `CL${item.cas_latency}` : '',
      voltage: '',
      profile: ''
    },
    specs: {
      Производитель: split.vendor,
      Модель: split.model,
      Объем: capacity ? `${capacity} ГБ` : '',
      Модули: modules,
      Тип: memoryType,
      Частота: frequency ? `${frequency} МГц` : '',
      Тайминги: item.cas_latency ? `CL${item.cas_latency}` : '',
      Напряжение: '',
      Профиль: ''
    }
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
    raw: {
      vendor: split.vendor,
      model: split.model,
      price: toNumber(item.price) || '',
      socket: normalizeText(item.socket),
      chipset: normalizeText(item.chipset),
      formFactor: normalizeText(item.form_factor),
      memoryType: normalizeText(item.memory_type),
      memorySlots: toNumber(item.memory_slots) || '',
      maxMemory: toNumber(item.max_memory) || '',
      pcie: normalizeText(item.pcie),
      m2slots: toNumber(item.m2slots) || ''
    },
    specs: {
      Производитель: split.vendor,
      Модель: split.model,
      Сокет: normalizeText(item.socket),
      Чипсет: normalizeText(item.chipset),
      Формфактор: normalizeText(item.form_factor),
      'Тип ОЗУ': normalizeText(item.memory_type),
      'Слоты ОЗУ': normalizeText(item.memory_slots),
      'Макс. ОЗУ': toNumber(item.max_memory) ? `${item.max_memory} ГБ` : '',
      PCIe: normalizeText(item.pcie),
      'M.2 слоты': normalizeText(item.m2slots)
    }
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
    raw: {
      vendor: split.vendor,
      model: split.model,
      price: usdToRub(item.price_usd || item.price_last_usd) || '',
      wattage: wattage || '',
      efficiency: normalizeText(item.efficiency_rating),
      modular: normalizeText(item.is_modular),
      atxVersion: normalizeText(item.form_factor),
      fanSize: ''
    },
    specs: {
      Производитель: split.vendor,
      Модель: split.model,
      Мощность: wattage ? `${wattage} Вт` : '',
      Сертификат: normalizeText(item.efficiency_rating),
      Модульность: normalizeText(item.is_modular),
      Стандарт: normalizeText(item.form_factor),
      Вентилятор: ''
    }
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
    raw: {
      vendor: split.vendor,
      model: split.model,
      price: toNumber(item.price) || '',
      type: typeLabel,
      size: '',
      socketSupport: '',
      noise: '',
      tdp: ''
    },
    specs: {
      Производитель: split.vendor,
      Модель: split.model,
      Описание: specsText
    }
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
