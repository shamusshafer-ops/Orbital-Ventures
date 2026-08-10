const crypto=require('crypto');
const fs=require('fs');
const path=require('path');

// Evidence captures are made before the closure commit, so HEAD alone cannot
// identify the bytes under test. Hash the authoritative source, test, asset,
// and contract files while deliberately excluding generated evidence/output.
function evidenceFingerprint(root){
  const files=[];
  const visit=relative=>{
    const target=path.join(root,relative);
    if(!fs.existsSync(target)) return;
    const stat=fs.lstatSync(target);
    if(stat.isSymbolicLink()) throw new Error(`fingerprint refuses symlink: ${relative}`);
    if(stat.isDirectory()){
      for(const name of fs.readdirSync(target).sort()) visit(path.join(relative,name));
    }else if(stat.isFile()) files.push(relative.split(path.sep).join('/'));
  };
  for(const relative of ['build.js','src','tests','assets','docs/GATE-1-CONTRACTS.md','docs/GATE-2-CONTRACTS.md','docs/GATE-3-CONTRACTS.md','docs/GATE-5-CONTRACTS.md','docs/SAVE-VERSIONS.md']) visit(relative);
  const aggregate=crypto.createHash('sha256');
  const entries=files.sort().map(relative=>{
    const bytes=fs.readFileSync(path.join(root,relative));
    const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
    aggregate.update(relative); aggregate.update('\0'); aggregate.update(sha256); aggregate.update('\n');
    return {path:relative,bytes:bytes.length,sha256};
  });
  return {algorithm:'sha256',scope:'authoritative source/tests/assets and Gate 1-3/5 contracts; generated evidence excluded',
    digest:aggregate.digest('hex'),fileCount:entries.length,totalBytes:entries.reduce((sum,entry)=>sum+entry.bytes,0),entries};
}

module.exports={evidenceFingerprint};
