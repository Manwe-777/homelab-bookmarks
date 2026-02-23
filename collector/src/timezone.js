/**
 * Timezone utilities for handling time-based bookmark ranking
 * 
 * JavaScript's Date.getTimezoneOffset() returns the difference in minutes 
 * between UTC and the local time zone:
 * - POSITIVE values for timezones BEHIND UTC (e.g., 300 for EST/GMT-5, 180 for GMT-3)
 * - NEGATIVE values for timezones AHEAD of UTC (e.g., -60 for GMT+1, -540 for JST/GMT+9)
 * - 0 for UTC
 * 
 * Examples:
 * - GMT-3 (Buenos Aires): +180 minutes (3 hours behind UTC)
 * - GMT+0 (London/UTC): 0 minutes
 * - GMT+1 (Berlin): -60 minutes (1 hour ahead of UTC)
 * - EST/GMT-5 (New York): +300 minutes (5 hours behind UTC)
 * - JST/GMT+9 (Tokyo): -540 minutes (9 hours ahead of UTC)
 */

/**
 * Calculate minute of day (0-1439) in the client's timezone
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @param {number} timezoneOffset - Timezone offset in minutes from Date.getTimezoneOffset()
 * @returns {number} Minute of day (0-1439)
 */
export function calculateMinuteOfDay(timestamp, timezoneOffset) {
  // To convert UTC to local time: UTC - offset
  // getTimezoneOffset() is positive for timezones behind UTC, negative for ahead
  // Examples:
  //   UTC 23:00 - (+180) = UTC 23:00 - 3h = 20:00 (GMT-3)
  //   UTC 23:00 - (+300) = UTC 23:00 - 5h = 18:00 (EST/GMT-5)
  //   UTC 23:00 - (-60) = UTC 23:00 + 1h = 00:00 next day (GMT+1)
  const localDate = new Date(timestamp - timezoneOffset * 60 * 1000);
  return localDate.getUTCHours() * 60 + localDate.getUTCMinutes();
}

/**
 * Get current minute of day in the client's timezone
 * @param {number} timezoneOffset - Timezone offset in minutes from Date.getTimezoneOffset()
 * @returns {number} Current minute of day (0-1439)
 */
export function getCurrentMinuteOfDay(timezoneOffset) {
  return calculateMinuteOfDay(Date.now(), timezoneOffset);
}

/**
 * Format minute of day as HH:MM string
 * @param {number} minuteOfDay - Minute of day (0-1439)
 * @returns {string} Time in HH:MM format
 */
export function formatMinuteOfDay(minuteOfDay) {
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}
