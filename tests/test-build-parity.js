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
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
