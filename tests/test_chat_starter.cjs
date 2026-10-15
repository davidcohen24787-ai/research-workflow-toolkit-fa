const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const root=path.join(__dirname,'..');
const helper=require('../docs/chat-app.js');
const file=fs.readFileSync(path.join(root,'docs/chat.html'),'utf8');
const token='<script id="chat-kit-data" type="application/json">';
const data=JSON.parse(file.split(token)[1].split('</script>')[0]);

test('Five real recipe definitions, two native-chat platforms',()=>{
 assert.equal(data.recipes.length,5);
 assert.deepEqual(Object.keys(data.platforms).sort(),['chatgpt','gemini']);
 for(const p of ['chatgpt','gemini'])assert.ok(data.platforms[p].length>200);
});
test('Every study path × platform boots without API keys',()=>{
 for(const r of data.recipes)for(const p of ['chatgpt','gemini']){
  const x=helper.output(data,p,r.recipe_id,'پژوهش نمونه');
  assert.ok(x.instructions.length>250);
  assert.ok(x.start.includes(r.title));
  for(const id of r.workflows)assert.ok(x.start.includes(id));
  assert.ok(x.reference.includes('W12'));
  assert.ok(x.transfer.includes('TRANSFER_SCHEMA'));
 }
});
test('Platform instructions retain human gates and prohibit invented evidence',()=>{
 for(const v of Object.values(data.platforms)){
  assert.match(v,/تأیید صریح/);
  assert.match(v,/جعل نکن/);
  assert.match(v,/مرحله بعد/);
  assert.match(v,/بسته انتقال/);
 }
});
test('Scientific and agency boundaries present in canonical protocol',()=>{
 assert.match(data.protocol,/بازکردن خودکار چت‌های مستقل نکنید/);
 assert.match(data.protocol,/نبود پاسخ/);
 assert.match(data.reference,/UNREAD/);
});
test('Do not require costly API credentials or promise cross-company auto memory',()=>{
 for(const v of Object.values(data.platforms)) {
  assert.doesNotMatch(v,/api\.openai\.com|generativelanguage\.googleapis\.com|sk-proj-/i);
  assert.match(v,/انتقال/);
 }
 assert.match(data.transfer,/خودکار نیست/);
});
test('Reject invalid platform, recipe or research title',()=>{
 for(const [p,r,t] of [['unknown','conceptual','عنوان'],['gemini','bad','عنوان'],['chatgpt','conceptual',''],['chatgpt','conceptual','x'.repeat(201)]]){
  assert.throws(()=>helper.output(data,p,r,t));
 }
});
test('No data leaves the browser, and untrusted titles use textContent',()=>{
 const app=fs.readFileSync(path.join(root,'docs/chat-app.js'),'utf8');
 assert.ok(!app.includes('fetch('));
 assert.ok(!app.includes('localStorage'));
 assert.ok(!app.includes('.innerHTML'));
 assert.ok(app.includes('.textContent=result[k]'));
 assert.match(file,/id="chat-kit-data" type="application\/json"/);
 assert.ok(!file.includes('<!--INSERT_CHAT_KIT-->'));
});
test('Generator output matches committed chat page',()=>{
 const out=cp.spawnSync(process.env.PYTHON||'python',['tools/generate_chat_starter.py','--check'],{cwd:root,encoding:'utf8'});
 assert.equal(out.status,0,out.stderr+' '+out.stdout);
});
test('Prompt makes no scientific completion claim at setup',()=>{
 const v=helper.output(data,'chatgpt','systematic-review','تحلیل مطالعه');
 assert.match(v.start,/منابع واقعاً در دسترس/);
 assert.match(v.start,/فقط مأموریت اول/);
 assert.doesNotMatch(v.start,/همه مراحل انجام شد/);
});
