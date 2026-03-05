const storageKey = 'techforge-build-slots-v1'

function safeParse(raw) {
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function readSlots() {
  const raw = localStorage.getItem(storageKey)
  return safeParse(raw)
}

function writeSlots(slots) {
  localStorage.setItem(storageKey, JSON.stringify(slots))
}

export function getSlotNames() {
  const slots = readSlots()
  const base = ['Мой ПК #1', 'Мой ПК #2', 'Мой ПК #3', 'Игровой', 'Рабочий']
  const dynamic = Object.keys(slots)
  return Array.from(new Set([...base, ...dynamic]))
}

export function saveBuild(slotName, selectedConfigurationByCategory, budgetValue) {
  const slots = readSlots()
  slots[slotName] = {
    selectedConfigurationByCategory,
    budgetValue: budgetValue || '',
    updatedAt: new Date().toISOString()
  }
  writeSlots(slots)
}

export function loadBuild(slotName) {
  const slots = readSlots()
  return slots[slotName] || null
}

export function deleteBuild(slotName) {
  const slots = readSlots()
  if (!slots[slotName]) return false
  delete slots[slotName]
  writeSlots(slots)
  return true
}

export function exportBuildPayload(payload) {
  return JSON.stringify(payload, null, 2)
}

export function importBuildPayload(raw) {
  const parsed = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object' || !parsed.selectedConfigurationByCategory) {
    throw new Error('Некорректный JSON сборки')
  }
  return parsed
}
