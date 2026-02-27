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
  const cpu = getRecordById('cpu', selectedConfigurationByCategory.cpu)
  const motherboard = getRecordById('motherboard', selectedConfigurationByCategory.motherboard)
  const gpu = getRecordById('gpu', selectedConfigurationByCategory.gpu)
  const psu = getRecordById('power_supply', selectedConfigurationByCategory.power_supply)
  const ram = getRecordById('ram', selectedConfigurationByCategory.ram)

  if (cpu && motherboard) {
    const cpuSocket = normalize(cpu.specs.Сокет)
    const mbSocket = normalize(motherboard.specs.Сокет)
    if (cpuSocket && mbSocket && cpuSocket !== mbSocket) {
      issues.push(`Сокет CPU (${cpu.specs.Сокет}) не совпадает с сокетом MB (${motherboard.specs.Сокет}).`)
    }
  }

  const cpuTdp = parseWatts(cpu?.specs?.TDP)
  const gpuTdp = parseWatts(gpu?.specs?.Энергопотребление)
  const psuPower = parseWatts(psu?.specs?.Мощность)
  const recommendedPower = Math.round((cpuTdp + gpuTdp) * 1.45)

  if (psuPower > 0 && recommendedPower > 0 && psuPower < recommendedPower) {
    issues.push(`Мощности БП может не хватить: ${psuPower} Вт при рекомендации от ${recommendedPower} Вт.`)
  }

  if (ram) {
    const ramType = normalize(ram.specs.Тип)
    if (ramType && motherboard) {
      const chipset = normalize(motherboard.specs.Чипсет)
      if (ramType === 'ddr5' && chipset.includes('b4')) {
        issues.push('Проверьте RAM: DDR5 редко совместима с более старыми чипсетами B4xx.')
      }
    }
  }

  return {
    issues,
    estimatedPower: cpuTdp + gpuTdp,
    recommendedPower
  }
}
