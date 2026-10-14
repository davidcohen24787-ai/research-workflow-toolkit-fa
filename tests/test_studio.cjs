const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {spawnSync} = require('node:child_process');
const engine = require('../docs/studio-engine.js');
const base = path.join(__dirname,'..');
const catalog = JSON.parse(fs.readFileSync(path.join(base,'docs/studio-catalog.json'),'utf8'));
const recipeIds = catalog.recipes.map(r=>r.recipe_id);

test('single source of truth catalog: 12 workflows, 5 recipes', () => {
  assert.equal(catalog.workflows.length,12);
  assert.equal(catalog.recipes.length,5);
  assert.deepEqual([...new Set(catalog.workflows.map(w=>w.workflow_id))].length,12);
  assert.ok(catalog.workflows.every(w=>w.tasks.some(t=>t.gate==='HUMAN_APPROVAL')));
});

test('all 5 recipes × all 3 modes generate valid, dependency-ordered, unapproved manifests', () => {
  for(const rid of recipeIds)for(const mode of engine.MODES){
    const manifest = engine.buildPlan(catalog,{projectName:'پژوهش نمونه',recipeId:rid,mode,extras:[]});
    const seen = new Set();
    for(const j of manifest.jobs){
      for(const d of j.depends_on)assert.ok(seen.has(d),`${rid}/${mode}: ${j.id} before ${d}`);
      seen.add(j.id);
      assert.equal(j.status,'QUEUED');assert.equal(j.approved_by,null);assert.equal(j.artifact,null);
    }
    assert.equal(manifest.public_release_approved,false);
    assert.ok(manifest.jobs.some(j=>j.gate==='HUMAN_APPROVAL'));
    assert.equal(manifest.status,'PLANNING_TEMPLATE_NOT_EXECUTED');
  }
});

test('optional workflows sorted into original research sequence',()=>{
  const p=engine.buildPlan(catalog,{projectName:'نمونه',recipeId:'conceptual',mode:'solo',extras:['W02']});
  assert.deepEqual(p.workflows,['W01','W02','W03','W05','W06','W10','W11','W12']);
  assert.ok(p.jobs.find(j=>j.id==='W03-'+catalog.workflows[2].tasks[0].id).depends_on.includes('W02-'+catalog.workflows[1].tasks.at(-1).id));
});

test('custom plan permits one stage, still demands human approval',()=>{
  const p=engine.buildPlan(catalog,{projectName:'نمونه',recipeId:'custom',mode:'solo',extras:['W05']});
  assert.deepEqual(p.workflows,['W05']); assert.equal(p.workflow_id,'W05');
  assert.ok(p.jobs.some(j=>j.gate==='HUMAN_APPROVAL'));
});

test('reject empty title, invalid mode, missing steps, unknown ids, duplicated steps',()=>{
  const defaults={projectName:'نمونه',recipeId:'custom',mode:'solo',extras:['W01']};
  for(const override of [{projectName:''},{projectName:'x'.repeat(201)},{mode:'direct-work'},
    {extras:[]},{extras:['W88']},{extras:['W01','W01']},{recipeId:'bogus'}]){
    assert.throws(()=>engine.buildPlan(catalog,{...defaults,...override}));
  }
});

test('cannot inject unapproved optional workflow in a recipe',()=>{
  assert.throws(()=>engine.buildPlan(catalog,{projectName:'نمونه',recipeId:'systematic-review',mode:'solo',extras:['W08']}));
});

test('handoff uses raw text: malicious markup treated as text, never executed',()=>{
  const p=engine.buildPlan(catalog,{projectName:'<script>alert(42)</script>',recipeId:'custom',mode:'solo',extras:['W01']});
  const note=engine.card(p,p.jobs[0]);
  assert.ok(note.includes('<script>alert(42)</script>'));
  assert.ok(note.includes('هیچ تصمیم علمی'));
  const html=fs.readFileSync(path.join(base,'docs/index.html'),'utf8');
  assert.ok(html.includes('id="toolkit-catalog" type="application/json"'));
  assert.ok(!html.includes('<!--INSERT_CANONICAL_CATALOG-->'));
  const app=fs.readFileSync(path.join(base,'docs/studio-app.js'),'utf8');
  assert.ok(!app.includes('.innerHTML'));
  assert.ok(!app.includes('localStorage'));
  assert.ok(!app.includes('fetch('));
});

test('cross-language parity: generated Python manifest and browser manifest share job graph',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'research-studio-'));
  try {
    const file=path.join(dir,'manifest.json');
    const run=spawnSync(process.env.PYTHON || 'python',['tools/new_project.py','--project','نمونه','--recipe','conceptual','--mode','supervised','--output',file],{cwd:base,encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);
    const py=JSON.parse(fs.readFileSync(file,'utf8'));
    const js=engine.buildPlan(catalog,{projectName:'نمونه',recipeId:'conceptual',mode:'supervised',extras:[]});
    assert.deepEqual(js.jobs.map(j=>({id:j.id,role:j.role,gate:j.gate,status:j.status,depends_on:j.depends_on,artifact:j.artifact,approved_by:j.approved_by})),py.jobs);
    assert.deepEqual(js.workflows,py.workflows);
    assert.equal(js.next_action,py.next_action);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('no external script dependency, embedded catalog cannot terminate script with injected HTML',()=>{
  const html=fs.readFileSync(path.join(base,'docs/index.html'),'utf8');
  const start='<script id="toolkit-catalog" type="application/json">';
  const data=html.split(start)[1].split('</script>')[0];
  assert.equal(JSON.parse(data).workflows.length,12);
  assert.ok(html.includes('<script src="./studio-engine.js"></script>'));
  assert.ok(html.includes('<script src="./studio-app.js" defer></script>'));
  assert.ok(!html.includes('google-analytics'));
});
