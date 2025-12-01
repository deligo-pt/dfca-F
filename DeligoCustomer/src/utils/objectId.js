// Utility for validating MongoDB ObjectId format and lightweight diagnostics
// A valid ObjectId is a 24-character hex string
export function isValidObjectId(str) {
  if (typeof str !== 'string') return false;
  return /^[0-9a-fA-F]{24}$/.test(str.trim());
}

export function explainInvalidObjectId(str) {
  if (str == null) return 'value is null/undefined';
  if (typeof str !== 'string') return `expected string got ${typeof str}`;
  const trimmed = str.trim();
  if (trimmed.length !== 24) return `length ${trimmed.length} != 24`;
  if (!/^[0-9a-fA-F]+$/.test(trimmed)) return 'contains non-hex characters';
  return 'unknown';
}
