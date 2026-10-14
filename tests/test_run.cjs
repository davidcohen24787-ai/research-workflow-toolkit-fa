const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const E=require('../docs/run-engine.js');
function fixture(){return {schema_version:'0.2',project_name:'رساله نمونه',recipe_id:'conceptual',workflows:['W01'],execution_mode:'solo',jobs:[
 {id:'W01-scope',title:'بررسی دامنه',role:'specialist',gate:'DELIVERY_CHECK',status:'QUEUED',depends_on:[],expected_output:'scope.md'},
 {id:'W01-review',title:'داوری',role:'reviewer',gate:'INDEPENDENT_REVIEW',status:'QUEUED',depends_on:['W01-scope'],expected_output:'review.md'},
 {id:'W01-approve',title:'تصویب پژوهشگر',role:'human',gate:'HUMAN_APPROVAL',status:'QUEUED',depends_on:['W01-review'],expected_output:'approval.md'}]};}
function entered(){return E.importPlan(fixture());}
function complete(m,id,human=false){m=E.change(m,id,'start');m=E.change(m,id,'submit',{artifact:id+'.md',submitted_note:'خروجی واقعی و محدودیت‌ها بررسی شده‌اند.'});m=E.change(m,id,'accept',{reviewer:'پژوهشگر',review_note:'مطابقت با معیارهای پذیرفته‌شده بررسی و ثبت شد.',human_confirmed:human});return m;}
test('import accepted JSON only when evidence exists and dependencies valid',()=>{
 const m=entered();assert.equal(m.jobs.length,3);assert.equal(m.public_release_approved,false);
 const unsafe=fixture();unsafe.jobs[0].status='ACCEPTED';assert.throws(()=>E.importPlan(unsafe),/شاهد/);
});
test('cannot advance before prerequisites, cannot submit without output',()=>{
 let m=entered();assert.throws(()=>E.change(m,'W01-review','start'),/وابسته/);
 m=E.change(m,'W01-scope','start');assert.throws(()=>E.change(m,'W01-scope','accept',{reviewer:'x',review_note:'xxxxxxxxxxxxx'}));
 assert.throws(()=>E.change(m,'W01-scope','submit',{artifact:'',submitted_note:'some long explanation'}));
});
test('submitted output requires review with reason',()=>{
 let m=entered();m=E.change(m,'W01-scope','start');m=E.change(m,'W01-scope','submit',{artifact:'file.md',submitted_note:'شرح شواهد لازم برای ممیزی'});
 assert.equal(m.jobs[0].status,'UNDER_REVIEW');assert.throws(()=>E.change(m,'W01-scope','accept',{reviewer:'',review_note:'متن مناسب و قابل داوری است'}));
 m=E.change(m,'W01-scope','accept',{reviewer:'شخص متخصص',review_note:'متن دقیقاً با معیارهای مرحله سنجیده شد'});
 assert.equal(m.jobs[0].status,'ACCEPTED');assert.equal(E.summary(m).accepted,1);
});
test('human gate cannot be bypassed by a default approval',()=>{
 let m=entered();m=complete(m,'W01-scope');m=complete(m,'W01-review');
 m=E.change(m,'W01-approve','start');m=E.change(m,'W01-approve','submit',{artifact:'approval.md',submitted_note:'بررسی جامع و دستی انجام گرفته است'});
 assert.throws(()=>E.change(m,'W01-approve','accept',{reviewer:'شخص مسئول',review_note:'این مرحله پس از بازبینی مستقیم تأیید شد.'}),/انسانی/);
 m=E.change(m,'W01-approve','accept',{reviewer:'شخص مسئول',review_note:'این مرحله پس از بازبینی مستقیم تأیید شد.',human_confirmed:true});
 assert.equal(m.jobs[2].status,'ACCEPTED');assert.equal(m.public_release_approved,false);
});
test('reject and block keep a reason and allow controlled restart',()=>{
 let m=entered();m=E.change(m,'W01-scope','start');m=E.change(m,'W01-scope','submit',{artifact:'draft.md',submitted_note:'نسخه اولیه برای داوری آماده است'});
 m=E.change(m,'W01-scope','revise',{reason:'شرح روش نامعتبر است'});assert.equal(m.jobs[0].status,'NEEDS_FIX');
 m=E.change(m,'W01-scope','start');m=E.change(m,'W01-scope','block',{reason:'فایل منبع فعلاً در دسترس نیست'});assert.equal(m.jobs[0].status,'BLOCKED');
 m=E.change(m,'W01-scope','start');assert.equal(m.jobs[0].status,'IN_PROGRESS');
});
test('reopening an accepted ancestor invalidates ALL downstream approvals',()=>{
 let m=entered();m=complete(m,'W01-scope');m=complete(m,'W01-review');m=complete(m,'W01-approve',true);
 assert.throws(()=>E.change(m,'W01-scope','reopen'),/تأیید/);
 m=E.change(m,'W01-scope','reopen',{confirm_reset:true});
 assert.deepEqual(m.jobs.map(j=>j.status),['QUEUED','QUEUED','QUEUED']);
 assert.ok(m.jobs.every(j=>j.evidence===null&&j.approved_by===null));assert.equal(m.approval_log.length,0);assert.equal(m.public_release_approved,false);
});
test('export-import roundtrip preserves user decisions and is not auto validation',()=>{
 let m=entered();m=complete(m,'W01-scope');m=E.importPlan(JSON.parse(JSON.stringify(m)));
 assert.equal(m.jobs[0].status,'ACCEPTED');assert.match(m._tracking_note,/خوداظهاری/);
 assert.equal(m.jobs[1].status,'QUEUED');
});
test('reject malicious, duplicate, circular or oversized manifests',()=>{
 const invalids=[(()=>{let f=fixture();f.jobs[1].id=f.jobs[0].id;return f;})(),(()=>{let f=fixture();f.jobs[0].depends_on=['W01-approve'];return f;})(),(()=>{let f=fixture();f.jobs[1].status='DONE';return f;})(),(()=>{let f=fixture();f.jobs[2].gate='DELIVERY_CHECK';return f;})(),(()=>{let f=fixture();f.jobs=[];return f;})()];
 for(const f of invalids)assert.throws(()=>E.importPlan(f));
});
test('DOM rendering uses textContent, no autosave, no network, and contains download/resume controls',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../docs/run.html'),'utf8'),app=fs.readFileSync(path.join(__dirname,'../docs/run-app.js'),'utf8');
 for(const key of ['manifest-file','download-progress','human-confirm','reopen'])assert.ok(html.includes(`id="${key}"`));
 assert.ok(!app.includes('innerHTML'));assert.ok(!app.includes('localStorage'));assert.ok(!app.includes('fetch('));
 assert.ok(app.includes('file.text()'));assert.ok(app.includes("window.confirm"));
});
