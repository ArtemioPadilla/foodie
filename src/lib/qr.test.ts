import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { encodeQr, qrVersionFor, type QrMatrix } from './qr';

/**
 * References generated with python-qrcode 8.2 (independent implementation),
 * level M, byte mode, same version and mask; the encoder was also checked by
 * decoding versions 1–40 and all eight masks with jsQR (roadmap Issue 040).
 */
const HELLO = [
  '#######..##...#######',
  '#.....#.##....#.....#',
  '#.###.#..#.##.#.###.#',
  '#.###.#...##..#.###.#',
  '#.###.#.##..#.#.###.#',
  '#.....#.....#.#.....#',
  '#######.#.#.#.#######',
  '..........###........',
  '#.#.#.#..#.#....#..#.',
  '..#.##....#...#....##',
  '.#.#..#.###.#...#####',
  '##..#.........#....#.',
  '.##.#.##..#.#.#.#....',
  '........####.#.#..###',
  '#######...##.###..###',
  '#.....#...####.##....',
  '#.###.#.#.##.###...##',
  '#.###.#..#....##..##.',
  '#.###.#.###.#...#.#.#',
  '#.....#..#....#.#..#.',
  '#######.###.#.##...##',
];

const rows = (matrix: QrMatrix) => matrix.modules.map((row) => row.map((dark) => (dark ? '#' : '.')).join(''));

describe('encodeQr', () => {
  it('matches the reference matrix for "hello" (version 1, mask 0)', () => {
    const matrix = encodeQr('hello')!;
    expect(matrix).toMatchObject({ version: 1, size: 21, mask: 0 });
    expect(rows(matrix)).toEqual(HELLO);
  });

  it('matches the reference for a share-link-sized URL (version 13, with version information)', () => {
    const matrix = encodeQr(`https://artemiopadilla.github.io/foodie/plan/shared/#p=${'x'.repeat(250)}`)!;
    expect(matrix).toMatchObject({ version: 13, size: 69, mask: 0 });
    const hash = createHash('sha256').update(rows(matrix).join('\n')).digest('hex');
    expect(hash).toBe('4d54a57b1f434dc053d73d0122fdb9ce130cc9d858995b1f6493fe91c2ee4a39');
  });

  it('picks the smallest version that fits and gives up past version 40', () => {
    expect(qrVersionFor('')).toBe(1);
    expect(qrVersionFor('x'.repeat(14))).toBe(1);
    expect(qrVersionFor('x'.repeat(15))).toBe(2);
    expect(qrVersionFor('x'.repeat(2331))).toBe(40);
    expect(encodeQr('x'.repeat(2332))).toBeNull();
  });

  it('counts UTF-8 bytes, not characters', () => {
    expect(qrVersionFor('é'.repeat(7))).toBe(1);
    expect(qrVersionFor('é'.repeat(8))).toBe(2);
  });
});
