import './style.css';

// EarnResearch is intentionally client-side: provider calls go directly from this browser.
const SYSTEM_PROMPT = `You are an ethical money-making opportunities researcher. Your role is to suggest ONLY legitimate, legal, and ethical ways for people to earn money. Focus on real, actionable opportunities that a person with minimal resources can start today and a realistic first-dollar target. Be honest about uncertainty, difficulty, taxes, fees, competition, and hidden costs; never inflate earnings. Prefer well-known, verifiable platforms and say when legitimacy needs checking. Never suggest illegal activities (fraud, scams, hacking, drug sales, evasion), harmful or exploitative methods, deception, spam, pyramid schemes or MLM recruitment, gambling or betting strategies, cryptocurrency trading advice, get-rich-quick schemes, activities violating platform Terms of Service, or tax evasion. Only suggest methods that are legal in most jurisdictions. Return ONLY valid JSON with this shape: {"ideas":[{"title":"","category":"","description":"","effort":"Low|Medium|High","timeToFirstDollar":"","earnings":"","steps":[""],"tools":[""],"risk":"Low|Medium|High","legitimacy":"","budget":0,"quickWin":true}]} Do not make guarantees. If a request is unsafe, refuse it and offer a safe alternative.`;

// Prefer the most stable free-tier Gemini Flash models and keep fallback rotation
// limited to known Google free models. This avoids stale names and reduces
// rate-limit failures caused by model overload.
const FREE_GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.5-flash'
];

