export default function formatCurrency(currencyIgnored, amount) {
  // Enforce EUR currency
  const code = 'EUR';
  const symbols = { EUR: '€' };
  const sym = '€';
  const num = (amount === undefined || amount === null || isNaN(Number(amount))) ? 0 : Number(amount);

  // Keep two decimal places
  let formatted = num.toFixed(2);

  // Use European decimal format (comma)
  formatted = formatted.replace('.', ',');

  if (sym) return `${sym}${formatted}`;
  if (code) return `${code} ${formatted}`;
  return formatted;
}
