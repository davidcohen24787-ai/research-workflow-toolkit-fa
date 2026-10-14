/* Plain browser script; no network calls or telemetry. */
(function () {
  'use strict';
  const E = window.WorkflowStudioEngine;
  const catalog = JSON.parse(document.getElementById('toolkit-catalog').textContent);
  const el = id => document.getElementById(id);
  let lastPlan = null;
  let lastCard = '';
  const recipeSelect = el('recipe');
  for (const r of catalog.recipes) {
    const o = document.createElement('option'); o.value = r.recipe_id; o.textContent = r.title; recipeSelect.appendChild(o);
  }
  const o = document.createElement('option'); o.value = 'custom'; o.textContent = 'مسیر اختصاصی (انتخاب آزاد مراحل)'; recipeSelect.appendChild(o);
  const byId = new Map(catalog.workflows.map(w => [w.workflow_id, w]));
  function element(tag, cls, text) {
    const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n;
  }
  function renderStages() {
    const recipe = catalog.recipes.find(r => r.recipe_id === recipeSelect.value);
    el('stages').replaceChildren();
    el('recipe-note').textContent = recipe ? recipe.adaptation_notes : 'در این حالت، مسئول انتخاب وابستگی‌ها و کفایت روش پژوهش شما هستید.';
    for (const w of catalog.workflows) {
      if (recipe && !recipe.workflows.includes(w.workflow_id) && !recipe.optional_workflows.includes(w.workflow_id)) continue;
      const required = !!recipe && recipe.workflows.includes(w.workflow_id);
      const row = element('div', 'stage');
      const group = element('label', 'stage-main');
      const box = document.createElement('input');box.type = 'checkbox';box.value = w.workflow_id;box.checked = required;box.disabled = required;box.dataset.workflow = w.workflow_id;
      const name = element('span', '', `${w.workflow_id} — ${w.title}`);
      group.append(box, name);
      row.append(group, element('span', required ? 'fixed' : 'risk', required ? 'ضروری' : 'اختیاری'));
      el('stages').appendChild(row);
    }
  }
  function currentSettings() {
    const mode = document.querySelector('input[name="mode"]:checked').value;
    const extras = [...document.querySelectorAll('input[data-workflow]:checked:not(:disabled)')].map(n => n.value);
    return { projectName: el('project').value, mode, recipeId: recipeSelect.value, extras };
  }
  function download(filename, text, type) {
    const blob = new Blob([text], {type: type + ';charset=utf-8'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = filename;
    document.body.appendChild(link); link.click();link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  }
  function feedback(message) {el('feedback').textContent = message;}
  function generate() {
    el('error').hidden = true;
    try {
      const plan = E.buildPlan(catalog, currentSettings());
      lastPlan = plan;
      const first = plan.jobs[0];lastCard = E.card(plan, first);
      el('metrics').replaceChildren();
      const nums = [[plan.workflows.length, 'مرحله منتخب'], [plan.jobs.length, 'وظیفه تعریف‌شده'], [plan.jobs.filter(j => j.gate === 'HUMAN_APPROVAL').length, 'دروازه انسانی']];
      for (const [value, label] of nums) {
        const m = element('div', 'metric'); m.append(element('strong', '', String(value)), element('span', '', label));el('metrics').appendChild(m);
      }
      el('timeline').replaceChildren();
      for (const id of plan.workflows) el('timeline').appendChild(element('li', '', `${id} · ${byId.get(id).title}`));
      el('firstcard').textContent = lastCard;
      el('empty').hidden = true; el('output').hidden = false;
      feedback('نقشه آماده است. فایل‌ها فقط در مرورگر شما تولید می‌شوند.');
    } catch (error) { el('output').hidden = true;el('empty').hidden = false; el('error').textContent = error.message; el('error').hidden = false; }
  }
  function invalidate() { lastPlan=null; el('empty').hidden=false; el('output').hidden=true; el('error').hidden=true; }
  recipeSelect.addEventListener('change', () => {renderStages(); invalidate();});
  el('project').addEventListener('input', invalidate);
  document.querySelectorAll('input[name="mode"]').forEach(n => n.addEventListener('change', invalidate));
  el('stages').addEventListener('change', invalidate);
  el('generate').addEventListener('click', generate);
  el('download-json').addEventListener('click', () => {if (lastPlan)download('research-manifest.json', JSON.stringify(lastPlan,null,2)+'\n', 'application/json');});
  el('download-md').addEventListener('click', () => {if (lastPlan)download('research-workflow-plan.md', E.overview(lastPlan,catalog)+'\n','text/markdown');});
  el('download-job').addEventListener('click', () => {if (lastPlan)download('first-job-card.md',lastCard+'\n','text/markdown');});
  el('copy').addEventListener('click', async () => {
    if (!lastPlan) return;
    try { await navigator.clipboard.writeText(lastCard);feedback('دستور آغازین کپی شد.'); }
    catch {feedback('کپی خودکار در این مرورگر مجاز نیست؛ متن را از کادر بالا انتخاب و کپی کنید.');}
  });
  renderStages();
})();
