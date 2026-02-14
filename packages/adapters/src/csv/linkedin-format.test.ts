/**
 * LinkedIn Format Parser Tests
 */

import { describe, it, expect } from 'vitest';
import { parseLinkedInConnections, LinkedInConnection } from './linkedin-format';
import { ParsedRow } from './parser';

describe('parseLinkedInConnections', () => {
  const createRow = (data: Partial<Record<string, string>>): ParsedRow => ({
    'First Name': '',
    'Last Name': '',
    'Email Address': '',
    'Company': '',
    'Position': '',
    'Connected On': '',
    ...data,
  });

  it('should extract firstName correctly', () => {
    const rows: ParsedRow[] = [
      createRow({ 'First Name': 'John' }),
      createRow({ 'First Name': 'Jane' }),
    ];

    const result = parseLinkedInConnections(rows);

    expect(result[0].firstName).toBe('John');
    expect(result[1].firstName).toBe('Jane');
  });

  it('should extract lastName correctly', () => {
    const rows: ParsedRow[] = [
      createRow({ 'Last Name': 'Doe' }),
      createRow({ 'Last Name': 'Smith' }),
    ];

    const result = parseLinkedInConnections(rows);

    expect(result[0].lastName).toBe('Doe');
    expect(result[1].lastName).toBe('Smith');
  });

  it('should extract email correctly', () => {
    const rows: ParsedRow[] = [
      createRow({ 'Email Address': 'john@example.com' }),
      createRow({ 'Email Address': 'jane@test.org' }),
    ];

    const result = parseLinkedInConnections(rows);

    expect(result[0].email).toBe('john@example.com');
    expect(result[1].email).toBe('jane@test.org');
  });

  it('should extract company correctly', () => {
    const rows: ParsedRow[] = [
      createRow({ 'Company': 'Acme Corp' }),
      createRow({ 'Company': 'Tech Inc' }),
    ];

    const result = parseLinkedInConnections(rows);

    expect(result[0].company).toBe('Acme Corp');
    expect(result[1].company).toBe('Tech Inc');
  });

  it('should extract position correctly', () => {
    const rows: ParsedRow[] = [
      createRow({ 'Position': 'Software Engineer' }),
      createRow({ 'Position': 'Product Manager' }),
    ];

    const result = parseLinkedInConnections(rows);

    expect(result[0].position).toBe('Software Engineer');
    expect(result[1].position).toBe('Product Manager');
  });

  it('should parse connectedOn date correctly', () => {
    const rows: ParsedRow[] = [
      createRow({ 'Connected On': '15 Jan 2023' }),
      createRow({ 'Connected On': '1 Mar 2022' }),
      createRow({ 'Connected On': 'Dec 25, 2021' }),
    ];

    const result = parseLinkedInConnections(rows);

    expect(result[0].connectedOn).toEqual(new Date(2023, 0, 15));
    expect(result[1].connectedOn).toEqual(new Date(2022, 2, 1));
    expect(result[2].connectedOn).toEqual(new Date(2021, 11, 25));
  });

  it('should return null for missing email', () => {
    const rows: ParsedRow[] = [
      createRow({ 'First Name': 'John', 'Email Address': '' }),
      createRow({ 'First Name': 'Jane', 'Email Address': '   ' }),
    ];

    const result = parseLinkedInConnections(rows);

    expect(result[0].email).toBeNull();
    expect(result[1].email).toBeNull();
  });

  it('should return null for missing company', () => {
    const rows: ParsedRow[] = [
      createRow({ 'First Name': 'John', 'Company': '' }),
      createRow({ 'First Name': 'Jane', 'Company': '   ' }),
    ];

    const result = parseLinkedInConnections(rows);

    expect(result[0].company).toBeNull();
    expect(result[1].company).toBeNull();
  });

  it('should return null for missing position', () => {
    const rows: ParsedRow[] = [
      createRow({ 'First Name': 'John', 'Position': '' }),
      createRow({ 'First Name': 'Jane', 'Position': '   ' }),
    ];

    const result = parseLinkedInConnections(rows);

    expect(result[0].position).toBeNull();
    expect(result[1].position).toBeNull();
  });

  it('should handle row with all fields missing gracefully', () => {
    const rows: ParsedRow[] = [
      {
        'First Name': '',
        'Last Name': '',
        'Email Address': '',
        'Company': '',
        'Position': '',
        'Connected On': '',
      },
    ];

    const result = parseLinkedInConnections(rows);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      firstName: '',
      lastName: '',
      email: null,
      company: null,
      position: null,
      connectedOn: null,
    });
  });
});
