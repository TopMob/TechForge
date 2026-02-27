export const categoryFormConfig = {
  cpu: {
    label: 'Процессор (CPU)',
    requiredHint: 'Обязательно: бренд, модель, цена, частота, ядра, потоки.',
    fields: [
      { key: 'vendor', label: 'Бренд', required: true, placeholder: 'Intel или AMD' },
      { key: 'model', label: 'Модель', required: true, placeholder: 'Core i5-14600K / Ryzen 7 7800X3D' },
      { key: 'price', label: 'Цена ($)', type: 'number', required: true, placeholder: '320' },
      { key: 'baseClock', label: 'Базовая частота (ГГц)', type: 'number', required: true, placeholder: '3.5' },
      { key: 'boostClock', label: 'Boost частота (ГГц)', type: 'number', placeholder: '5.2' },
      { key: 'cores', label: 'Ядра', type: 'number', required: true, placeholder: '8' },
      { key: 'threads', label: 'Потоки', type: 'number', required: true, placeholder: '16' },
      { key: 'socket', label: 'Сокет', placeholder: 'AM5 / LGA1700' },
      { key: 'tdp', label: 'TDP (Вт)', type: 'number', placeholder: '120' },
      { key: 'cache', label: 'Кэш', placeholder: '96MB L3' },
      { key: 'process', label: 'Техпроцесс', placeholder: '5 nm' },
      { key: 'iGpu', label: 'Встроенная графика', placeholder: 'Radeon Graphics / нет' }
    ]
  },
  gpu: {
    label: 'Видеокарта (GPU)',
    requiredHint: 'Обязательно: бренд, модель, цена, память, частоты, энергопотребление.',
    fields: [
      { key: 'vendor', label: 'Бренд', required: true, placeholder: 'NVIDIA / AMD / Intel' },
      { key: 'model', label: 'Модель', required: true, placeholder: 'RTX 4070 SUPER' },
      { key: 'price', label: 'Цена ($)', type: 'number', required: true, placeholder: '599' },
      { key: 'chipset', label: 'Графический чип', placeholder: 'AD104' },
      { key: 'memory', label: 'Память (ГБ)', type: 'number', required: true, placeholder: '12' },
      { key: 'memoryType', label: 'Тип памяти', placeholder: 'GDDR6X' },
      { key: 'memoryBus', label: 'Шина памяти', placeholder: '192-bit' },
      { key: 'coreClock', label: 'Базовая частота GPU (МГц)', type: 'number', placeholder: '1980' },
      { key: 'boostClock', label: 'Boost частота GPU (МГц)', type: 'number', required: true, placeholder: '2475' },
      { key: 'tdp', label: 'Энергопотребление (Вт)', type: 'number', required: true, placeholder: '220' },
      { key: 'length', label: 'Длина карты (мм)', type: 'number', placeholder: '300' },
      { key: 'connectors', label: 'Разъёмы питания', placeholder: '1x16-pin / 2x8-pin' }
    ]
  },
  ram: {
    label: 'Оперативная память (RAM)',
    requiredHint: 'Обязательно: бренд, модель, цена, объём, частота, тип.',
    fields: [
      { key: 'vendor', label: 'Бренд', required: true, placeholder: 'Kingston / G.Skill' },
      { key: 'model', label: 'Модель', required: true, placeholder: 'Fury Beast' },
      { key: 'price', label: 'Цена ($)', type: 'number', required: true, placeholder: '110' },
      { key: 'capacity', label: 'Объём (ГБ)', type: 'number', required: true, placeholder: '32' },
      { key: 'modules', label: 'Конфигурация модулей', placeholder: '2x16GB' },
      { key: 'type', label: 'Тип', required: true, placeholder: 'DDR4 / DDR5' },
      { key: 'frequency', label: 'Частота (МГц)', type: 'number', required: true, placeholder: '6000' },
      { key: 'timings', label: 'Тайминги', placeholder: 'CL30' },
      { key: 'voltage', label: 'Напряжение', placeholder: '1.35V' },
      { key: 'profile', label: 'XMP/EXPO', placeholder: 'EXPO' }
    ]
  },
  motherboard: {
    label: 'Материнская плата (MB)',
    requiredHint: 'Обязательно: бренд, модель, цена, сокет, чипсет, формфактор.',
    fields: [
      { key: 'vendor', label: 'Бренд', required: true, placeholder: 'ASUS / MSI / Gigabyte' },
      { key: 'model', label: 'Модель', required: true, placeholder: 'B650 AORUS ELITE AX' },
      { key: 'price', label: 'Цена ($)', type: 'number', required: true, placeholder: '229' },
      { key: 'socket', label: 'Сокет', required: true, placeholder: 'AM5 / LGA1700' },
      { key: 'chipset', label: 'Чипсет', required: true, placeholder: 'B650 / Z790' },
      { key: 'formFactor', label: 'Формфактор', required: true, placeholder: 'ATX / mATX / ITX' },
      { key: 'memoryType', label: 'Тип RAM', placeholder: 'DDR5' },
      { key: 'memorySlots', label: 'Слоты RAM', type: 'number', placeholder: '4' },
      { key: 'maxMemory', label: 'Макс. объём RAM (ГБ)', type: 'number', placeholder: '192' },
      { key: 'pcie', label: 'PCIe версия', placeholder: 'PCIe 5.0' },
      { key: 'm2slots', label: 'Слоты M.2', type: 'number', placeholder: '3' }
    ]
  },
  power_supply: {
    label: 'Блок питания (PSU)',
    requiredHint: 'Обязательно: бренд, модель, цена, мощность, сертификат.',
    fields: [
      { key: 'vendor', label: 'Бренд', required: true, placeholder: 'Corsair / be quiet!' },
      { key: 'model', label: 'Модель', required: true, placeholder: 'RM850x' },
      { key: 'price', label: 'Цена ($)', type: 'number', required: true, placeholder: '149' },
      { key: 'wattage', label: 'Мощность (Вт)', type: 'number', required: true, placeholder: '850' },
      { key: 'efficiency', label: 'Сертификат', required: true, placeholder: '80+ Gold' },
      { key: 'modular', label: 'Модульность', placeholder: 'Full / Semi / No' },
      { key: 'atxVersion', label: 'Стандарт', placeholder: 'ATX 3.0' },
      { key: 'fanSize', label: 'Размер вентилятора', placeholder: '135 мм' }
    ]
  },
  ssd: {
    label: 'SSD',
    requiredHint: 'Обязательно: бренд, модель, цена, объём, интерфейс, скорость чтения.',
    fields: [
      { key: 'vendor', label: 'Бренд', required: true, placeholder: 'Samsung / WD / Kingston' },
      { key: 'model', label: 'Модель', required: true, placeholder: '990 PRO' },
      { key: 'price', label: 'Цена ($)', type: 'number', required: true, placeholder: '139' },
      { key: 'capacity', label: 'Объём (ГБ)', type: 'number', required: true, placeholder: '1000' },
      { key: 'interface', label: 'Интерфейс', required: true, placeholder: 'NVMe PCIe 4.0 / SATA' },
      { key: 'formFactor', label: 'Формфактор', placeholder: 'M.2 2280 / 2.5"' },
      { key: 'readSpeed', label: 'Скорость чтения (МБ/с)', type: 'number', required: true, placeholder: '7450' },
      { key: 'writeSpeed', label: 'Скорость записи (МБ/с)', type: 'number', placeholder: '6900' },
      { key: 'tbw', label: 'Ресурс TBW', placeholder: '600 TBW' }
    ]
  },
  case: {
    label: 'Корпус',
    requiredHint: 'Обязательно: бренд, модель, цена, формфактор.',
    fields: [
      { key: 'vendor', label: 'Бренд', required: true, placeholder: 'NZXT / Lian Li' },
      { key: 'model', label: 'Модель', required: true, placeholder: 'H7 Flow' },
      { key: 'price', label: 'Цена ($)', type: 'number', required: true, placeholder: '129' },
      { key: 'formFactor', label: 'Поддержка MB', required: true, placeholder: 'ATX / mATX / ITX' },
      { key: 'type', label: 'Тип корпуса', placeholder: 'Mid Tower' },
      { key: 'color', label: 'Цвет', placeholder: 'Black' },
      { key: 'maxGpuLength', label: 'Макс. длина GPU (мм)', type: 'number', placeholder: '400' },
      { key: 'fansIncluded', label: 'Вентиляторы в комплекте', placeholder: '3x120мм' }
    ]
  },
  cooler: {
    label: 'Охлаждение CPU',
    requiredHint: 'Обязательно: бренд, модель, цена, тип, поддержка сокетов.',
    fields: [
      { key: 'vendor', label: 'Бренд', required: true, placeholder: 'DeepCool / Noctua' },
      { key: 'model', label: 'Модель', required: true, placeholder: 'AK620 / NH-D15' },
      { key: 'price', label: 'Цена ($)', type: 'number', required: true, placeholder: '79' },
      { key: 'type', label: 'Тип', required: true, placeholder: 'Air / AIO' },
      { key: 'size', label: 'Размер радиатора/вентилятора', placeholder: '120 / 240 / 360 мм' },
      { key: 'socketSupport', label: 'Совместимые сокеты', required: true, placeholder: 'AM5, AM4, LGA1700' },
      { key: 'noise', label: 'Уровень шума', placeholder: '28 dBA' },
      { key: 'tdp', label: 'Поддерживаемый TDP (Вт)', type: 'number', placeholder: '260' }
    ]
  }
}

export const firebaseCategoryOptions = Object.entries(categoryFormConfig).map(([key, value]) => ({ key, label: value.label }))
