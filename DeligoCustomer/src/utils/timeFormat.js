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
    // Safety check: if mins is suspiciously large (e.g., > 8 hours), 
    // it's likely a bug or seconds being passed as minutes.
    if (mins >= 480) {
        // Detected a bug (e.g. the 624h bug or seconds passed as mins). Fallback to standard range.
        return '25-35 min';
    }

    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    
    if (hours === 0) {
      return `${minutes} min`;
    } else if (hours > 24) {
      // Still too large? Maybe it was seconds.
      const realMins = Math.floor(mins / 60);
      return realMins > 0 ? `${realMins} min` : '25-35 min';
    } else if (minutes === 0) {
      return `${hours} hour`;
    } else {
      return `${hours} hour ${minutes} min`;
    }
  };

  if (typeof timeInput === 'number') {
    return formatSingle(timeInput);
  }

  if (typeof timeInput === 'string') {
    // Check for ranges like "25-35 min" or "25 - 35"
    const rangeMatch = timeInput.match(/(\d+)\s*-\s*(\d+)/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      return `${formatSingle(start)} - ${formatSingle(end)}`;
    }

    // Check for single number in string like "45 min" or "45"
    const singleMatch = timeInput.match(/(\d+)/);
    if (singleMatch) {
      return formatSingle(parseInt(singleMatch[1], 10));
    }
  }

  return timeInput;
};

export default formatMinutesToUX;
