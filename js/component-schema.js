export const categoryFormConfig = {
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

export const firebaseCategoryOptions = Object.entries(categoryFormConfig).map(([key, value]) => ({ key, label: value.label }))
