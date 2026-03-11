function parseNumeric(value) {
  const match = String(value || '').replace(',', '.').match(/\d+(?:\.\d+)?/)
  if (!match) return 0
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : 0
}

function perfScore(record) {
  if (!record) return 0
  const cores = parseNumeric(record?.specs?.Ядра || record?.specs?.Потоки)
  const freq = parseNumeric(record?.specs?.Частота || record?.specs?.['Базовая частота'])
  const cache = parseNumeric(record?.specs?.Кэш || record?.specs?.['Кэш L3'])
  return (cores * 3) + freq + (cache * 0.08)
}

function nearestByPrice(records, targetPrice) {
  return [...records]
    .filter((record) => record.price)
    .sort((a, b) => Math.abs((a.price || 0) - targetPrice) - Math.abs((b.price || 0) - targetPrice))[0] || null
}

function betterByPerf(records, baselineScore, maxPrice) {
  return [...records]
    .filter((record) => (record.price || 0) <= maxPrice && perfScore(record) > baselineScore)
    .sort((a, b) => perfScore(b) - perfScore(a))[0] || null
}

export function auditBuild({ selectedRecordsByCategory, budgetValue, getCategoryRecords }) {
  const issues = []
  const fixesMinimal = []
  const fixesOptimal = []
  const fixesNoBudgetIncrease = []

  const cpu = selectedRecordsByCategory.cpu
  const gpu = selectedRecordsByCategory.gpu
  const motherboard = selectedRecordsByCategory.motherboard
  const cooler = selectedRecordsByCategory.cooler
  const powerSupply = selectedRecordsByCategory.power_supply
  const ssd = selectedRecordsByCategory.ssd

  const totalPrice = Object.values(selectedRecordsByCategory).reduce((sum, record) => sum + (record?.price || 0), 0)
  const budget = Number(budgetValue) || 0

  if (!ssd) {
    issues.push('В сборке нет SSD: система и загрузки будут заметно медленнее.')
    const ssdCandidate = nearestByPrice(getCategoryRecords('ssd'), 5000)
    if (ssdCandidate) {
      fixesMinimal.push(`Добавить SSD: ${ssdCandidate.name}.`)
      fixesOptimal.push(`Добавить SSD и перенести систему на ${ssdCandidate.name}.`)
      fixesNoBudgetIncrease.push(`Добавить ${ssdCandidate.name} и компенсировать бюджет за счёт менее дорогого корпуса.`)
    }
  }

  if (cpu && gpu && cpu.price && gpu.price) {
    const ratio = cpu.price / Math.max(gpu.price, 1)
    if (ratio > 2.2) {
      issues.push('GPU слишком слабый относительно CPU: часть потенциала процессора теряется в играх.')
      const strongerGpu = betterByPerf(getCategoryRecords('gpu'), perfScore(gpu), (gpu.price || 0) + 15000)
      if (strongerGpu) fixesOptimal.push(`Заменить GPU на ${strongerGpu.name} для более сбалансированной связки.`)
      const cheaperCpu = nearestByPrice(getCategoryRecords('cpu'), gpu.price * 1.6)
      if (cheaperCpu) fixesNoBudgetIncrease.push(`Снизить CPU до ${cheaperCpu.name}, сохранив текущий GPU без роста бюджета.`)
    }
  }

  if (motherboard && cpu && motherboard.price && cpu.price && motherboard.price > cpu.price * 0.95) {
    issues.push('Есть риск переплаты за материнскую плату относительно выбранного CPU.')
    const cheaperBoard = nearestByPrice(getCategoryRecords('motherboard'), cpu.price * 0.55)
    if (cheaperBoard) {
      fixesMinimal.push(`Рассмотреть более рациональную плату: ${cheaperBoard.name}.`)
      fixesNoBudgetIncrease.push(`Перенаправить экономию с платы на более сильный GPU или SSD.`)
    }
  }

  const cpuTdp = parseNumeric(cpu?.specs?.TDP)
  const coolerTdp = parseNumeric(cooler?.specs?.TDP)
  if (cpu && cooler && cpuTdp > 0 && coolerTdp > 0 && coolerTdp < cpuTdp) {
    issues.push('Кулер слабоват для текущего CPU: возможны высокие температуры и шум.')
    const strongerCooler = betterByPerf(getCategoryRecords('cooler'), coolerTdp, (cooler.price || 0) + 5000)
    if (strongerCooler) {
      fixesMinimal.push(`Поменять кулер на ${strongerCooler.name}.`)
      fixesOptimal.push(`Усилить охлаждение до ${strongerCooler.name} для стабильных буст-частот.`)
    }
  }

  const cpuPower = parseNumeric(cpu?.specs?.TDP)
  const gpuPower = parseNumeric(gpu?.specs?.Энергопотребление)
  const psuPower = parseNumeric(powerSupply?.specs?.Мощность)
  const requiredPower = Math.round((cpuPower + gpuPower) * 1.45)
  if (powerSupply && requiredPower > 0 && psuPower < requiredPower) {
    issues.push('БП без запаса: мощности может не хватить под нагрузкой и апгрейдом.')
    const strongerPsu = nearestByPrice(getCategoryRecords('power_supply'), requiredPower)
    if (strongerPsu) {
      fixesMinimal.push(`Установить БП не ниже ${requiredPower} Вт, например ${strongerPsu.name}.`)
      fixesOptimal.push(`Поставить более эффективный БП ${strongerPsu.name} с запасом по мощности.`)
    }
  }

  if (budget > 0 && totalPrice > budget) {
    issues.push('Сборка превышает бюджет.')
    fixesMinimal.push('Снизить стоимость одной самой дорогой позиции на следующий класс ниже.')
    const mostExpensive = Object.values(selectedRecordsByCategory).filter(Boolean).sort((a, b) => (b.price || 0) - (a.price || 0))[0]
    if (mostExpensive) {
      const alternative = nearestByPrice(getCategoryRecords(mostExpensive.categoryKey), (mostExpensive.price || 0) * 0.85)
      if (alternative) fixesNoBudgetIncrease.push(`Заменить ${mostExpensive.name} на ${alternative.name} чтобы вернуться в лимит.`)
    }
  }

  if (issues.length === 0) {
    fixesMinimal.push('Критичных проблем не найдено, можно оставить текущий набор.')
    fixesOptimal.push('Для апгрейда в будущем держите запас по БП и охлаждению.')
    fixesNoBudgetIncrease.push('Без увеличения бюджета сборка уже выглядит сбалансированной.')
  }

  return {
    issues,
    fixes: {
      minimal: fixesMinimal,
      optimal: fixesOptimal,
      noBudgetIncrease: fixesNoBudgetIncrease
    }
  }
}
