/**
 * Settings Repository
 * CRUD operations for application settings
 */

import { query, execute } from './connection';
import type { Setting, AppSettings, CompanyInfo } from './types';

/**
 * Get a single setting value
 */
export async function getSetting(key: string): Promise<string | null> {
  const results = await query<Setting>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return results.length > 0 ? results[0].value : null;
}

/**
 * Set a setting value
 */
export async function setSetting(key: string, value: string): Promise<void> {
  await execute(
    `INSERT OR REPLACE INTO settings (key, value, updated_at)
     VALUES (?, ?, datetime('now'))`,
    [key, value]
  );
}

/**
 * Get all settings as AppSettings object
 */
export async function getAppSettings(): Promise<AppSettings> {
  const results = await query<Setting>('SELECT key, value FROM settings');

  const settingsMap = new Map<string, string>();
  results.forEach(s => settingsMap.set(s.key, s.value));

  return {
    default_price_markup: parseFloat(settingsMap.get('default_price_markup') || '45'),
    default_material_markup: parseFloat(settingsMap.get('default_material_markup') || '25'),
    default_tax_rate: parseFloat(settingsMap.get('default_tax_rate') || '10'),
    minimum_order_amount: parseFloat(settingsMap.get('minimum_order_amount') || '100'),
    pricing_strategy: (settingsMap.get('pricing_strategy') || 'hybrid') as AppSettings['pricing_strategy'],
    min_utilization_threshold: parseFloat(settingsMap.get('min_utilization_threshold') || '75'),
    scrap_value_percent: parseFloat(settingsMap.get('scrap_value_percent') || '40'),
    default_validity_days: parseInt(settingsMap.get('default_validity_days') || '7'),
    currency_symbol: settingsMap.get('currency_symbol') || '$',
    currency_code: settingsMap.get('currency_code') || 'AUD',
  };
}

/**
 * Update multiple settings at once
 */
export async function updateAppSettings(settings: Partial<AppSettings>): Promise<void> {
  const updates: [string, string][] = [];

  if (settings.default_price_markup !== undefined) {
    updates.push(['default_price_markup', settings.default_price_markup.toString()]);
  }
  if (settings.default_material_markup !== undefined) {
    updates.push(['default_material_markup', settings.default_material_markup.toString()]);
  }
  if (settings.default_tax_rate !== undefined) {
    updates.push(['default_tax_rate', settings.default_tax_rate.toString()]);
  }
  if (settings.minimum_order_amount !== undefined) {
    updates.push(['minimum_order_amount', settings.minimum_order_amount.toString()]);
  }
  if (settings.pricing_strategy !== undefined) {
    updates.push(['pricing_strategy', settings.pricing_strategy]);
  }
  if (settings.min_utilization_threshold !== undefined) {
    updates.push(['min_utilization_threshold', settings.min_utilization_threshold.toString()]);
  }
  if (settings.scrap_value_percent !== undefined) {
    updates.push(['scrap_value_percent', settings.scrap_value_percent.toString()]);
  }
  if (settings.default_validity_days !== undefined) {
    updates.push(['default_validity_days', settings.default_validity_days.toString()]);
  }
  if (settings.currency_symbol !== undefined) {
    updates.push(['currency_symbol', settings.currency_symbol]);
  }
  if (settings.currency_code !== undefined) {
    updates.push(['currency_code', settings.currency_code]);
  }

  for (const [key, value] of updates) {
    await setSetting(key, value);
  }
}

/**
 * Get company information
 */
export async function getCompanyInfo(): Promise<CompanyInfo | null> {
  const results = await query<CompanyInfo>('SELECT * FROM company_info LIMIT 1');
  return results.length > 0 ? results[0] : null;
}

/**
 * Update company information
 */
export async function updateCompanyInfo(info: Partial<CompanyInfo>): Promise<void> {
  const existing = await getCompanyInfo();

  if (existing && existing.id) {
    await execute(
      `UPDATE company_info SET
        company_name = ?, business_no = ?, address_line1 = ?, address_line2 = ?,
        city = ?, state = ?, zip = ?, country = ?, phone = ?, email = ?, website = ?,
        logo_path = ?, updated_at = datetime('now')
      WHERE id = ?`,
      [
        info.company_name ?? existing.company_name,
        info.business_no ?? existing.business_no,
        info.address_line1 ?? existing.address_line1,
        info.address_line2 ?? existing.address_line2,
        info.city ?? existing.city,
        info.state ?? existing.state,
        info.zip ?? existing.zip,
        info.country ?? existing.country,
        info.phone ?? existing.phone,
        info.email ?? existing.email,
        info.website ?? existing.website,
        info.logo_path ?? existing.logo_path,
        existing.id,
      ]
    );
  } else {
    await execute(
      `INSERT INTO company_info (
        company_name, business_no, address_line1, address_line2,
        city, state, zip, country, phone, email, website, logo_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        info.company_name ?? '',
        info.business_no ?? '',
        info.address_line1 ?? '',
        info.address_line2 ?? '',
        info.city ?? '',
        info.state ?? '',
        info.zip ?? '',
        info.country ?? '',
        info.phone ?? '',
        info.email ?? '',
        info.website ?? '',
        info.logo_path ?? '',
      ]
    );
  }
}

export default {
  getSetting,
  setSetting,
  getAppSettings,
  updateAppSettings,
  getCompanyInfo,
  updateCompanyInfo,
};
