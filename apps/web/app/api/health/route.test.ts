/**
 * Tests for Health API endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

describe('Health API', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));
  });

  describe('GET /api/health', () => {
    it('should return 200 OK with status info', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.service).toBe('WIG API');
    });

    it('should include timestamp', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.timestamp).toBe('2026-01-15T12:00:00.000Z');
    });

    it('should return valid JSON response', async () => {
      const response = await GET();

      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });
});
