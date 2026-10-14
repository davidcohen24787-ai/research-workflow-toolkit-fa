/* Research Workflow Studio: deterministic, offline-only planning. MIT License. */
(function (root, factory) {
  const engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  else root.WorkflowStudioEngine = engine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MODES = ['solo', 'supervised', 'agentic-conditional'];
  const MODE_NAMES = {
    solo: 'یک گفت‌وگو با کنترل پژوهشگر',
    supervised: 'چند گفت‌وگو با سرپرستی انسانی/Work (در صورت دسترسی)',
    'agentic-conditional': 'عامل‌محورِ مشروط به ابزار و مجوز واقعی'
  };
  function must(ok, explanation) { if (!ok) throw new Error(explanation); }
  function ordered(ids) { return [...ids].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))); }
  function selectWorkflows(catalog, recipeId, extras) {
    must(catalog && Array.isArray(catalog.workflows) && Array.isArray(catalog.recipes), 'فهرست تعریف‌ها ناقص است.');
    must(Array.isArray(extras), 'فهرست مرحله‌های انتخابی باید آرایه باشد.');
    const valid = new Set(catalog.workflows.map(x => x.workflow_id));
    let ids;
    if (recipeId === 'custom') {
      ids = extras;
    } else {
      const recipe = catalog.recipes.find(x => x.recipe_id === recipeId);
      must(recipe, 'مسیر پژوهشی ناشناخته است.');
      const optional = new Set(recipe.optional_workflows);
      must(extras.every(id => optional.has(id)), 'یک مرحله بیرون از موارد اختیاری این مسیر انتخاب شده است.');
      ids = [...recipe.workflows, ...extras];
    }
    must(ids.length > 0, 'دست‌کم یک مرحله انتخاب کنید.');
    must(ids.every(id => valid.has(id)), 'یکی از شناسه‌های مراحل نامعتبر است.');
    must(new Set(ids).size === ids.length, 'مرحله تکراری انتخاب شده است.');
    return ordered(ids);
  }
  function buildPlan(catalog, settings) {
    must(settings && typeof settings === 'object', 'تنظیمات پروژه لازم است.');
    const project = String(settings.projectName || '').trim();
    must(project.length > 0 && project.length <= 200, 'عنوان پژوهش باید بین ۱ تا ۲۰۰ نویسه باشد.');
    must(MODES.includes(settings.mode), 'شیوه اجرا معتبر نیست.');
    const ids = selectWorkflows(catalog, settings.recipeId, settings.extras || []);
    const byId = new Map(catalog.workflows.map(x => [x.workflow_id, x]));
    const jobs = [];
    let last = null;
    for (const wid of ids) {
      const workflow = byId.get(wid);
      must(workflow.modes.includes(settings.mode), `حالت اجرایی برای ${wid} پشتیبانی نشده است.`);
      const localIds = new Set(workflow.tasks.map(task => task.id));
      must(workflow.tasks.every(t => (t.depends_on || []).every(dep => localIds.has(dep))), `${wid} وابستگی محلی نامعتبر دارد.`);
      for (const task of workflow.tasks) {
        must(task.gate !== 'HUMAN_APPROVAL' || task.role === 'human', `دروازه انسانی ${wid} معتبر نیست.`);
        const deps = task.depends_on.map(dep => `${wid}-${dep}`);
        if (!deps.length && last) deps.push(last);
        jobs.push({
          id: `${wid}-${task.id}`, title: task.title, workflow_title: workflow.title,
          role: task.role, gate: task.gate, status: 'QUEUED',
          depends_on: deps, expected_output: task.output,
          artifact: null, approved_by: null
        });
      }
      last = `${wid}-${workflow.tasks[workflow.tasks.length - 1].id}`;
    }
    must(jobs.some(j => j.gate === 'HUMAN_APPROVAL'), 'این طرح دروازه تأیید انسانی ندارد.');
    return {
      schema_version: '0.2', generated_by: 'research-workflow-studio-v0.3.0-rc1',
      status: 'PLANNING_TEMPLATE_NOT_EXECUTED', project_name: project,
      workflow_id: ids.length === 1 ? ids[0] : null,
      recipe_id: settings.recipeId === 'custom' ? null : settings.recipeId,
      workflows: ids, execution_mode: settings.mode, canonical_inputs: [],
      jobs, decisions: [], blockers: [], approval_log: [],
      public_release_approved: false, next_action: jobs[0].id
    };
  }
  function card(manifest, job) {
    must(manifest && job && manifest.jobs.some(j => j.id === job.id), 'وظیفه ناشناخته است.');
    return [
      `# برگه مأموریت | ${job.id}`,
      `**پژوهش:** ${manifest.project_name}`,
      `**مرحله:** ${job.workflow_title}`,
      `**مأموریت:** ${job.title}`,
      `**نقش:** ${job.role}`,
      `**خروجی لازم:** ${job.expected_output}`,
      `**وابستگی‌های ضروری:** ${job.depends_on.join('، ') || 'ندارد'}`,
      `**دروازه کنترل:** ${job.gate}`,
      '',
      '## دستور برای عامل/پژوهشگر',
      'فقط همین مأموریت را با ورودی‌های واقعی و مجاز انجام بده؛ ورودی یا منبع مفقود را حدس نزن.',
      'درباره دسترسی به متن اصلی، محدودیت‌ها و وضعیت واقعی خروجی صریح باش.',
      'هیچ تصمیم علمیِ حساس یا تأیید انتشار را از طرف پژوهشگر صادر نکن.',
      'اگر وابستگی یا ابزار در دسترس نیست، BLOCKED ثبت کن؛ نتیجه ساختگی نساز.',
      'خروجی واقعی و قابل‌وارسی، موارد حل‌نشده و اقدام بعدی را بنویس.',
      '',
      '**یادآوری:** این متن فقط مأموریت را تعریف می‌کند؛ ارسال خودکار به Chat/Work یا احراز علمی صورت نگرفته است.'
    ].join('\n');
  }
  function overview(manifest, catalog) {
    const byId = new Map(catalog.workflows.map(w => [w.workflow_id, w]));
    const count = manifest.jobs.filter(j => j.gate === 'HUMAN_APPROVAL').length;
    return [
      `# نقشه اجرایی پژوهش: ${manifest.project_name}`,
      '',
      `**شیوه اجرا:** ${MODE_NAMES[manifest.execution_mode]}`,
      '**وضعیت:** فقط طرح پیشنهادی؛ هیچ پژوهش یا اجرای خودکاری انجام نشده است.',
      `**تعداد مراحل:** ${manifest.workflows.length} | **وظایف:** ${manifest.jobs.length} | **تأییدهای انسانی:** ${count}`,
      '',
      '## مراحل منتخب',
      ...manifest.workflows.map((id, i) => `${i + 1}. ${id} — ${byId.get(id).title} (ریسک ${byId.get(id).risk_tier})`),
      '',
      '## مقررات اجرای درست',
      '۱. ورودی‌های واقعی و معیارهای علمی هر مرحله را پژوهشگر مشخص کند.',
      '۲. صرف تولید فایل به معنای صحت منبع، کفایت علمی یا اجرای کار نیست.',
      '۳. مراحل وابسته پس از پذیرش خروجی معتبر شروع شوند.',
      '۴. تأیید علمی، اخلاقی و انتشار عمومی همواره به تصمیم صریح انسان وابسته است.',
      '۵. حالت عامل‌محور مجوز اجرای خودکار یا دسترسی به ابزارهای حساب نیست.',
      '',
      `**مأموریت آغازین:** ${manifest.next_action}`
    ].join('\n');
  }
  return { MODES, MODE_NAMES, ordered, selectWorkflows, buildPlan, card, overview };
});
