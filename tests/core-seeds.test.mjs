import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeRepo } from '../scripts/open-source-lib.mjs';

test('curated core seed references are unique canonical GitHub repo names', async () => {
  const input = JSON.parse(await readFile(new URL('../catalog/seeds.json', import.meta.url), 'utf8'));
  assert.equal(input.schemaVersion, 1);
  assert.ok(Array.isArray(input.repositories));
  const unique = new Set();
  for (const candidate of input.repositories) {
    assert.equal(typeof candidate, 'string');
    assert.equal(normalizeRepo(candidate), candidate, `Uncanonical GitHub seed: ${candidate}`);
    const id = candidate.toLowerCase();
    assert.ok(!unique.has(id), `Duplicate case-insensitive GitHub seed: ${candidate}`);
    unique.add(id);
  }
  assert.equal(unique.size, input.repositories.length);
});
