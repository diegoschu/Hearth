import { describe, expect, it } from 'vitest';
import { formatDateLabel, formatTimeRange, getFeedItemTitle } from './utils';

describe('utils', () => {
  it('formats date labels', () => {
    const formatted = formatDateLabel('2026-02-25');
    expect(formatted).toContain('Feb');
  });

  it('falls back on invalid date label', () => {
    expect(formatDateLabel('not-a-date')).toBe('not-a-date');
  });

  it('formats time ranges', () => {
    const formatted = formatTimeRange('2026-02-25T09:00:00.000Z', '2026-02-25T10:00:00.000Z');
    expect(formatted).toContain('–');
  });

  it('returns title fallback for feed items', () => {
    expect(getFeedItemTitle({ parsed: { eventName: 'Practice' } })).toBe('Practice');
    expect(getFeedItemTitle({ parsed: {} })).toBe('Untitled event');
  });
});
