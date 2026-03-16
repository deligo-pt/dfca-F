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
    if (!mins || mins <= 0) return '15 m';
    
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    
    if (hours === 0) {
      return `${minutes} m`;
    } else if (minutes === 0) {
      return `${hours} h`;
    } else {
      return `${hours} h ${minutes} m`;
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

/**
 * Converts a 24-hour time string (e.g., "14:30") or range (e.g., "09:00 – 23:00")
 * to 12-hour format (e.g., "02:30 PM" or "09:00 AM – 11:00 PM").
 * 
 * @param {string} timeInput - Time string or range
 * @returns {string} Formatted 12-hour time string or range
 */
export const to12Hour = (timeInput) => {
  if (!timeInput || typeof timeInput !== 'string') return timeInput;
  
  const convertSingle = (t) => {
    const trimmed = t.trim();
    // Match HH:mm or H:mm
    const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return trimmed;

    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    
    return `${hours}:${minutes} ${ampm}`;
  };

  // Detect and split ranges
  if (timeInput.includes('–')) {
    return timeInput.split('–').map(convertSingle).join(' – ');
  }
  if (timeInput.includes(' - ')) {
    return timeInput.split(' - ').map(convertSingle).join(' - ');
  }
  if (timeInput.includes(' to ')) {
    return timeInput.split(' to ').map(convertSingle).join(' to ');
  }

  return convertSingle(timeInput);
};

export default formatMinutesToUX;
