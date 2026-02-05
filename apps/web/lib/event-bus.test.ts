/**
 * Tests for EventBus implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InngestEventBus } from './event-bus';

describe('InngestEventBus', () => {
  let mockInngestClient: any;
  let eventBus: InngestEventBus;

  beforeEach(() => {
    mockInngestClient = {
      send: vi.fn(),
    };
    eventBus = new InngestEventBus(mockInngestClient);
  });

  describe('publish', () => {
    it('should publish event to Inngest', async () => {
      mockInngestClient.send.mockResolvedValue(undefined);

      const event = {
        type: 'person.created',
        payload: { personId: 'person-123', userId: 'user-456' },
      };

      await eventBus.publish(event as any);

      expect(mockInngestClient.send).toHaveBeenCalledWith({
        name: 'person.created',
        data: { personId: 'person-123', userId: 'user-456' },
      });
    });

    it('should throw error when Inngest send fails', async () => {
      mockInngestClient.send.mockRejectedValue(new Error('Connection failed'));

      const event = {
        type: 'person.created',
        payload: { personId: 'person-123' },
      };

      await expect(eventBus.publish(event as any)).rejects.toThrow(
        'Event publish failed: Connection failed'
      );
    });

    it('should handle non-Error exceptions', async () => {
      mockInngestClient.send.mockRejectedValue('String error');

      const event = {
        type: 'person.created',
        payload: {},
      };

      await expect(eventBus.publish(event as any)).rejects.toThrow(
        'Event publish failed: String error'
      );
    });
  });

  describe('subscribe', () => {
    it('should log subscription registration', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const handler = vi.fn();
      eventBus.subscribe('person.created', handler);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Event subscription registered for: person.created'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('subscribeAll', () => {
    it('should log all-events subscription', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const handler = vi.fn();
      eventBus.subscribeAll(handler);

      expect(consoleSpy).toHaveBeenCalledWith('All-events subscription registered');

      consoleSpy.mockRestore();
    });
  });
});
