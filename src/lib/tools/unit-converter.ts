export type UnitCategory = 'length' | 'mass' | 'temperature' | 'time' | 'data';

export type UnitOption = {
  value: string;
  label: string;
  factor?: number;
};

export const UNIT_CATEGORIES: Record<UnitCategory, { label: string; units: UnitOption[] }> = {
  length: {
    label: 'Độ dài',
    units: [
      { value: 'mm', label: 'Milimét (mm)', factor: 0.001 },
      { value: 'cm', label: 'Xentimét (cm)', factor: 0.01 },
      { value: 'm', label: 'Mét (m)', factor: 1 },
      { value: 'km', label: 'Kilômét (km)', factor: 1000 },
      { value: 'in', label: 'Inch (in)', factor: 0.0254 },
      { value: 'ft', label: 'Foot (ft)', factor: 0.3048 },
      { value: 'mi', label: 'Dặm (mi)', factor: 1609.344 },
    ],
  },
  mass: {
    label: 'Khối lượng',
    units: [
      { value: 'mg', label: 'Miligam (mg)', factor: 0.000001 },
      { value: 'g', label: 'Gam (g)', factor: 0.001 },
      { value: 'kg', label: 'Kilôgam (kg)', factor: 1 },
      { value: 't', label: 'Tấn (t)', factor: 1000 },
      { value: 'oz', label: 'Ounce (oz)', factor: 0.028349523125 },
      { value: 'lb', label: 'Pound (lb)', factor: 0.45359237 },
    ],
  },
  temperature: {
    label: 'Nhiệt độ',
    units: [
      { value: 'c', label: 'Celsius (°C)' },
      { value: 'f', label: 'Fahrenheit (°F)' },
      { value: 'k', label: 'Kelvin (K)' },
    ],
  },
  time: {
    label: 'Thời gian',
    units: [
      { value: 'ms', label: 'Mili giây (ms)', factor: 0.001 },
      { value: 's', label: 'Giây (s)', factor: 1 },
      { value: 'min', label: 'Phút (min)', factor: 60 },
      { value: 'h', label: 'Giờ (h)', factor: 3600 },
      { value: 'day', label: 'Ngày', factor: 86400 },
      { value: 'week', label: 'Tuần', factor: 604800 },
    ],
  },
  data: {
    label: 'Dung lượng dữ liệu',
    units: [
      { value: 'B', label: 'Byte (B)', factor: 1 },
      { value: 'KB', label: 'Kilobyte (KB, 1000 B)', factor: 1000 },
      { value: 'MB', label: 'Megabyte (MB, 1000 KB)', factor: 1_000_000 },
      { value: 'GB', label: 'Gigabyte (GB, 1000 MB)', factor: 1_000_000_000 },
      { value: 'TB', label: 'Terabyte (TB, 1000 GB)', factor: 1_000_000_000_000 },
      { value: 'KiB', label: 'Kibibyte (KiB, 1024 B)', factor: 1024 },
      { value: 'MiB', label: 'Mebibyte (MiB, 1024 KiB)', factor: 1_048_576 },
      { value: 'GiB', label: 'Gibibyte (GiB, 1024 MiB)', factor: 1_073_741_824 },
    ],
  },
};

function convertTemperature(value: number, from: string, to: string): number {
  let celsius: number;
  switch (from) {
    case 'c': celsius = value; break;
    case 'f': celsius = (value - 32) * 5 / 9; break;
    case 'k':
      celsius = value - 273.15;
      break;
    default: throw new Error('Đơn vị nhiệt độ không hợp lệ.');
  }
  switch (to) {
    case 'c': return celsius;
    case 'f': return celsius * 9 / 5 + 32;
    case 'k': return celsius + 273.15;
    default: throw new Error('Đơn vị nhiệt độ không hợp lệ.');
  }
}

export function convertUnits(value: number, category: UnitCategory, from: string, to: string): number {
  if (!Number.isFinite(value)) throw new Error('Giá trị phải là một số hữu hạn.');
  const config = UNIT_CATEGORIES[category];
  if (!config) throw new Error('Nhóm đơn vị không hợp lệ.');
  if (!config.units.some((unit) => unit.value === from) || !config.units.some((unit) => unit.value === to)) {
    throw new Error('Đơn vị không thuộc nhóm đang chọn.');
  }

  let result: number;
  if (category === 'temperature') {
    const kelvin = convertTemperature(value, from, 'k');
    if (kelvin < 0) throw new Error('Nhiệt độ không thể thấp hơn độ không tuyệt đối (0 K).');
    result = convertTemperature(value, from, to);
  } else {
    const sourceFactor = config.units.find((unit) => unit.value === from)?.factor;
    const targetFactor = config.units.find((unit) => unit.value === to)?.factor;
    if (!sourceFactor || !targetFactor) throw new Error('Không tìm thấy hệ số chuyển đổi.');
    result = value * sourceFactor / targetFactor;
  }

  if (!Number.isFinite(result)) throw new Error('Kết quả vượt miền số hữu hạn.');
  return Object.is(result, -0) ? 0 : result;
}
