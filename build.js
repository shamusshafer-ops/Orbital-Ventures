#!/usr/bin/env node
// Orbital Ventures build. Zero dependencies; run as `node build.js`.
//
// The game lives in src/*.js (7 plain classic-script modules loaded in the
// order below into one shared global scope) plus src/shell.html (the page
// template with the whole <script> block replaced by <!-- OV:SCRIPTS -->).
//
// Outputs:
//   orbital-ventures.html  release: one inline <script> = modules concatenated.
//                          <script>/</script> each on their own line so the
//                          test harness's awk extraction keeps working.
//   build/game.js          the bare concatenated script body, for the harness.
//   index.html             dev page: one <script src="src/X.js"> per module,
//                          same order, same template — so dev and release
//                          can't drift structurally.
//
// MODULES is the single order source of truth.
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const MODULES = [
  'data.js', 'parts.js', 'sim.js', 'save.js', 'shell.js', 'flight.js', 'render.js', 'main.js',
];

// Match the marker independently of the checkout's line-ending style. Git may
// materialize shell.html with CRLF on Windows; generated script/tag lines use LF.
const PLACEHOLDER = '<!-- OV:SCRIPTS -->';

function read(p) { return fs.readFileSync(p); }

// Compute every generated artifact without changing the filesystem.
function createBuildArtifacts(root = ROOT) {
  const src = path.join(root, 'src');
  // No separator: modules are exact line-range slices whose concatenation
  // reproduces the original inline script byte-for-byte.
  const body = Buffer.concat(MODULES.map((m) => read(path.join(src, m))));
  const shell = read(path.join(src, 'shell.html'));
  const idx = shell.indexOf(PLACEHOLDER);
  if (idx === -1) throw new Error('placeholder not found in src/shell.html');
  const before = shell.slice(0, idx);
  let afterIdx = idx + Buffer.byteLength(PLACEHOLDER);
  if (shell[afterIdx] === 13) afterIdx++; // CR in CRLF
  if (shell[afterIdx] === 10) afterIdx++; // LF
  const after = shell.slice(afterIdx);
  const scriptBlock = Buffer.concat([Buffer.from('<script>\n'), body, Buffer.from('</script>\n')]);
  const releaseHtml = Buffer.concat([before, scriptBlock, after]);
  const devTags = Buffer.from(MODULES.map((m) => `<script src="src/${m}"></script>`).join('\n') + '\n');
  const devHtml = Buffer.concat([before, devTags, after]);

  return [
    { name: 'orbital-ventures.html', path: path.join(root, 'orbital-ventures.html'), contents: releaseHtml },
    { name: 'build/game.js', path: path.join(root, 'build', 'game.js'), contents: body },
    { name: 'index.html', path: path.join(root, 'index.html'), contents: devHtml },
  ];
}

function findStaleArtifacts(artifacts) {
  return artifacts.filter((artifact) => {
    try {
      return !read(artifact.path).equals(artifact.contents);
    } catch (error) {
      if (error.code === 'ENOENT') return true;
      throw error;
    }
  });
}

function writeBuildArtifacts(artifacts) {
  for (const artifact of artifacts) {
    fs.mkdirSync(path.dirname(artifact.path), { recursive: true });
    fs.writeFileSync(artifact.path, artifact.contents);
  }
}

function main() {
  const artifacts = createBuildArtifacts();
  if (process.argv.includes('--check')) {
    const stale = findStaleArtifacts(artifacts);
    if (stale.length) {
      console.error('generated artifacts are stale or missing:');
      stale.forEach((artifact) => console.error(`  ${artifact.name}`));
      process.exitCode = 1;
      return;
    }
    console.log('build parity ok');
    return;
  }

  writeBuildArtifacts(artifacts);
  console.log('build ok:');
  console.log('  orbital-ventures.html', artifacts[0].contents.length, 'bytes');
  console.log('  build/game.js        ', artifacts[1].contents.length, 'bytes');
  console.log('  index.html           ', artifacts[2].contents.length, 'bytes');
}

if (require.main === module) main();

module.exports = { MODULES, createBuildArtifacts, findStaleArtifacts, writeBuildArtifacts };
