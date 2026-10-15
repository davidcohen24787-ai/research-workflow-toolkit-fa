/* Research Chat Starter: client-side only, no API requests. MIT. */
(function(root, factory){
  const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ResearchChatStarter=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const RECIPE_IDS=['conceptual','systematic-review','quantitative-study','qualitative-study','computational-design'];
function startPrompt(topic,method){
  const title=String(topic||'').trim();if(!title||title.length>200)throw Error('موضوع پژوهش باید بین ۱ تا ۲۰۰ نویسه باشد.');
  if(!RECIPE_IDS.includes(method.recipe_id))throw Error('نوع پژوهش شناخته نشده است.');
  return `پژوهش جدید: «${title}»\nنوع مطالعه: ${method.title}\nمراحل پیشنهادی اولیه: ${method.workflows.join(' → ')}\nهدف: با امکانات چت حاضر و بدون API پولی، طرح علمی متناسب ارائه کن.\nابتدا پرسش و دامنه را روشن و منابع واقعاً در دسترس را مشخص کن؛ فقط مأموریت اول را شروع کن.\nبرای هر خروجی، وضعیت واقعی، شاهد قابل‌بررسی، محدودیت و مرحله بعد را بگو. اگر دسترسی به مقاله/فایل/ابزار نداری، صریحاً اعلام کن.\nهر تصمیم علمی حساس، تغییر مخرب یا انتشار نیازمند تأیید صریح پژوهشگر است.`;
}
function output(data,platform,recipeId,topic){
  if(!['chatgpt','gemini'].includes(platform))throw Error('محیط نامعتبر است.');
  const method=data.recipes.find(r=>r.recipe_id===recipeId);if(!method)throw Error('مسیر پژوهشی ناشناخته است.');
  if(!Array.isArray(method.workflows)||!method.workflows.length)throw Error('مسیر پژوهش خالی است.');
  const platformText=platform==='chatgpt'?data.platforms.chatgpt:data.platforms.gemini;
  return {instructions:platformText,start:startPrompt(topic,method),reference:data.reference,protocol:data.protocol,transfer:data.transfer,platform,recipeId};
}
return {output,startPrompt};
});

if (typeof document!=='undefined') (function(){
'use strict';
const by=id=>document.getElementById(id);
const data=JSON.parse(by('chat-kit-data').textContent);
const engine=window.ResearchChatStarter;
const recipes=by('chat-recipe');for(const r of data.recipes){const op=document.createElement('option');op.value=r.recipe_id;op.textContent=r.title;recipes.appendChild(op);}
let result=null;
const names={instructions:'chat-instructions',start:'chat-start'};
function download(name,text){const b=new Blob([text],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function redraw(){by('chat-result').hidden=true;by('chat-empty').hidden=false;by('chat-error').hidden=true;result=null;}
for(const id of ['chat-platform','chat-recipe','chat-topic'])by(id).addEventListener(id==='chat-topic'?'input':'change',redraw);
by('chat-generate').addEventListener('click',()=>{
try{
 result=engine.output(data,by('chat-platform').value,by('chat-recipe').value,by('chat-topic').value);
 for(const [k,id] of Object.entries(names))by(id).textContent=result[k];
 by('chat-mode-label').textContent=result.platform==='chatgpt'?'ChatGPT Project':'Gemini Chat';
 by('chat-instruction-heading').textContent=result.platform==='chatgpt'?'دستورالعمل Project':'پیام نخست Gemini';
 by('chat-usage').textContent=result.platform==='chatgpt'?'متن زیر را در Project instructions قرار دهید؛ فایل‌های مرجع را به همان Project اضافه کنید.':'متن زیر را در یک چت جدید Gemini ارسال کنید و دو فایل مرجع را به چت ضمیمه کنید.';
 by('chat-empty').hidden=true;by('chat-result').hidden=false;by('chat-error').hidden=true;
 by('chat-feedback').textContent='دستورها ساخته شدند. هیچ اتصال یا ذخیره‌سازی خودکاری انجام نشده است.';
}catch(e){redraw();by('chat-error').textContent=e.message;by('chat-error').hidden=false;}
});
document.querySelectorAll('[data-copy]').forEach(el=>el.addEventListener('click',async()=>{
 if(!result)return;try{await navigator.clipboard.writeText(result[el.dataset.copy]);by('chat-feedback').textContent='متن کپی شد.';}catch{by('chat-feedback').textContent='کپی خودکار مجاز نیست؛ متن را انتخاب و کپی کنید.';}
}));
document.querySelectorAll('[data-save]').forEach(el=>el.addEventListener('click',()=>{
 if(!result)return;const k=el.dataset.save;download(`research-chat-${k}.txt`,result[k]);
}));
})();
