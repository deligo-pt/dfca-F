// Small currency formatter used across the app
// Accepts currency code (e.g. 'EUR') and numeric amount and returns a string like '€12.34'
export default function formatCurrency(currency, amount) {
  const code = currency ? String(currency).toUpperCase() : 'EUR';
  const symbols = { EUR: '€', USD: '$', GBP: '£', JPY: '¥' };
  const sym = symbols[code] || '';
  const num = (amount === undefined || amount === null || isNaN(Number(amount))) ? 0 : Number(amount);
  // Keep two decimal places
  const formatted = num.toFixed(2);
  if (sym) return `${sym}${formatted}`;
  if (code) return `${code} ${formatted}`;
  return formatted;
}

