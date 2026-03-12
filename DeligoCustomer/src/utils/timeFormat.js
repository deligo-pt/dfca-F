/**
 * Formats time from minutes or a range of minutes to HH:MM or HH:MM - HH:MM format.
 * If input is a string like "25-35 min", it extracts the numbers and formats them.
 * If input is a number, it formats it directly.
 * 
 * @param {string|number} timeInput - Minutes (e.g., 75, "25-35 min", "45")
 * @returns {string} Formatted time (e.g., "01:15", "00:25 - 00:35")
 */
export const formatMinutesToUX = (timeInput) => {
  if (!timeInput) return '';

  const formatSingle = (mins) => {
    if (!mins || mins <= 0) return '15 min';

    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    
    if (hours === 0) {
      return `${minutes} min`;
    } else if (minutes === 0) {
      return `${hours} hour`;
    } else {
      // Always "X hour Y min" format as requested
      return `${hours} hour ${minutes} min`;
    }
  };

  if (typeof timeInput === 'number') {
    return formatSingle(timeInput);
  }

  if (typeof timeInput === 'string') {
    const trimmed = timeInput.trim();
    
    // ── Better Guard: Check if it already contains "min" or "hour"
    // If it looks like "25-35 min", "1 hour 5 min", etc., just return it
    if (trimmed.includes('min') || trimmed.includes('hour')) {
      return trimmed;
    }

    // Check for ranges like "25-35" or "25 - 35" (raw numbers)
    const rangeMatch = trimmed.match(/^(\d+)\s*[-]\s*(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      return `${formatSingle(start)} - ${formatSingle(end)}`;
    }

    // Check for single raw number strings like "45"
    if (/^\d+$/.test(trimmed)) {
      return formatSingle(parseInt(trimmed, 10));
    }
  }

  return timeInput;
};

export default formatMinutesToUX;
