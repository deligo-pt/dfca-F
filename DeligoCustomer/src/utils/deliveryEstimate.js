import { GOOGLE_MAPS_CONFIG } from '../constants/config';

const DISTANCE_MATRIX_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';

// Max realistic food delivery drive time.
// If Google returns more than this, vendor is too far → fall back to vendor default.
const MAX_DRIVE_TIME_MIN = 45;

// Food preparation buffer — added on top of drive time
// Vendors can override via cartData.estimatedPrepTime (minutes)
const DEFAULT_PREP_TIME_MIN = 10;

/**
 * Fetches real-time drive duration between two coordinates using
 * Google Distance Matrix API (driving mode).
 *
 * @param {Object} origin      - { latitude, longitude } — customer location
 * @param {Object} destination - { latitude, longitude } — vendor/restaurant location
 * @returns {number|null} Drive duration in minutes, or null on failure
 */
export const getDriveDurationMinutes = async (origin, destination) => {
  if (!origin?.latitude || !origin?.longitude) {
    console.warn('[DeliveryEstimate] Missing origin coordinates');
    return null;
  }
  if (!destination?.latitude || !destination?.longitude) {
    console.warn('[DeliveryEstimate] Missing destination coordinates');
    return null;
  }

  const originStr = `${origin.latitude},${origin.longitude}`;
  const destStr = `${destination.latitude},${destination.longitude}`;
  const url = `${DISTANCE_MATRIX_URL}?origins=${originStr}&destinations=${destStr}&mode=driving&key=${GOOGLE_MAPS_CONFIG.apiKey}`;

  try {
    const res = await fetch(url);
    const json = await res.json();

    if (json.status !== 'OK') {
      console.warn('[DeliveryEstimate] Distance Matrix API error:', json.status);
      return null;
    }

    const element = json?.rows?.[0]?.elements?.[0];
    if (!element || element.status !== 'OK') {
      console.warn('[DeliveryEstimate] Route element not OK:', element?.status);
      return null;
    }

    // duration.value is in seconds
    const driveSec = element.duration.value;
    const driveMin = Math.ceil(driveSec / 60);

    console.log(`[DeliveryEstimate] Drive time: ${driveMin} min | Distance: ${element.distance?.text}`);
    return driveMin;
  } catch (err) {
    console.error('[DeliveryEstimate] fetch error:', err);
    return null;
  }
};

/**
 * Calculates full estimated delivery time range:
 *   = Drive time + Preparation time
 *
 * Returns a human-readable string like "23-33 min"
 *
 * @param {Object} origin      - { latitude, longitude } — customer
 * @param {Object} destination - { latitude, longitude } — vendor
 * @param {number} prepTimeMin - Food preparation time in minutes (from vendor data)
 * @returns {string} Formatted estimate string, e.g. "23-33 min"
 */
export const getRealTimeDeliveryEstimate = async (origin, destination, prepTimeMin) => {
  const prep = typeof prepTimeMin === 'number' && prepTimeMin > 0
    ? prepTimeMin
    : DEFAULT_PREP_TIME_MIN;

  const driveMin = await getDriveDurationMinutes(origin, destination);

  if (driveMin === null) {
    // Google API failed — signal caller to use vendor default
    return null;
  }

  // If drive time exceeds food delivery radius (e.g., inter-city like Dhaka→Chattogram),
  // don't show a realistic but ridiculous time — return null to use vendor default instead
  if (driveMin > MAX_DRIVE_TIME_MIN) {
    console.warn(`[DeliveryEstimate] Drive time ${driveMin} min exceeds cap (${MAX_DRIVE_TIME_MIN} min). Using vendor default.`);
    return null;
  }

  // Add a small buffer window (+2 for lower, +12 for upper)
  // so the estimate looks like a range rather than a single exact time
  const low = driveMin + prep + 2;
  const high = driveMin + prep + 12;
  return `${low}-${high} min`;
};
