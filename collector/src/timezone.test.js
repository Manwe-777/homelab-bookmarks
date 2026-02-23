import { calculateMinuteOfDay, getCurrentMinuteOfDay, formatMinuteOfDay } from './timezone.js';

describe('Timezone utilities', () => {
  describe('calculateMinuteOfDay', () => {
    // Test case: UTC 23:00 on Feb 23, 2026
    const utcTimestamp = Date.UTC(2026, 1, 23, 23, 0, 0); // Feb 23, 2026 23:00 UTC

    test('should calculate correct minute for GMT-3 (Argentina/Brazil)', () => {
      const offset = 180; // GMT-3 (180 minutes behind UTC)
      const result = calculateMinuteOfDay(utcTimestamp, offset);
      const expected = 20 * 60 + 0; // 20:00
      expect(result).toBe(expected);
      expect(formatMinuteOfDay(result)).toBe('20:00');
    });

    test('should calculate correct minute for UTC (London)', () => {
      const offset = 0; // UTC
      const result = calculateMinuteOfDay(utcTimestamp, offset);
      const expected = 23 * 60 + 0; // 23:00
      expect(result).toBe(expected);
      expect(formatMinuteOfDay(result)).toBe('23:00');
    });

    test('should calculate correct minute for GMT+1 (Berlin/Paris)', () => {
      const offset = -60; // GMT+1 (60 minutes ahead of UTC)
      const result = calculateMinuteOfDay(utcTimestamp, offset);
      const expected = 0 * 60 + 0; // 00:00 (next day)
      expect(result).toBe(expected);
      expect(formatMinuteOfDay(result)).toBe('00:00');
    });

    test('should calculate correct minute for EST/GMT-5 (New York)', () => {
      const offset = 300; // EST (GMT-5)
      const result = calculateMinuteOfDay(utcTimestamp, offset);
      const expected = 18 * 60 + 0; // 18:00
      expect(result).toBe(expected);
      expect(formatMinuteOfDay(result)).toBe('18:00');
    });

    test('should handle minutes correctly', () => {
      // UTC 15:37
      const timestamp = Date.UTC(2026, 1, 23, 15, 37, 0);
      const offset = 180; // GMT-3
      const result = calculateMinuteOfDay(timestamp, offset);
      const expected = 12 * 60 + 37; // 12:37
      expect(result).toBe(expected);
      expect(formatMinuteOfDay(result)).toBe('12:37');
    });

    test('should handle midnight crossover (UTC to local)', () => {
      // UTC 01:30
      const timestamp = Date.UTC(2026, 1, 24, 1, 30, 0);
      const offset = 180; // GMT-3
      const result = calculateMinuteOfDay(timestamp, offset);
      const expected = 22 * 60 + 30; // 22:30 (previous day)
      expect(result).toBe(expected);
      expect(formatMinuteOfDay(result)).toBe('22:30');
    });

    test('should handle end of day', () => {
      // UTC 02:59
      const timestamp = Date.UTC(2026, 1, 24, 2, 59, 0);
      const offset = 180; // GMT-3
      const result = calculateMinuteOfDay(timestamp, offset);
      const expected = 23 * 60 + 59; // 23:59 (previous day)
      expect(result).toBe(expected);
      expect(formatMinuteOfDay(result)).toBe('23:59');
    });
  });

  describe('formatMinuteOfDay', () => {
    test('should format midnight', () => {
      expect(formatMinuteOfDay(0)).toBe('00:00');
    });

    test('should format noon', () => {
      expect(formatMinuteOfDay(12 * 60)).toBe('12:00');
    });

    test('should format end of day', () => {
      expect(formatMinuteOfDay(23 * 60 + 59)).toBe('23:59');
    });

    test('should pad single digits', () => {
      expect(formatMinuteOfDay(9 * 60 + 5)).toBe('09:05');
    });
  });

  describe('Real-world scenario tests', () => {
    test('should match the reported bug case: mapa.ign.gob.ar at 22:00 UTC', () => {
      // User in GMT-3 accessed site at their local 19:00
      // Which is 22:00 UTC
      // System was incorrectly showing 22:00 instead of 19:00
      const timestamp = Date.UTC(2026, 1, 23, 22, 0, 0);
      const offset = 180; // User's timezone (GMT-3, 180 minutes behind UTC)
      
      const correctMinute = calculateMinuteOfDay(timestamp, offset);
      const incorrectMinute = new Date(timestamp).getUTCHours() * 60 + new Date(timestamp).getUTCMinutes();
      
      expect(formatMinuteOfDay(correctMinute)).toBe('19:00');
      expect(formatMinuteOfDay(incorrectMinute)).toBe('22:00'); // What was shown (wrong)
    });

    test('should correctly handle early morning access in GMT-3', () => {
      // User accessed at 08:30 local time (GMT-3)
      // Which is 11:30 UTC
      const timestamp = Date.UTC(2026, 1, 23, 11, 30, 0);
      const offset = 180;
      
      const result = calculateMinuteOfDay(timestamp, offset);
      expect(formatMinuteOfDay(result)).toBe('08:30');
    });

    test('should correctly handle late night access in GMT-3', () => {
      // User accessed at 23:45 local time (GMT-3)
      // Which is 02:45 UTC (next day)
      const timestamp = Date.UTC(2026, 1, 24, 2, 45, 0);
      const offset = 180;
      
      const result = calculateMinuteOfDay(timestamp, offset);
      expect(formatMinuteOfDay(result)).toBe('23:45');
    });
  });

  describe('Edge cases', () => {
    test('should handle 0 offset', () => {
      const timestamp = Date.UTC(2026, 1, 23, 12, 0, 0);
      const result = calculateMinuteOfDay(timestamp, 0);
      expect(formatMinuteOfDay(result)).toBe('12:00');
    });

    test('should handle extreme behind offset (GMT-12)', () => {
      const timestamp = Date.UTC(2026, 1, 24, 11, 0, 0);
      const offset = 720; // GMT-12 (720 minutes behind UTC)
      const result = calculateMinuteOfDay(timestamp, offset);
      expect(formatMinuteOfDay(result)).toBe('23:00'); // Previous day
    });

    test('should handle extreme ahead offset (GMT+12)', () => {
      const timestamp = Date.UTC(2026, 1, 23, 13, 0, 0);
      const offset = -720; // GMT+12 (720 minutes ahead of UTC)
      const result = calculateMinuteOfDay(timestamp, offset);
      expect(formatMinuteOfDay(result)).toBe('01:00'); // Next day
    });
  });
});
