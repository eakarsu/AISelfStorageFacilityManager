import { recordRows } from './recordRows';

test('keeps plain and paginated record arrays, including 16 real-shaped rows', () => {
  const rows = Array.from({ length: 16 }, (_, id) => ({ id: id + 1, unit_number: `A-${id + 1}` }));
  expect(recordRows(rows)).toHaveLength(16);
  expect(recordRows({ data: rows, pagination: { total: 16 } })).toHaveLength(16);
  expect(recordRows({ error: 'Unavailable' })).toEqual([]);
  expect(recordRows({ data: {} })).toEqual([]);
});
