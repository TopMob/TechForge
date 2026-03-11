import { categoryFormConfig } from './component-schema.js'

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
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
  const optionsMarkup = (field.options || [])
    .map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
    .join('')

  return `
    <select
      name="field_${escapeHtml(field.key)}"
      data-field-key="${escapeHtml(field.key)}"
      ${field.required ? 'required' : ''}
    >
      <option value="">Выберите значение</option>
      ${optionsMarkup}
    </select>
  `
}

export function renderFirebaseCategoryFields(container, hintElement, categoryKey) {
  const config = categoryFormConfig[categoryKey]
  if (!config) {
    container.innerHTML = ''
    if (hintElement) hintElement.textContent = ''
    return
  }

  container.innerHTML = config.fields
    .map((field) => `
      <label>
        ${escapeHtml(field.label)}${field.required ? ' *' : ''}
        ${field.control === 'select' ? renderSelectField(field) : renderInputField(field)}
      </label>
    `)
    .join('')

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

  const payload = {
    name,
    price: Number(values.price) || null,
    vendor,
    model,
    raw: values,
    specs: buildSpecsByCategory(categoryKey, values)
  }

  return { errors, payload }
}

function buildSpecsByCategory(categoryKey, values) {
  if (categoryKey === 'cpu') {
    return {
      Производитель: values.vendor,
      Модель: values.model,
      Ядра: values.cores,
      Потоки: values.threads,
      'Базовая частота': values.baseClock ? `${values.baseClock} ГГц` : '',
      'Турбо-частота': values.boostClock ? `${values.boostClock} ГГц` : '',
      Сокет: values.socket,
      TDP: values.tdp ? `${values.tdp} Вт` : '',
      Кэш: values.cache,
      Техпроцесс: values.process,
      iGPU: values.iGpu
    }
  }

  if (categoryKey === 'gpu') {
    return {
      Производитель: values.vendor,
      Модель: values.model,
      Чип: values.chipset,
      Память: values.memory ? `${values.memory} ГБ` : '',
      'Тип памяти': values.memoryType,
      'Шина памяти': values.memoryBus,
      'Базовая частота GPU': values.coreClock ? `${values.coreClock} МГц` : '',
      'Турбо-частота GPU': values.boostClock ? `${values.boostClock} МГц` : '',
      Энергопотребление: values.tdp ? `${values.tdp} Вт` : '',
      'Длина карты': values.length ? `${values.length} мм` : '',
      'Разъёмы питания': values.connectors
    }
  }

  if (categoryKey === 'ram') {
    return {
      Производитель: values.vendor,
      Модель: values.model,
      Объем: values.capacity ? `${values.capacity} ГБ` : '',
      Модули: values.modules,
      Тип: values.type,
      Частота: values.frequency ? `${values.frequency} МГц` : '',
      Тайминги: values.timings,
      Напряжение: values.voltage,
      Профиль: values.profile
    }
  }

  if (categoryKey === 'motherboard') {
    return {
      Производитель: values.vendor,
      Модель: values.model,
      Сокет: values.socket,
      Чипсет: values.chipset,
      Формфактор: values.formFactor,
      'Тип ОЗУ': values.memoryType,
      'Слоты ОЗУ': values.memorySlots,
      'Макс. ОЗУ': values.maxMemory ? `${values.maxMemory} ГБ` : '',
      PCIe: values.pcie,
      'M.2 слоты': values.m2slots
    }
  }

  if (categoryKey === 'power_supply') {
    return {
      Производитель: values.vendor,
      Модель: values.model,
      Мощность: values.wattage ? `${values.wattage} Вт` : '',
      Сертификат: values.efficiency,
      Модульность: values.modular,
      Стандарт: values.atxVersion,
      Вентилятор: values.fanSize
    }
  }

  if (categoryKey === 'ssd') {
    return {
      Производитель: values.vendor,
      Модель: values.model,
      Объем: values.capacity ? `${values.capacity} ГБ` : '',
      Интерфейс: values.interface,
      Формфактор: values.formFactor,
      'Скорость чтения': values.readSpeed ? `${values.readSpeed} МБ/с` : '',
      'Скорость записи': values.writeSpeed ? `${values.writeSpeed} МБ/с` : '',
      TBW: values.tbw
    }
  }

  if (categoryKey === 'case') {
    return {
      Производитель: values.vendor,
      Модель: values.model,
      Формфактор: values.formFactor,
      Тип: values.type,
      Цвет: values.color,
      'Макс. длина видеокарты': values.maxGpuLength ? `${values.maxGpuLength} мм` : '',
      'Вентиляторы в комплекте': values.fansIncluded
    }
  }

  if (categoryKey === 'cooler') {
    return {
      Производитель: values.vendor,
      Модель: values.model,
      Тип: values.type,
      Размер: values.size,
      Совместимость: values.socketSupport,
      Шум: values.noise,
      TDP: values.tdp ? `${values.tdp} Вт` : ''
    }
  }

  return {}
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
    if (field.key === 'vendor') {
      input.value = vendorValue
      continue
    }
    if (field.key === 'model') {
      input.value = modelValue
      continue
    }
    if (field.key === 'price') {
      input.value = fallbackValues.price || ''
      continue
    }
    input.value = ''
  }
}
