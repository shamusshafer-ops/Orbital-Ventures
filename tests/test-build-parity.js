// Focused build-parity tests. All writes stay inside a disposable fixture.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { MODULES, createBuildArtifacts, findStaleArtifacts, writeBuildArtifacts } = require('../build.js');

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'orbital-build-parity-'));
try {
  const src = path.join(fixture, 'src');
  fs.mkdirSync(src, { recursive: true });
  MODULES.forEach((module, index) => fs.writeFileSync(path.join(src, module), `// ${module}\nconst m${index} = ${index};\n`));
  // CRLF proves comparison uses the exact same line-ending behavior as build.
  fs.writeFileSync(path.join(src, 'shell.html'), '<!doctype html>\r\n<!-- OV:SCRIPTS -->\r\n<footer>ok</footer>\r\n');

  const artifacts = createBuildArtifacts(fixture);
  writeBuildArtifacts(artifacts);
  assert.deepStrictEqual(findStaleArtifacts(artifacts), [], 'fresh fixture should pass parity');

  fs.appendFileSync(path.join(fixture, 'index.html'), 'stale');
  assert.deepStrictEqual(findStaleArtifacts(artifacts).map((artifact) => artifact.name), ['index.html'], 'stale output should be named');

  fs.unlinkSync(path.join(fixture, 'build', 'game.js'));
  assert.deepStrictEqual(
    findStaleArtifacts(artifacts).map((artifact) => artifact.name),
    ['build/game.js', 'index.html'],
    'missing and stale outputs should both be named'
  );
  console.log('3/3 build parity checks passed');

  // Tier 0.1 (2026-08-04): the release build embeds textures (file://-safety), the dev build must not.
  const texFixture = fs.mkdtempSync(path.join(os.tmpdir(), 'orbital-build-textures-'));
  try {
    const texSrc = path.join(texFixture, 'src');
    fs.mkdirSync(texSrc, { recursive: true });
    MODULES.forEach((module, index) => fs.writeFileSync(path.join(texSrc, module), `// ${module}\nconst m${index} = ${index};\n`));
    fs.writeFileSync(path.join(texSrc, 'shell.html'), '<!doctype html>\n<!-- OV:SCRIPTS -->\n<footer>ok</footer>\n');
    fs.mkdirSync(path.join(texFixture, 'assets'), { recursive: true });
    fs.writeFileSync(path.join(texFixture, 'assets', 'texture-sun.jpg'), Buffer.from([0xff, 0xd8, 0xff, 0xd9])); // minimal fake JPEG bytes; embeddedTextureScript only reads+base64s, doesn't decode

    const texArtifacts = createBuildArtifacts(texFixture);
    const release = texArtifacts.find((a) => a.name === 'orbital-ventures.html').contents.toString('utf8');
    const dev = texArtifacts.find((a) => a.name === 'index.html').contents.toString('utf8');
    assert.ok(release.includes('__OV_TEXTURE_DATA__'), 'release build should embed textures (file:// safety net)');
    assert.ok(!dev.includes('__OV_TEXTURE_DATA__'), 'dev build should NOT embed textures — it runs next to assets/ on disk');
    console.log('2/2 texture-embed split checks passed');
  } finally {
    fs.rmSync(texFixture, { recursive: true, force: true });
  }
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
