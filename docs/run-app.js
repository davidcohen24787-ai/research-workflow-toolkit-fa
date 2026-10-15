/* UI-only application. No network calls, no account access, no automatic persistence. */
(function(){
'use strict';
const E=window.ResearchRunEngine, $=id=>document.getElementById(id);
const STATUS={QUEUED:'در صف',IN_PROGRESS:'در حال انجام',UNDER_REVIEW:'در انتظار ارزیابی',NEEDS_FIX:'نیازمند اصلاح',BLOCKED:'متوقف',ACCEPTED:'پذیرفته‌شده'};
let plan=null,selected=null,dirty=false;
function feedback(s,isError=false){$('run-feedback').textContent=s;if(isError)$('run-error').textContent=s;}
function element(tag,text,cls){const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;}
function selectedJob(){return plan.jobs.find(j=>j.id===selected);}
function action(name, details={}){
 try{plan=E.change(plan,selected,name,details);dirty=true;$('run-error').hidden=true;render();feedback('وضعیت تغییر کرد. برای نگهداری نتیجه، فایل وضعیت جدید را دریافت کنید.');}
 catch(e){feedback(e.message,true);$('run-error').hidden=false;}
}
function render(){
 $('run-board').hidden=false;$('taskdetails').hidden=!selected;$('run-intro').hidden=!!selected;$('project-title').textContent=plan.project_name;
 const s=E.summary(plan);$('run-stats').replaceChildren();
 for(const [number,label] of [[s.total,'کل'],[s.accepted,'پذیرفته‌شده'],[s.under_review,'منتظر ارزیابی'],[s.ready,'آماده شروع']])$('run-stats').appendChild(element('span',`${number} ${label}`));
 $('run-list').replaceChildren();for(const j of plan.jobs){const btn=element('button',null,'job'+(j.id===selected?' active':''));btn.type='button';btn.appendChild(element('strong',j.title||j.id),element('span',`${j.id} · ${STATUS[j.status]}`,'meta'));btn.addEventListener('click',()=>{selected=j.id;render();});$('run-list').appendChild(btn);}
 if(!selected)return;
 const j=selectedJob(), deps=E.prerequisites(plan,j);
 $('jobtitle').textContent=j.title||j.id;$('jobstatus').textContent=`وضعیت: ${STATUS[j.status]} | کنترل: ${j.gate}`;
 $('jobdeps').textContent=deps.length?`موانع وابستگی: ${deps.join('، ')}`:'وابستگی‌های لازم پذیرفته شده‌اند.';
 $('joboutput').textContent=`خروجی مورد انتظار: ${j.expected_output||'طبق قرارداد مأموریت'}`;
 $('jobprompt').textContent=E.prompt(plan,selected);
 $('start').hidden=!['QUEUED','NEEDS_FIX','BLOCKED'].includes(j.status);$('start').disabled=deps.length>0;
 $('reopen').hidden=j.status!=='ACCEPTED';
 $('submit-form').hidden=j.status!=='IN_PROGRESS';$('review-form').hidden=j.status!=='UNDER_REVIEW';
 $('block-form').hidden=!['QUEUED','IN_PROGRESS','UNDER_REVIEW','NEEDS_FIX'].includes(j.status);
 $('humanrow').hidden=j.gate!=='HUMAN_APPROVAL';$('human-confirm').checked=false;
 $('run-feedback').textContent=dirty?'بعد از هر تغییر، فایل وضعیت را دانلود کنید تا پیشرفت از دست نرود.':'';
}
function download(name,data,type){const b=new Blob([data],{type:type+';charset=utf-8'});const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);}
$('manifest-file').addEventListener('change',async function(){
 const file=this.files?.[0];if(!file)return;
 try{
  if(file.size>2_000_000)throw new Error('حجم فایل از حد مجاز بیشتر است (۲ مگابایت).');
  const raw=JSON.parse(await file.text());const imported=E.importPlan(raw);
  if(dirty && !window.confirm('تغییرات ثبت‌شده را هنوز دانلود نکرده‌اید. برنامه دیگری بارگذاری شود؟'))return;
  plan=imported;selected=plan.jobs.find(j=>j.status!=='ACCEPTED')?.id||plan.jobs[0].id;dirty=false;
  $('run-error').hidden=true;render();
 }catch(e){$('run-error').textContent=e.message;$('run-error').hidden=false;}
});
$('start').addEventListener('click',()=>action('start'));
$('submit').addEventListener('click',()=>action('submit',{artifact:$('artifact').value,submitted_note:$('submitted-note').value}));
$('accept').addEventListener('click',()=>action('accept',{reviewer:$('reviewer').value,review_note:$('review-note').value,human_confirmed:$('human-confirm').checked}));
$('revise').addEventListener('click',()=>action('revise',{reason:$('reason').value}));
$('block').addEventListener('click',()=>action('block',{reason:$('reason').value}));
$('reopen').addEventListener('click',()=>{if(window.confirm('بازگشایی این مرحله، همه پذیرش‌های وابسته را نیز باطل می‌کند. ادامه می‌دهید؟'))action('reopen',{confirm_reset:true});});
$('download-progress').addEventListener('click',()=>{if(!plan)return;download('research-progress.json',JSON.stringify(plan,null,2)+'\n','application/json');dirty=false;render();});
$('save-prompt').addEventListener('click',()=>{if(plan&&selected)download(`job-${selected}.md`,E.prompt(plan,selected)+'\n','text/markdown');});
$('copy-prompt').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(E.prompt(plan,selected));feedback('متن مأموریت کپی شد.');}catch{feedback('دسترسی به کپی خودکار ندارید؛ متن را انتخاب و کپی کنید.');}});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
})();
