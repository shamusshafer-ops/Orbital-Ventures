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
// 2K equirectangular maps are embedded as data URLs in both browser artifacts. The release is
// routinely opened as file://, where Firefox may deny Three.TextureLoader's separate image fetches
// and leave its black placeholder texture on-screen. Keeping the source JPEGs in assets/ preserves
// attribution/auditability; embedding makes the browser builds self-contained and reliable.
const MAP3D_TEXTURE_FILES = {
  sun:'texture-sun.jpg', mercury:'texture-mercury.jpg', venus:'texture-venus.jpg', earth:'texture-earth-daymap.jpg',
  moon:'texture-moon.jpg', mars:'texture-mars.jpg', jupiter:'texture-jupiter.jpg', saturn:'texture-saturn.jpg',
  uranus:'texture-uranus.jpg', neptune:'texture-neptune.jpg',
};
// Cape's locally packaged material maps follow the same file://-safe route as the solar maps.
// The generated PNGs are project assets, with their provenance recorded in assets/CREDITS.md.
const CAPE3D_TEXTURE_FILES = {cape_ground:'cape-ground-albedo.png',cape_pavement:'cape-pavement-albedo.png'};

// Match the marker independently of the checkout's line-ending style. Git may
// materialize shell.html with CRLF on Windows; generated script/tag lines use LF.
const PLACEHOLDER = '<!-- OV:SCRIPTS -->';

function read(p) { return fs.readFileSync(p); }

function embeddedTextureScript(root) {
  const data = {};
  for (const [id, name] of Object.entries({...MAP3D_TEXTURE_FILES,...CAPE3D_TEXTURE_FILES})) {
    const file = path.join(root, 'assets', name);
    const mime=name.endsWith('.png')?'image/png':'image/jpeg';
    if (fs.existsSync(file)) data[id] = `data:${mime};base64,${read(file).toString('base64')}`;
  }
  if (!Object.keys(data).length) return Buffer.alloc(0); // fixture builds and texture-less forks stay valid
  return Buffer.from(`<script>window.__OV_TEXTURE_DATA__=${JSON.stringify(data)};</script>\n`);
}

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
  const textureScript = embeddedTextureScript(root);
  const scriptBlock = Buffer.concat([Buffer.from('<script>\n'), body, Buffer.from('</script>\n')]);
  const releaseHtml = Buffer.concat([before, textureScript, scriptBlock, after]);
  const devTags = Buffer.from(MODULES.map((m) => `<script src="src/${m}"></script>`).join('\n') + '\n');
  const devHtml = Buffer.concat([before, textureScript, devTags, after]);

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
