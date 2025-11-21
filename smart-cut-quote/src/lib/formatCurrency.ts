/**
 * Currency formatting utilities
 */

/**
 * Format a number as Vietnamese Dong currency
 * @param amount - The amount to format
 * @returns Formatted string with VNĐ symbol
 */
export function formatCurrency(amount: number): string {
  // Format with thousand separators and no decimal places for VNĐ
  return `${amount.toLocaleString('vi-VN')} VNĐ`;
}

/**
 * Format a number as currency with decimals (for prices that need precision)
 * @param amount - The amount to format
 * @param decimals - Number of decimal places (default: 0 for VNĐ)
 * @returns Formatted string with VNĐ symbol
 */
export function formatCurrencyWithDecimals(amount: number, decimals: number = 0): string {
  return `${amount.toLocaleString('vi-VN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} VNĐ`;
}

/**
 * Format price per unit (e.g., per kg, per meter)
 * @param amount - The amount to format
 * @param unit - The unit (e.g., 'kg', 'm', 'm²')
 * @returns Formatted string like "1,500 VNĐ/kg"
 */
export function formatPricePerUnit(amount: number, unit: string): string {
  return `${amount.toLocaleString('vi-VN')} VNĐ/${unit}`;
}

export default {
  formatCurrency,
  formatCurrencyWithDecimals,
  formatPricePerUnit,
};
