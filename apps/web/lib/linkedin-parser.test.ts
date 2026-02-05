/**
 * Tests for LinkedIn URL Parser
 */

import { describe, it, expect } from 'vitest';
import {
  isLinkedInUrl,
  parseLinkedInUrl,
  getSearchQueryFromLinkedInUrl,
  formatLinkedInName,
} from './linkedin-parser';

describe('LinkedIn Parser', () => {
  describe('isLinkedInUrl', () => {
    it('should return true for valid LinkedIn URLs', () => {
      expect(isLinkedInUrl('https://www.linkedin.com/in/johndoe')).toBe(true);
      expect(isLinkedInUrl('https://linkedin.com/in/johndoe')).toBe(true);
      expect(isLinkedInUrl('http://www.linkedin.com/in/johndoe')).toBe(true);
      expect(isLinkedInUrl('www.linkedin.com/in/johndoe')).toBe(true);
      expect(isLinkedInUrl('linkedin.com/in/johndoe')).toBe(true);
    });

    it('should return true for pub profile URLs', () => {
      expect(isLinkedInUrl('https://www.linkedin.com/pub/johndoe')).toBe(true);
    });

    it('should return true for URLs with trailing slash', () => {
      expect(isLinkedInUrl('https://www.linkedin.com/in/johndoe/')).toBe(true);
    });

    it('should return true for URLs with hyphens in username', () => {
      expect(isLinkedInUrl('https://www.linkedin.com/in/john-doe-123')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isLinkedInUrl('https://example.com')).toBe(false);
      expect(isLinkedInUrl('not a url')).toBe(false);
      expect(isLinkedInUrl('https://linkedin.com')).toBe(false);
      expect(isLinkedInUrl('https://linkedin.com/company/test')).toBe(false);
    });

    it('should handle whitespace', () => {
      expect(isLinkedInUrl('  https://www.linkedin.com/in/johndoe  ')).toBe(true);
    });
  });

  describe('parseLinkedInUrl', () => {
    it('should parse standard LinkedIn URL', () => {
      const result = parseLinkedInUrl('https://www.linkedin.com/in/johndoe');
      expect(result).toEqual({
        username: 'johndoe',
        vanityName: 'johndoe',
        url: 'https://www.linkedin.com/in/johndoe',
      });
    });

    it('should parse URL without www', () => {
      const result = parseLinkedInUrl('https://linkedin.com/in/johndoe');
      expect(result).toEqual({
        username: 'johndoe',
        vanityName: 'johndoe',
        url: 'https://www.linkedin.com/in/johndoe',
      });
    });

    it('should parse URL without protocol', () => {
      const result = parseLinkedInUrl('linkedin.com/in/johndoe');
      expect(result).toEqual({
        username: 'johndoe',
        vanityName: 'johndoe',
        url: 'https://www.linkedin.com/in/johndoe',
      });
    });

    it('should parse pub profile URL', () => {
      const result = parseLinkedInUrl('https://www.linkedin.com/pub/johndoe');
      expect(result).toEqual({
        username: 'johndoe',
        vanityName: 'johndoe',
        url: 'https://www.linkedin.com/pub/johndoe',
      });
    });

    it('should handle username with hyphens', () => {
      const result = parseLinkedInUrl('https://www.linkedin.com/in/john-doe-123');
      expect(result).toEqual({
        username: 'john-doe-123',
        vanityName: 'john-doe-123',
        url: 'https://www.linkedin.com/in/john-doe-123',
      });
    });

    it('should return null for invalid URL', () => {
      expect(parseLinkedInUrl('https://example.com')).toBeNull();
      expect(parseLinkedInUrl('not a url')).toBeNull();
      expect(parseLinkedInUrl('')).toBeNull();
    });

    it('should trim whitespace', () => {
      const result = parseLinkedInUrl('  https://www.linkedin.com/in/johndoe  ');
      expect(result?.username).toBe('johndoe');
    });
  });

  describe('getSearchQueryFromLinkedInUrl', () => {
    it('should extract username from valid URL', () => {
      expect(getSearchQueryFromLinkedInUrl('https://www.linkedin.com/in/johndoe')).toBe('johndoe');
    });

    it('should return null for invalid URL', () => {
      expect(getSearchQueryFromLinkedInUrl('https://example.com')).toBeNull();
    });
  });

  describe('formatLinkedInName', () => {
    it('should format hyphenated name', () => {
      expect(formatLinkedInName('john-doe')).toBe('John Doe');
    });

    it('should handle single word', () => {
      expect(formatLinkedInName('john')).toBe('John');
    });

    it('should handle multiple hyphens', () => {
      expect(formatLinkedInName('john-michael-doe')).toBe('John Michael Doe');
    });

    it('should capitalize first letter of each word', () => {
      expect(formatLinkedInName('JOHN-doe')).toBe('JOHN Doe');
    });
  });
});
