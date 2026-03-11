function parseWatts(value) {
  const match = String(value || '').match(/(\d+(?:[.,]\d+)?)/)
  if (!match) return 0
  return Number(match[1].replace(',', '.')) || 0
}

function normalize(value) {
  return String(value || '').trim().toLowerCase()
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
    const cpuSocket = normalize(cpu.specs.Сокет)
    const mbSocket = normalize(motherboard.specs.Сокет)
    if (cpuSocket && mbSocket && cpuSocket !== mbSocket) {
      issues.push(`Сокет процессора (${cpu.specs.Сокет}) не совпадает с сокетом материнской платы (${motherboard.specs.Сокет}).`)
    } else if (cpuSocket && mbSocket) {
      notes.push('Пара CPU и материнской платы совместима по сокету.')
    }
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
  if (cooler && cpuTdp > 0 && coolerTdp > 0 && coolerTdp < cpuTdp) {
    issues.push(`Кулер может быть слабым: TDP кулера ${coolerTdp} Вт при CPU ${cpuTdp} Вт.`)
  }

  if (cpu && gpu && cpu.price && gpu.price) {
    const ratio = cpu.price / Math.max(gpu.price, 1)
    if (ratio > 2.2) warnings.push('Дисбаланс: процессор сильно дороже видеокарты, возможна потеря FPS/рубль.')
  }

  if (ram) {
    const ramType = normalize(ram.specs.Тип)
    if (ramType && motherboard) {
      const chipset = normalize(motherboard.specs.Чипсет)
      if (ramType === 'ddr5' && chipset.includes('b4')) {
        warnings.push('Проверьте ОЗУ: DDR5 редко совместима со старыми чипсетами B4xx.')
      }
    }
  }

  const quality = issues.length > 0 ? 'плохо' : warnings.length > 0 ? 'условно ок' : 'ок'

  return {
    quality,
    issues,
    warnings,
    notes,
    estimatedPower: cpuTdp + gpuTdp,
    recommendedPower
  }
}
