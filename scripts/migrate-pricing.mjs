import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseEnvValue(raw) {
  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  // Match dotenv/Vite escaping for keys like \$2a$10$...
  return value.replace(/\\(.)/g, '$1');
}

function loadEnvFile(filename) {
  try {
    const envPath = resolve(process.cwd(), filename);
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = parseEnvValue(trimmed.slice(eq + 1));
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional env file
  }
}

function loadEnv() {
  loadEnvFile('.env');
  loadEnvFile('.env.local');
}

function resolveMonthPricing(monthData, settings) {
  const enelBase = monthData.enelBaseCostPerKwh ?? 0;
  const distFee = settings.distributionFeePerKwh ?? 0;
  let discountPerKwh = monthData.discountPerKwh;
  if (discountPerKwh == null) {
    if (monthData.energyValue != null) {
      discountPerKwh = enelBase - monthData.energyValue - distFee;
    } else {
      discountPerKwh = 0;
    }
  }
  const chargedRatePerKwh = enelBase - discountPerKwh;
  const profitPerKwh = chargedRatePerKwh - distFee;
  return { discountPerKwh, chargedRatePerKwh, profitPerKwh };
}

function migrateEnelBaseCost(data) {
  const legacyTariff = data.settings.enelTariff;
  let changed = false;
  const months = { ...data.months };

  if (legacyTariff != null) {
    for (const [monthKey, month] of Object.entries(data.months)) {
      if (month.enelBaseCostPerKwh != null) continue;
      months[monthKey] = { ...month, enelBaseCostPerKwh: legacyTariff };
      changed = true;
      console.log(`${monthKey}: enelBaseCostPerKwh <- enelTariff ${legacyTariff}`);
    }
  }

  let settings = data.settings;
  if ('enelTariff' in settings) {
    const { enelTariff, ...rest } = settings;
    settings = rest;
    changed = true;
    console.log(`Removed legacy settings.enelTariff (${enelTariff})`);
  }

  return changed ? { data: { ...data, settings, months }, changed: true } : { data, changed: false };
}

function migrateMonthDiscounts(data) {
  let changed = false;
  const months = { ...data.months };

  for (const [monthKey, month] of Object.entries(data.months)) {
    if (month.discountPerKwh != null || month.energyValue == null) continue;
    const { discountPerKwh } = resolveMonthPricing(month, data.settings);
    months[monthKey] = { ...month, discountPerKwh };
    changed = true;
    console.log(`${monthKey}: energyValue ${month.energyValue} -> discountPerKwh ${discountPerKwh.toFixed(4)}`);
  }

  return changed ? { data: { ...data, months }, changed: true } : { data, changed: false };
}

function migrateAppData(data) {
  const base = migrateEnelBaseCost(data);
  const discounts = migrateMonthDiscounts(base.data);
  return {
    data: discounts.data,
    changed: base.changed || discounts.changed,
  };
}

loadEnv();

const BIN_ID = process.env.VITE_JSONBIN_BIN_ID;
const API_KEY = process.env.VITE_JSONBIN_API_KEY;

if (!BIN_ID || !API_KEY) {
  console.error('Missing VITE_JSONBIN_BIN_ID or VITE_JSONBIN_API_KEY');
  console.error('Set them in .env or export before running this script.');
  process.exit(1);
}

console.log(`Using bin ${BIN_ID.slice(0, 4)}...${BIN_ID.slice(-4)}`);

const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

const res = await fetch(`${BASE_URL}/latest`, {
  headers: { 'X-Master-Key': API_KEY },
});
if (!res.ok) {
  console.error('Failed to fetch data:', res.status, await res.text());
  process.exit(1);
}

const json = await res.json();
const data = json.record;
const { data: migrated, changed } = migrateAppData(data);

if (!changed) {
  console.log('No migration needed.');
  process.exit(0);
}

const saveRes = await fetch(BASE_URL, {
  method: 'PUT',
  headers: {
    'X-Master-Key': API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(migrated),
});

if (!saveRes.ok) {
  console.error('Failed to save data:', saveRes.status, await saveRes.text());
  process.exit(1);
}

console.log('Migration saved successfully.');
