import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { syncTracker, validateTracker, emptyExpenses } from '../scripts/festival-tracker.mjs';

test('public sync excludes private inputs and preserves the snapshot on invalid input', async t => {
  const temporary = await mkdtemp(join(tmpdir(), 'festival-tracker-test-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const source = join(temporary, 'haesin/apps/festival-tracker');
  const destination = join(temporary, 'public/festival-tracker');
  await cp(new URL('../public/festival-tracker/', import.meta.url), source, { recursive: true });
  await writeFile(join(source, 'expenses.data.js'), 'PRIVATE SEED');
  await mkdir(join(source, 'receipts'));
  await writeFile(join(source, 'receipts/private.pdf'), 'PRIVATE RECEIPT');
  await syncTracker(join(temporary, 'haesin'), destination);
  await validateTracker(destination);
  assert.equal(await readFile(join(destination, 'expenses.data.js'), 'utf8'), emptyExpenses);
  await syncTracker(join(temporary, 'haesin'), destination);
  await validateTracker(destination);
  const original = await readFile(join(destination, 'index.html'), 'utf8');
  await writeFile(join(source, 'index.html'), '<script src="receipts/private.pdf"></script>');
  await assert.rejects(syncTracker(join(temporary, 'haesin'), destination), /Unapproved asset/);
  assert.equal(await readFile(join(destination, 'index.html'), 'utf8'), original);
  await rm(join(source, 'app.js'));
  await assert.rejects(syncTracker(join(temporary, 'haesin'), destination), /ENOENT/);
  await validateTracker(destination);
});

test('public validation rejects receipt files and nonempty expense seeds', async t => {
  const temporary = await mkdtemp(join(tmpdir(), 'festival-tracker-check-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  await cp(new URL('../public/festival-tracker/', import.meta.url), temporary, { recursive: true });
  await writeFile(join(temporary, 'expenses.data.js'), 'window.FESTIVAL_EXPENSES = [{ cash: 100 }];');
  await assert.rejects(validateTracker(temporary), /Public expense seed/);
  await writeFile(join(temporary, 'expenses.data.js'), emptyExpenses.replace(/\n/g, '\r\n'));
  await validateTracker(temporary);
  await writeFile(join(temporary, 'private.pdf'), 'PRIVATE RECEIPT');
  await assert.rejects(validateTracker(temporary), /Unexpected or missing/);
});
