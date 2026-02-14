/**
 * CSV Parser Tests
 */

import { describe, it, expect } from 'vitest';
import { parseCSV, ParsedRow } from './parser';

describe('parseCSV', () => {
  it('should parse simple CSV with header and data rows', () => {
    const csv = `name,email,age
John,john@example.com,30
Jane,jane@example.com,25`;

    const result = parseCSV(csv);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: 'John',
      email: 'john@example.com',
      age: '30',
    });
    expect(result[1]).toEqual({
      name: 'Jane',
      email: 'jane@example.com',
      age: '25',
    });
  });

  it('should extract header row as object keys', () => {
    const csv = `First Name,Last Name,Company
Alice,Smith,Acme Corp`;

    const result = parseCSV(csv);

    expect(result).toHaveLength(1);
    expect(Object.keys(result[0])).toEqual(['First Name', 'Last Name', 'Company']);
    expect(result[0]['First Name']).toBe('Alice');
    expect(result[0]['Last Name']).toBe('Smith');
    expect(result[0]['Company']).toBe('Acme Corp');
  });

  it('should handle CRLF line endings', () => {
    const csv = 'name,value\r\nA,1\r\nB,2';

    const result = parseCSV(csv);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: 'A', value: '1' });
    expect(result[1]).toEqual({ name: 'B', value: '2' });
  });

  it('should handle LF line endings', () => {
    const csv = 'name,value\nA,1\nB,2';

    const result = parseCSV(csv);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: 'A', value: '1' });
    expect(result[1]).toEqual({ name: 'B', value: '2' });
  });

  it('should handle quoted fields', () => {
    const csv = `name,bio
"John Doe","A developer"
"Jane","A designer"`;

    const result = parseCSV(csv);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: 'John Doe',
      bio: 'A developer',
    });
    expect(result[1]).toEqual({
      name: 'Jane',
      bio: 'A designer',
    });
  });

  it('should handle escaped quotes inside quoted fields', () => {
    const csv = `name,quote
"Bob","He said ""Hello""!"
"Alice","She replied ""Hi""."`;

    const result = parseCSV(csv);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: 'Bob',
      quote: 'He said "Hello"!',
    });
    expect(result[1]).toEqual({
      name: 'Alice',
      quote: 'She replied "Hi".',
    });
  });

  it('should handle commas within quoted fields', () => {
    const csv = `name,address
"John","123 Main St, Apt 4, New York"
"Jane","456 Oak Ave, Suite 100"`;

    const result = parseCSV(csv);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: 'John',
      address: '123 Main St, Apt 4, New York',
    });
    expect(result[1]).toEqual({
      name: 'Jane',
      address: '456 Oak Ave, Suite 100',
    });
  });

  it('should handle empty fields as empty string', () => {
    const csv = `name,middle,last
John,,Doe
Jane,Marie,`;

    const result = parseCSV(csv);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: 'John',
      middle: '',
      last: 'Doe',
    });
    expect(result[1]).toEqual({
      name: 'Jane',
      middle: 'Marie',
      last: '',
    });
  });

  it('should skip completely empty rows', () => {
    const csv = `name,value
A,1

B,2

`;

    const result = parseCSV(csv);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: 'A', value: '1' });
    expect(result[1]).toEqual({ name: 'B', value: '2' });
  });

  it('should throw error on malformed CSV', () => {
    // Unclosed quote
    const malformedCsv = `name,value
"Unclosed,1`;

    expect(() => parseCSV(malformedCsv)).toThrow('Malformed CSV');
  });
});
