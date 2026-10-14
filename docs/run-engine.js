/* Offline research workflow execution tracker, not an AI executor. MIT. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ResearchRunEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const STATUSES = ['QUEUED','IN_PROGRESS','UNDER_REVIEW','NEEDS_FIX','BLOCKED','ACCEPTED'];
  const GATES = ['HUMAN_APPROVAL','DELIVERY_CHECK','INDEPENDENT_REVIEW'];
  function fail(message) { throw new Error(message); }
  function text(value, limit = 800) {
    if (typeof value !== 'string') fail('این مقدار باید متن باشد.');
    const v = value.trim();
    if (!v || v.length > limit) fail(`متن باید بین ۱ تا ${limit} نویسه باشد.`);
    return v;
  }
  function importPlan(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('فایل JSON معتبر نیست.');
    if (raw.schema_version !== '0.2' || !Array.isArray(raw.jobs) || !raw.jobs.length || raw.jobs.length > 500)
      fail('ساختار Manifest نسخه ۰.۲ معتبر نیست یا اندازه آن بیش از حد است.');
    const project = text(raw.project_name,200);
    const ids = new Set();
    const jobs = [];
    for (const source of raw.jobs) {
      if (!source || typeof source !== 'object' || Array.isArray(source)) fail('یکی از مأموریت‌ها معتبر نیست.');
      const id = text(source.id,120);
      if (!/^[a-zA-Z0-9_-]+$/.test(id) || ids.has(id)) fail('شناسه مأموریت نامعتبر یا تکراری است.');
      if (!Array.isArray(source.depends_on)) fail('وابستگی‌های مأموریت معتبر نیست.');
      if (!GATES.includes(source.gate)) fail('نوع کنترل مأموریت ناشناخته است.');
      if (source.gate === 'HUMAN_APPROVAL' && source.role !== 'human') fail('دروازه تأیید انسانی نقش اشتباه دارد.');
      if (source.depends_on.some(dep => typeof dep !== 'string' || !ids.has(dep))) fail('وابستگی ناموجود، چرخه‌ای یا خارج از ترتیب شناسایی شد.');
      const previous = source.status || 'QUEUED';
      if (!STATUSES.includes(previous)) fail('وضعیت یکی از مأموریت‌ها ناشناخته است.');
      // A previously accepted job is a self-reported claim; import it only with a complete evidence record.
      const evidence = source.evidence && typeof source.evidence === 'object' ? source.evidence : null;
      const accepted = previous === 'ACCEPTED';
      if (accepted && (!evidence || !evidence.artifact || !evidence.reviewer || !evidence.review_note ||
           (source.gate === 'HUMAN_APPROVAL' && !evidence.human_confirmed)))
        fail('برای ورود مأموریت پذیرفته‌شده، سابقه شاهد و ارزیابی لازم است. وضعیت‌های بدون سابقه را در فایل اصلاح کنید.');
      const job = {
        id, title: typeof source.title==='string' ? source.title.slice(0,220) : id,
        workflow_title: typeof source.workflow_title==='string' ? source.workflow_title.slice(0,220) : '',
        role: typeof source.role==='string' ? source.role.slice(0,60) : '', gate: source.gate,
        status: previous, depends_on: [...source.depends_on],
        expected_output: typeof source.expected_output==='string' ? source.expected_output.slice(0,300) : '',
        artifact: source.artifact || null, approved_by: source.approved_by || null,
        evidence: evidence ? {
          artifact: String(evidence.artifact||'').slice(0,800),
          submitted_note: String(evidence.submitted_note||'').slice(0,1000),
          reviewer: String(evidence.reviewer||'').slice(0,120),
          review_note: String(evidence.review_note||'').slice(0,1000),
          human_confirmed: evidence.human_confirmed === true
        } : null,
        issues: typeof source.issues==='string' ? source.issues.slice(0,1000) : ''
      };
      ids.add(id); jobs.push(job);
    }
    if (!jobs.some(j=>j.gate==='HUMAN_APPROVAL')) fail('این برنامه هیچ دروازه تأیید انسانی ندارد.');
    for (const j of jobs) {
      if (j.status === 'ACCEPTED' && j.depends_on.some(d => jobs.find(x=>x.id===d).status!=='ACCEPTED'))
        fail('فایل شامل مأموریت پذیرفته‌شده با وابستگی ناتمام است.');
    }
    return {
      schema_version:'0.2', generated_by:'research-progress-workbench-v0.3.1-rc1',
      project_name:project, workflow_id:raw.workflow_id||null,
      recipe_id:raw.recipe_id||null,
      workflows:Array.isArray(raw.workflows)?raw.workflows.filter(x=>typeof x==='string').slice(0,50):[],
      execution_mode:raw.execution_mode||'solo', canonical_inputs:[],
      status:'MANUALLY_TRACKED_NOT_SCIENTIFICALLY_VALIDATED', jobs,
      decisions:[],blockers:[],approval_log:[],public_release_approved:false,
      next_action:jobs.find(j=>j.status!=='ACCEPTED')?.id||null,
      _tracking_note:'پذیرش‌های ثبت‌شده خوداظهاری پژوهشگرند، نه اثبات علمی مستقل.'
    };
  }
  function clone(manifest) {return JSON.parse(JSON.stringify(manifest));}
  function find(m,id){const j=m.jobs.find(j=>j.id===id);if(!j)fail('مأموریت شناخته نشد.');return j;}
  function prerequisites(m,j){return j.depends_on.filter(dep=>find(m,dep).status!=='ACCEPTED');}
  function change(m,id,action,details={}){
    const next=clone(m); const j=find(next,id);
    if (action==='start') {
      if(!['QUEUED','NEEDS_FIX','BLOCKED'].includes(j.status))fail('این مأموریت در وضعیتی نیست که بتوان آن را آغاز کرد.');
      if(prerequisites(next,j).length)fail('ابتدا باید مأموریت‌های وابسته پذیرفته شوند.');
      j.status='IN_PROGRESS'; j.issues='';
    } else if(action==='submit') {
      if(j.status!=='IN_PROGRESS')fail('ابتدا مأموریت را آغاز کنید.');
      const artifact=text(details.artifact,800), submitted_note=text(details.submitted_note,1000);
      if(submitted_note.length<12)fail('دلیل ارسال و وضعیت شاهد باید دست‌کم ۱۲ نویسه باشد.');
      j.evidence={artifact,submitted_note,reviewer:'',review_note:'',human_confirmed:false};
      j.artifact=artifact;j.status='UNDER_REVIEW';
    } else if(action==='accept') {
      if(j.status!=='UNDER_REVIEW'||!j.evidence?.artifact)fail('فقط مأموریت دارای خروجی ثبت‌شده و منتظر ارزیابی پذیرفته می‌شود.');
      if(prerequisites(next,j).length)fail('وابستگی‌های این مأموریت هنوز پذیرفته نشده‌اند.');
      const reviewer=text(details.reviewer,120),review_note=text(details.review_note,1000);
      if(review_note.length<12)fail('یادداشت ارزیابی باید دست‌کم ۱۲ نویسه باشد.');
      if(j.gate==='HUMAN_APPROVAL' && details.human_confirmed!==true)
        fail('پذیرش این مرحله نیازمند علامت‌زدن تأیید صریح انسانی است.');
      j.evidence.reviewer=reviewer;j.evidence.review_note=review_note;
      j.evidence.human_confirmed=details.human_confirmed===true;
      j.approved_by=reviewer;j.status='ACCEPTED';
      next.approval_log.push({job_id:id,reviewer,note:review_note,human_confirmed:j.evidence.human_confirmed,kind:'USER_RECORDED_NOT_EXTERNALLY_VERIFIED'});
    } else if(action==='revise') {
      if(j.status!=='UNDER_REVIEW')fail('فقط مأموریت در انتظار ارزیابی را می‌توان بازگرداند.');
      j.issues=text(details.reason,1000);j.status='NEEDS_FIX';
    } else if(action==='block') {
      if(!['QUEUED','IN_PROGRESS','UNDER_REVIEW','NEEDS_FIX'].includes(j.status))fail('این مأموریت قابل مسدودسازی نیست.');
      j.issues=text(details.reason,1000);j.status='BLOCKED';
    } else if(action==='reopen') {
      if(j.status!=='ACCEPTED'||details.confirm_reset!==true)fail('بازگشایی نتیجه پذیرفته‌شده به تأیید صریح نیاز دارد.');
      const affected=new Set([id]);
      // Transitive invalidation: approved downstream claims must not remain valid after reopening upstream evidence.
      let changed=true;while(changed){changed=false;for(const t of next.jobs){if(!affected.has(t.id) && t.depends_on.some(d=>affected.has(d))){affected.add(t.id);changed=true;}}}
      for(const t of next.jobs){if(affected.has(t.id)){t.status='QUEUED';t.approved_by=null;t.artifact=null;t.evidence=null;t.issues='';}}
      next.approval_log=next.approval_log.filter(entry=>!affected.has(entry.job_id));
      next.decisions.push({kind:'REOPEN_INVALIDATED_DEPENDENTS',root:id,affected:[...affected],note:'بازگشایی دستی؛ شواهد و تأییدهای وابسته باطل شدند.'});
    } else fail('عملیات ناشناخته است.');
    next.next_action=next.jobs.find(t=>t.status!=='ACCEPTED')?.id||null;
    return next;
  }
  function summary(m){let result={total:m.jobs.length,accepted:0,under_review:0,in_progress:0,blocked:0,ready:0};for(const j of m.jobs){
    if(j.status==='ACCEPTED')result.accepted++;
    if(j.status==='UNDER_REVIEW')result.under_review++;
    if(j.status==='IN_PROGRESS')result.in_progress++;
    if(j.status==='BLOCKED')result.blocked++;
    if(['QUEUED','NEEDS_FIX','BLOCKED'].includes(j.status)&&prerequisites(m,j).length===0)result.ready++;
  }return result;}
  function prompt(m,id){const j=find(m,id);return [
   `# مأموریت ${j.id}: ${j.title}`,`پژوهش: ${m.project_name}`,`نقش: ${j.role}`,
   `خروجی موردانتظار: ${j.expected_output||'طبق قرارداد مرحله'}`,
   `وابستگی‌ها: ${j.depends_on.join('، ')||'ندارد'}`,
   `دروازه: ${j.gate}`,'',
   'فقط با ورودی‌های معتبر و شواهد واقعاً خوانده‌شده پیش برو. اگر ورودی ناموجود است، صریحاً BLOCKED گزارش کن.',
   'داده یا استناد جعل نکن. خروجی و محدودیت‌ها را ثبت کن.',
   'تأیید علمی، اخلاقی و انتشار از اختیارات پژوهشگر است. این دستور به‌تنهایی اجرای خودکار یا تأیید مستقل نیست.'
  ].join('\n');}
  return {STATUSES,importPlan,change,prerequisites,summary,prompt};
});
