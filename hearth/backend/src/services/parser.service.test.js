const { sanitizeParsed } = require('./parser.service');

test('sanitizeParsed normalizes shape', () => {
  const input = { is_relevant: 'yes', confidence: 9, category: 'bad', action_items: [1, 'ok'], date: '2026-11-03' };
  const out = sanitizeParsed(input);
  expect(out.is_relevant).toBe(false);
  expect(out.confidence).toBe(1);
  expect(out.category).toBe('other');
  expect(out.action_items).toEqual(['ok']);
  expect(out.date).toBeNull();
});
