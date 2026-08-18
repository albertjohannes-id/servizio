import { Asset, Vendor } from '../domain/types';
import { addDaysIso, todayIso } from '../domain/status';

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export const SEED_VENDORS: Vendor[] = [
  { id: 'v_shop_and_drive', name: 'Shop And Drive', isSeed: true, createdAt: todayIso() },
  { id: 'v_bengkel_bos', name: 'Bengkel Bos', isSeed: true, createdAt: todayIso() },
  { id: 'v_mister_oli', name: 'Mister Oli', isSeed: true, createdAt: todayIso() },
  { id: 'v_bquik', name: 'B-Quik', isSeed: true, createdAt: todayIso() },
  { id: 'v_rotary', name: 'Rotary Auto', isSeed: true, createdAt: todayIso() },
];

export function createSeedAssets(): Asset[] {
  const now = todayIso();
  return [
    {
      id: id('asset'),
      name: 'Family Car',
      type: 'car',
      brand: 'Toyota',
      model: 'Avanza',
      manufactureYear: 2019,
      purchaseYear: 2019,
      condition: 'working',
      serviceOverride: null,
      nextServiceAt: addDaysIso(now, 10),
      usageEnabled: true,
      usageCurrent: 45200,
      usageInterval: 5000,
      usageNextDue: 46000,
      archived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: id('asset'),
      name: 'Living Room AC',
      type: 'ac',
      brand: 'Daikin',
      model: 'FTKC25',
      manufactureYear: 2021,
      purchaseYear: 2022,
      condition: 'needs_attention',
      serviceOverride: null,
      nextServiceAt: addDaysIso(now, 45),
      usageEnabled: false,
      usageCurrent: null,
      usageInterval: null,
      usageNextDue: null,
      archived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: id('asset'),
      name: 'Water Heater',
      type: 'water_heater',
      brand: 'Ariston',
      model: 'Andris',
      manufactureYear: 2020,
      purchaseYear: 2020,
      condition: 'working',
      serviceOverride: null,
      nextServiceAt: addDaysIso(now, -12),
      usageEnabled: false,
      usageCurrent: null,
      usageInterval: null,
      usageNextDue: null,
      archived: false,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export const BRANDS_BY_TYPE: Record<string, string[]> = {
  car: [
    'Toyota',
    'Honda',
    'Daihatsu',
    'Suzuki',
    'Mitsubishi',
    'Nissan',
    'Mazda',
    'Hyundai',
    'Wuling',
    'BMW',
    'Mercedes-Benz',
  ],
  motorcycle: ['Honda', 'Yamaha', 'Suzuki', 'Kawasaki', 'Vespa', 'BMW'],
  bike: ['Polygon', 'United', 'Giant', 'Trek', 'Pacific'],
  ac: ['Daikin', 'Panasonic', 'Sharp', 'LG', 'Samsung', 'Gree', 'Midea', 'Mitsubishi Electric'],
  water_heater: ['Ariston', 'Modena', 'Rinnai', 'Paloma', 'Bosch'],
  other: [],
};

export const DEFAULT_INTERVALS: Record<string, { days: number; km?: number }> = {
  car: { days: 180, km: 5000 },
  motorcycle: { days: 90, km: 2000 },
  bike: { days: 180, km: 500 },
  ac: { days: 180 },
  water_heater: { days: 365 },
  other: { days: 180 },
};
