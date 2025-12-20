export default function formatCurrency(currency, amount) {
  const code = currency ? String(currency).toUpperCase() : 'EUR';
  const symbols = { EUR: '€', USD: '$', GBP: '£', JPY: '¥' };
  const sym = symbols[code] || '';
  const num = (amount === undefined || amount === null || isNaN(Number(amount))) ? 0 : Number(amount);

  // Keep two decimal places
  let formatted = num.toFixed(2);

  // Replace dot with comma for European style (Portugal)
  // You might want to make this conditional on locale or currency if the app supports US style too.
  // Assuming the user wants this generally for the current target market (Portugal/EUR):
  formatted = formatted.replace('.', ',');

  if (sym) return `${sym}${formatted}`;
  if (code) return `${code} ${formatted}`;
  return formatted;
}
