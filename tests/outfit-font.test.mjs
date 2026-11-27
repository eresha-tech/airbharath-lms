import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const fontPath = path.resolve('app/fonts/Outfit-Variable.ttf');
const bytes = fs.readFileSync(fontPath);

test('official Outfit asset and license retain their pinned identity and required weight axis', () => {
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'fc7287273e66929776e2ba54f144fe699080bec29f61bf649d70d871468aeade');
  assert.equal(createHash('sha256').update(fs.readFileSync('app/fonts/Outfit-OFL.txt')).digest('hex'), 'c676351bf8576b9aba743cd5eaa8c0e7ee0d51f805d720447b4df4ddb6a2e416');
  const module = require('next/dist/compiled/@next/font/dist/fontkit');
  const font = (module.default.default || module.default)(bytes);
  assert.match(font.familyName, /^Outfit/);
  assert.ok(font.variationAxes.wght.min <= 400 && font.variationAxes.wght.max >= 800);
  assert.ok(font.numGlyphs > 300);
});

test('actual root-layout Outfit configuration builds through Next local loader without network access', async () => {
  const layout = fs.readFileSync('app/layout.tsx', 'utf8');
  assert.doesNotMatch(layout, /import\s*\{[^}]*\bOutfit\b[^}]*\}\s*from\s*["']next\/font\/google/);
  const options = /const outfit = localFont\(\{([\s\S]*?)\}\);/.exec(layout)?.[1];
  assert.ok(options, 'Root layout must use localFont for Outfit');
  const value = key => new RegExp(`${key}:\\s*"([^"]+)"`).exec(options)?.[1];
  const config = Object.fromEntries(['src', 'variable', 'weight', 'style', 'display'].map(key => [key, value(key)]));
  assert.deepEqual(config, { src: './fonts/Outfit-Variable.ttf', variable: '--font-outfit', weight: '400 800', style: 'normal', display: 'swap' });
  assert.match(layout, /outfit\.variable/);
  const localLoader = require('next/dist/compiled/@next/font/dist/local/loader').default;
  const emitted = [];
  const result = await localLoader({
    functionName: '', variableName: 'outfit', data: [config],
    resolve: async src => path.resolve('app', src), loaderContext: { fs },
    emitFontFile: (buffer, extension, preload) => {
      assert.deepEqual(buffer, bytes); assert.equal(extension, 'ttf'); assert.equal(preload, true);
      emitted.push(buffer); return '/_next/static/media/pinned-outfit.ttf';
    },
  });
  assert.equal(emitted.length, 1);
  assert.equal(result.variable, '--font-outfit');
  for (const declaration of ['font-weight: 400 800', 'font-style: normal', 'font-display: swap', '/_next/static/media/pinned-outfit.ttf']) assert.ok(result.css.includes(declaration));
  assert.doesNotMatch(result.css, /fonts\.googleapis|fonts\.gstatic/);
  assert.ok(result.adjustFontFallback);
});

test('reproduces the existing Google loader failure for an extensionless font URL using mock transport', async () => {
  const css = require('next/dist/compiled/@next/font/dist/google/fetch-css-from-google-fonts');
  const file = require('next/dist/compiled/@next/font/dist/google/fetch-font-file');
  const savedCSS = css.fetchCSSFromGoogleFonts, savedFile = file.fetchFontFile;
  css.fetchCSSFromGoogleFonts = async () => "/* latin */\n@font-face {\n  src: url(https://synthetic.invalid/font?format=woff2);\n}";
  file.fetchFontFile = async () => bytes;
  try {
    const loader = require('next/dist/compiled/@next/font/dist/google/loader').default;
    await assert.rejects(loader({ functionName: 'Outfit', data: [{ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] }], isDev: false, isServer: true, emitFontFile: () => assert.fail('Malformed URL must not be emitted') }), /Cannot read properties of null/);
  } finally { css.fetchCSSFromGoogleFonts = savedCSS; file.fetchFontFile = savedFile; }
});
