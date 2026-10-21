import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { startFixture } from '../examples/fixture.mjs';

test('local fixture exposes valid files and a synthetic cookie sign-in', { timeout: 15000 }, async (t) => {
  const fixture = await startFixture();
  t.after(() => fixture.close());
  const home = await fetch(fixture.baseUrl);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /<html lang="fr">/);
  const login = await fetch(`${fixture.baseUrl}/protected`, { redirect: 'manual' });
  assert.equal(login.status, 303);
  assert.match(login.headers.get('location'), /^\/login\?/);
  const signedIn = await fetch(`${fixture.baseUrl}/session?returnTo=%2Fmembers`, { method: 'POST', body: 'demo=fake', redirect: 'manual' });
  assert.equal(signedIn.headers.get('location'), '/members');
  const cookie = signedIn.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/);
  const member = await fetch(`${fixture.baseUrl}/members`, { headers: { cookie: cookie.split(';')[0] } });
  assert.equal(member.status, 200);
  assert.match(await member.text(), /member-greeting/);
  const pdf = await fetch(`${fixture.baseUrl}/download/good.pdf`);
  assert.match(pdf.headers.get('content-disposition'), /attachment/);
  const parsed = await PDFDocument.load(await pdf.arrayBuffer());
  assert.equal(parsed.getPageCount(), 1);
  const json = await (await fetch(`${fixture.baseUrl}/download/good.json`)).json();
  assert.equal(json.status, 'verified');
  await fixture.close();
  await fixture.close();
});

test('fixture rejects a public interface and invalid ports', async () => {
  await assert.rejects(startFixture({ host: '0.0.0.0' }), /127\.0\.0\.1/);
  await assert.rejects(startFixture({ port: -1 }), /Port/);
  await assert.rejects(startFixture({ port: 65536 }), /Port/);
  await assert.rejects(startFixture({ port: 1.5 }), /Port/);
});

test('fixture rejects external auth return targets', { timeout: 10000 }, async (t) => {
  const fixture = await startFixture();
  t.after(() => fixture.close());
  const response = await fetch(`${fixture.baseUrl}/session?returnTo=https%3A%2F%2Fexample.invalid`, { method: 'POST', body: 'demo=fake', redirect: 'manual' });
  assert.equal(response.headers.get('location'), '/members');
});
