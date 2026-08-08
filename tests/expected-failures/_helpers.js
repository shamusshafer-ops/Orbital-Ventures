function createExpectedFailureTracker(issueId, title){
  const failures=[];
  let checks=0;
  let finished=false;
  const resultPath=process.env.OV_XFAIL_RESULT_PATH;
  function writeResult(result){
    if(resultPath) require('fs').writeFileSync(resultPath,JSON.stringify(result));
  }
  function setupError(name,detail){
    const marker=`[SETUP-ERROR ${issueId}] ${name}${detail?` -- ${detail}`:''}`;
    console.error(marker);
    writeResult({schema:1,kind:'setup-error',issueId,title,name,detail:detail||'',marker,exitCode:2});
    process.exit(2);
  }
  return {
    // Preconditions are deliberately separate from target invariants. A broken
    // fixture must never be inverted into a reproduced product defect.
    setup(name, condition, detail){
      if(!condition) setupError(name,detail);
    },
    expect(name, condition, detail){
      checks++;
      if(!condition) failures.push({name, detail:detail||''});
    },
    finish(){
      if(finished) setupError('finish called more than once');
      finished=true;
      if(failures.length){
        for(const failure of failures){
          console.error(`XFAIL ${issueId}: ${failure.name}${failure.detail?` -- ${failure.detail}`:''}`);
        }
        const marker=`[EXPECTED-FAIL ${issueId}] ${title} (${failures.length}/${checks} invariant checks failing)`;
        console.error(marker);
        writeResult({schema:1,kind:'xfail',issueId,title,checks,failures,marker,exitCode:42});
        // Exit 42 is reserved for a fully evaluated, intentional XFAIL. An
        // uncaught exception after finish changes Node's exit status, so the
        // parent cannot mistake a crash for this protocol outcome.
        process.exitCode=42;
        return;
      }
      const marker=`[UNEXPECTED-PASS ${issueId}] ${title} (${checks}/${checks} invariant checks passing)`;
      console.log(marker);
      writeResult({schema:1,kind:'xpass',issueId,title,checks,failures:[],marker,exitCode:0});
      process.exitCode=0;
    }
  };
}
