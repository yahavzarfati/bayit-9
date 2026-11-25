import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { catalog } from '../src/wallpaper-catalog.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const metadata = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const iconLicense = (await readFile(new URL('../licenses/material-design-icons.txt', import.meta.url), 'utf8')).trimEnd();
const output = new URL('../dist/bayit-9.js', import.meta.url);
for (const { photo } of Object.values(catalog)) {
  if (!photo) continue;
  for (const file of [photo.full, photo.preview]) {
    const match = /^bayit9-wallpaper-[a-z0-9-]+-([a-f0-9]{12})\.webp$/.exec(file);
    assert.ok(match, 'Bundled stock wallpaper filenames must include an asset fingerprint');
    const bytes = await readFile(new URL(file, output));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', file);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', file);
    assert.ok(createHash('sha256').update(bytes).digest('hex').startsWith(match[1]), file);
  }
}
const result = await build({
  absWorkingDir: root,
  entryPoints: ['src/index.js'],
  outfile: 'dist/bayit-9.js',
  bundle: true,
  format: 'esm',
  charset: 'utf8',
  target: ['es2022', 'safari16.4'],
  minify: true,
  legalComments: 'inline',
  banner: { js: '/*! Bayit 9 v' + metadata.version + ' */\n/*!\n' + iconLicense + '\n*/' },
  write: false,
  metafile: true,
});

assert.deepEqual(Object.values(result.metafile.outputs).flatMap(item => item.imports), [], 'The distribution must be self-contained');
assert.equal(result.outputFiles.length, 1, 'The distribution must contain a single JavaScript module');
const body = Buffer.from(result.outputFiles[0].contents);
if (process.argv.includes('--check')) {
  assert.deepEqual(await readFile(output), body, 'Rebuild dist/bayit-9.js before committing');
} else {
  await writeFile(output, body);
}
console.log((process.argv.includes('--check') ? 'Verified' : 'Built') + ' dist/bayit-9.js (' + body.length + ' bytes)');
