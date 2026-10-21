import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, catalogSchema } from '../scripts/validate-catalog.mjs';

test('source catalog has English evidence-backed entries without invented test claims', async () => {
  const catalog = await loadCatalog();
  assert.equal(catalog.schemaVersion, 2);
  assert.ok(catalog.tools.length >= 20);
  for (const tool of catalog.tools) {
    assert.equal(typeof tool.description, 'string');
    assert.ok(tool.description.length > 0);
    assert.equal(typeof tool.notes, 'string');
    assert.ok(tool.notes.length > 0);
    assert.equal(tool.status, 'source-reviewed');
    assert.equal(tool.evidence.test, null);
    assert.ok(tool.evidence.sourceUrls.length > 0);
  }
});

test('duplicate catalog entries and unsupported tested claims are rejected', async () => {
  const catalog = await loadCatalog();
  assert.equal(catalogSchema.safeParse({ ...catalog, tools: [catalog.tools[0], catalog.tools[0]] }).success, false);
  const copied = structuredClone(catalog);
  copied.tools[0].status = 'tested'; copied.tools[0].evidence.test = true;
  assert.equal(catalogSchema.safeParse(copied).success, false);
});
