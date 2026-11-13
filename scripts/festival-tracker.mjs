import { readFile, readdir, mkdir, writeFile, lstat, rename, rm, mkdtemp } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import vm from 'node:vm';

export const sourceFiles = [
  'index.html', 'app.css', 'app.js', 'status.js', 'festivals.data.js',
  'focus.data.js', 'strategy.data.js', 'expense-model.js', 'expense-ui.js',
];
export const emptyExpenses = 'window.FESTIVAL_EXPENSES = [];\n';
const files = [...sourceFiles, 'expenses.data.js'].sort();
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export async function validateTracker(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  assert.deepEqual(entries.map(entry => entry.name).sort(), files, 'Unexpected or missing public tracker files');
  assert.ok(entries.every(entry => entry.isFile()), 'Only regular public files are allowed');
  assert.equal((await readFile(join(directory, 'expenses.data.js'), 'utf8')).replace(/\r\n/g, '\n'), emptyExpenses,
    'Public expense seed must be empty');
  const html = await readFile(join(directory, 'index.html'), 'utf8');
  const references = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(match => match[1]);
  for (const reference of references) {
    assert.ok(files.includes(reference.replace(/^\.\//, '')), `Unapproved asset reference: ${reference}`);
  }
  assert.deepEqual(references.map(reference => reference.replace(/^\.\//, '')).sort(),
    files.filter(file => file !== 'index.html'), 'HTML must load every runtime asset');
  for (const file of files.filter(file => file.endsWith('.js'))) {
    const script = await readFile(join(directory, file), 'utf8');
    new vm.Script(script, { filename: file });
    assert.ok(!/www\.expedia\.de-egti-|EU-02-finnair-|OneKeyCash|receipts\/[\w-]+\//i.test(script),
      `Private expense or receipt data found in ${file}`);
  }
  const context = vm.createContext({ window: {} });
  new vm.Script(await readFile(join(directory, 'festivals.data.js'), 'utf8')).runInContext(context, { timeout: 1000 });
  assert.ok(context.window.FESTIVAL_DATA?.items?.length > 0, 'Festival data must not be empty');
}

export async function syncTracker(haesinRoot, destination = join(root, 'public/festival-tracker')) {
  const source = resolve(haesinRoot, 'apps/festival-tracker');
  // Read every allowlisted input before creating or replacing the public snapshot.
  const contents = await Promise.all(sourceFiles.map(async file => {
    assert.ok((await lstat(join(source, file))).isFile(), `Expected regular source file: ${file}`);
    return [file, await readFile(join(source, file))];
  }));
  await mkdir(dirname(destination), { recursive: true });
  const staging = await mkdtemp(join(dirname(destination), '.festival-tracker-'));
  const backup = `${staging}-previous`;
  let backedUp = false;
  try {
    // Finish writes before cleanup even if one write fails.
    for (const [file, content] of contents) await writeFile(join(staging, file), content);
    await writeFile(join(staging, 'expenses.data.js'), emptyExpenses);
    await validateTracker(staging);
    try {
      await rename(destination, backup);
      backedUp = true;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    try {
      await rename(staging, destination);
    } catch (error) {
      if (backedUp) await rename(backup, destination);
      throw error;
    }
    if (backedUp) await rm(backup, { recursive: true });
  } finally {
    // Both paths are generated sibling directories, never user-supplied paths.
    await rm(staging, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, argument] = process.argv.slice(2);
    if (command === 'sync' && argument) {
      await syncTracker(argument);
      console.log('Synced public Festival Tracker snapshot; private expenses and receipts excluded.');
    } else if (command === 'check' && argument) {
      await validateTracker(resolve(argument));
      console.log(`Public Festival Tracker validated: ${argument}`);
    } else {
      throw new Error('Usage: festival-tracker.mjs sync <haesin-root> | check <public-directory>');
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