const models = {
  gemini: FREE_GEMINI_MODELS,
  openai: ['gpt-4o-mini', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-haiku-latest', 'claude-3-haiku-20240307']
};

const $ = (s) => document.querySelector(s); const $$ = (s) => [...document.querySelectorAll(s)];
let state = {ideas:[], saved:JSON.parse(localStorage.getItem('er_saved')||'[]'), earnings:JSON.parse(localStorage.getItem('er_earnings')||'[]'), category:'All', theme:localStorage.getItem('er_theme')||'light'};
const save = () => {localStorage.setItem('er_saved',JSON.stringify(state.saved));localStorage.setItem('er_earnings',JSON.stringify(state.earnings));};
const toast = (msg) => {const el=$('#toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3000)};
const show = (id,on=true) => {$(id).hidden=!on};
function setStatus(msg,error=false){const e=$('#status');e.hidden=!msg;e.textContent=msg;e.className='status'+(error?' error':'')}
function getProfile(){return {skills:$('#skills').value.trim(),time:$('#time').value,equipment:$('#equipment').value.trim(),region:$('#region').value.trim(),budget:$('#budget').value,quickWin:$('#quickWin').checked,zeroBudget:$('#zeroBudget').checked};}
function renderIdeas(){const grid=$('#ideaGrid');let list=state.ideas.filter(x=>state.category==='All'||x.category===state.category|| (state.category==='Quick wins'&&x.quickWin));if(!list.length){grid.innerHTML='<div class="empty-state">No ideas match yet. Try a broader prompt or generate again.</div>';return;} grid.innerHTML=list.map((x,i)=>`<article class="idea-card">${x.quickWin?'<span class="badge">Quick win</span>':''}<h3>${esc(x.title)}</h3><p>${esc(x.description)}</p><div class="idea-meta"><span>${esc(x.category||'General')}</span><span>${esc(x.effort)}</span><span>${esc(x.timeToFirstDollar)}</span></div><div class="idea-actions"><button data-detail="${i}">Details</button><button class="secondary" data-save="${i}">${state.saved.some(s=>s.title===x.title)?'Saved':'Save'}</button></div></article>`).join(''); $$('[data-detail]').forEach(btn=>btn.onclick=()=>openDetail(list[Number(btn.dataset.detail)])); $$('[data-save]').forEach(btn=>btn.onclick=()=>toggleSave(list[Number(btn.dataset.save)]));}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toggleSave(idea){const i=state.saved.findIndex(x=>x.title===idea.title);if(i>=0){state.saved.splice(i,1);toast('Removed from saved ideas')}else{state.saved.push({...idea,status:'Not started'});toast('Saved idea');} save(); renderSaved(); updateProgress();}
function openDetail(x){$('#detailContent').innerHTML=`<span class="eyebrow">${esc(x.category||'OPPORTUNITY')}</span><h2>${esc(x.title)}</h2><p>${esc(x.description)}</p><div class="idea-meta"><span>${esc(x.effort)}</span><span>${esc(x.timeToFirstDollar)}</span><span>${esc(x.earnings)}</span></div><h3>Steps</h3><ol>${(x.steps||[]).map(s=>`<li>${esc(s)}</li>`).join('')}</ol><h3>Tools</h3><ul>${(x.tools||[]).map(t=>`<li>${esc(t)}</li>`).join('')}</ul><div class="detail-actions"><button class="secondary" data-followup="Explain this like I’m a beginner">Explain this like I’m a beginner</button><button class="secondary" data-followup="Give me a 7-day plan">Give me a 7-day plan</button></div>`; $$('[data-followup]').forEach(btn=>btn.onclick=()=>followup(x,btn.dataset.followup)); show('#detailModal');}
async function followup(idea,question){const answer=await callLLM(`Idea: ${JSON.stringify(idea)}\nUser request: ${question}\nReturn concise markdown.`);if(answer){$('#detailContent').insertAdjacentHTML('beforeend',`<div class="followup"><h3>Follow-up</h3>${answer}</div>`);}}
function sanitizeGeminiModel(model){
  if (!model) return FREE_GEMINI_MODELS[0];
  const normalized = String(model).trim();
  if (FREE_GEMINI_MODELS.includes(normalized)) return normalized;
  return FREE_GEMINI_MODELS[0];
}
function isRetryableGeminiError(status,message=''){return [408,429,500,502,503,504].includes(status)||/high demand|overload|temporar|rate limit|quota|unavailable|capacity|busy|no longer available|not available/i.test(message);}
async function callGemini(user,key,preferredModel){
  const startModel = sanitizeGeminiModel(preferredModel);
  const candidates = [startModel, ...FREE_GEMINI_MODELS.filter(model => model !== startModel)];
  let lastError = null;

  for (let i = 0; i < candidates.length; i++) {
    const model = sanitizeGeminiModel(candidates[i]);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
      const res = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{role:'user',parts:[{text:user}]}],systemInstruction:{parts:[{text:SYSTEM_PROMPT}]},generationConfig:{temperature:0.3,maxOutputTokens:2000}})});
      const data = await res.json();
      if (res.ok) {
        const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
        if (text.trim()) {
          if (model !== startModel) {
            localStorage.setItem('er_model', model);
            const modelPicker = $('#model');
            if (modelPicker) modelPicker.value = model;
            setStatus(`Gemini ${startModel} is unavailable; using ${model} instead.`);
          }
          return text.trim();
        }
      }

      const message = data.error?.message || `Gemini request failed (${res.status})`;
      lastError = new Error(message);
      if (!isRetryableGeminiError(res.status, message) || i === candidates.length - 1) {
        throw lastError;
      }
    } catch (error) {
      lastError = error;
      if (!isRetryableGeminiError(error.status, error.message) || i === candidates.length - 1) {
        throw error;
      }
    }
  }

  throw lastError || new Error('All free Gemini models are currently unavailable.');
}
async function callLLM(user){const provider=localStorage.getItem('er_provider');const key=await decryptKey();if(!provider||!key){show('#settingsModal');setStatus('Connect an LLM provider in Settings first.',true);return null;} const model=sanitizeGeminiModel(localStorage.getItem('er_model') || models[provider][0]);try {if(provider==='gemini')return await callGemini(user,key,model);const body=provider==='openai'?{model,temperature:0.3,messages:[{role:'system',content:SYSTEM_PROMPT},{role:'user',content:user}]}:{model,max_tokens:2000,system:SYSTEM_PROMPT,messages:[{role:'user',content:user}]};const url=provider==='openai'?'https://api.openai.com/v1/chat/completions':'https://api.anthropic.com/v1/messages';const headers=provider==='openai'?{'Content-Type':'application/json','Authorization':`Bearer ${key}`}:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'};const res=await fetch(url,{method:'POST',headers,body:JSON.stringify(body)});const data=await res.json();if(!res.ok)throw new Error(data.error?.message||'LLM request failed');return provider==='openai'?data.choices?.[0]?.message?.content?.trim()||'':data.content?.map(c=>c.text).join('')||'';}catch(e){setStatus(e.message||'LLM request failed.',true);console.error(e);return null;}}
async function generate(prompt=''){setStatus('Researching carefully…');$('#ideaGrid').innerHTML='<div class="skeleton"></div><div class="skeleton"></div>';const p=getProfile();const raw=await callLLM(`${prompt||$('#query').value||'Find realistic ways to earn money'}\nProfile:\n${JSON.stringify(p)}`); if(!raw) return; try { const cleaned = raw.replace(/^```json\s*|```\s*$/g,'').trim(); const parsed = JSON.parse(cleaned); state.ideas = Array.isArray(parsed.ideas) ? parsed.ideas : []; renderIdeas(); setStatus('Ideas generated.'); } catch (e) { setStatus('LLM returned invalid JSON. Try again.', true); console.error(e); }}
async function decryptKey(){const packed=localStorage.getItem('er_key');const pass=$('#vaultPass')?.value||sessionStorage.getItem('er_pass');if(!packed||!pass)return null;try{const [iv,salt,data]=packed.split(':');const enc=new TextEncoder();const keyMaterial=await crypto.subtle.importKey('raw',enc.encode(pass), 'PBKDF2', false,['deriveKey']);const key=await crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:Uint8Array.from(atob(salt),c=>c.charCodeAt(0)),iterations:100000},keyMaterial,{name:'AES-GCM',length:256},false,['decrypt']);const ivBytes=Uint8Array.from(atob(iv),c=>c.charCodeAt(0));const dataBytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:ivBytes},key,dataBytes);return new TextDecoder().decode(plain);}catch{return null;}}
async function encryptKey(key,pass){const enc=new TextEncoder();const iv=crypto.getRandomValues(new Uint8Array(12));const salt=crypto.getRandomValues(new Uint8Array(16));const keyMaterial=await crypto.subtle.importKey('raw',enc.encode(pass), 'PBKDF2', false,['deriveKey']);const keyDerived=await crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:100000},keyMaterial,{name:'AES-GCM',length:256},false,['encrypt']);const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},keyDerived,enc.encode(key));return `${btoa(String.fromCharCode(...Array.from(new Uint8Array(iv))))}:${btoa(String.fromCharCode(...Array.from(salt)))}:${btoa(String.fromCharCode(...new Uint8Array(cipher)))}`;}
function renderSaved(){const list=$('#savedList');list.innerHTML = state.saved.length ? state.saved.map((x,i)=>`<div class="saved-item"><div><strong>${esc(x.title)}</strong><small>${esc(x.status||'Not started')}</small></div><button data-remove="${i}">Remove</button></div>`).join('') : '<div class="empty-state small">No saved ideas yet.</div>'; $$('[data-remove]').forEach(btn=>btn.onclick=()=>{state.saved.splice(Number(btn.dataset.remove),1);save();renderSaved();updateProgress();toast('Removed from saved ideas');}); }
function updateProgress(){const done=state.saved.filter(x=>x.status==='Done').length;$('#progressCount').textContent=done;$('#pursuingCount').textContent=`${state.saved.length} idea${state.saved.length===1?'':'s'}`;}
function renderEarnings(){$('#earningsList').innerHTML=state.earnings.length?state.earnings.map(x=>`<p>+ <strong>$${esc(x.amount)}</strong> · ${esc(x.note)} <span class="muted">${esc(x.date)}</span></p>`).join(''):'<div class="empty-state small">No earnings logged yet.</div>'}
function updateModels(){
  const p=$('#provider').value;
  const saved = sanitizeGeminiModel(localStorage.getItem('er_model'));
  $('#model').innerHTML=models[p].map(x=>`<option>${x}</option>`).join('');
  if (models[p].includes(saved)) $('#model').value = saved;
  else if (p === 'gemini') $('#model').value = FREE_GEMINI_MODELS[0];
}
$$('[data-close]').forEach(b=>b.onclick=()=>b.closest('.modal-backdrop').hidden=true);$('#settingsBtn').onclick=$('#settingsInline').onclick=()=>show('#settingsModal');$('#themeBtn').onclick=()=>{state.theme=state.theme==='light'?'dark':'light';document.body.dataset.theme=state.theme;localStorage.setItem('er_theme',state.theme);};$('#generateBtn').onclick=()=>generate();$('#query').addEventListener('keydown',e=>{if(e.key==='Enter')generate();});$('#saveSettings').onclick=async()=>{const provider=$('#provider').value;const model=$('#model').value;const key=$('#apiKey').value.trim();const pass=$('#vaultPass').value.trim();if(!provider||!key||!pass){setStatus('Choose a provider, add a key, and set a vault passphrase.',true);return;}if(pass.length<8){setStatus('Vault passphrase must be at least 8 characters.',true);return;}localStorage.setItem('er_provider',provider);localStorage.setItem('er_model', sanitizeGeminiModel(model));sessionStorage.setItem('er_pass',pass);try{localStorage.setItem('er_key',await encryptKey(key,pass));setStatus('Connection saved. Testing…');const ping=await callLLM('Reply with OK if the model is connected.');if(ping){setStatus('Connection successful.');toast('Saved successfully')}else setStatus('Connection test failed. Check the key/model.',true);}catch(e){setStatus('Failed to save or test the API connection.',true);console.error(e);}};$('#clearDataBtn').onclick=()=>{localStorage.clear();sessionStorage.clear();state.saved=[];state.earnings=[];renderSaved();renderEarnings();toast('Local data cleared');};$('#provider').onchange=updateModels;$('#budget').value='0';renderSaved();renderEarnings();updateProgress();updateModels();
