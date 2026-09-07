const paths = {
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
 arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
 chevron:'<path d="m9 5 7 7-7 7"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 checkCircle:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
 chat:'<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6A8.4 8.4 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8v.5Z"/><path d="M8 11h8M8 14h5"/>',
 shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
 home:'<path d="m3 10 9-7 9 7v10H3V10Z"/><path d="M9 20v-7h6v7"/>',
 building:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M10 21v-6h4v6"/>',
 industry:'<path d="M3 21V10l6 3V8l6 4V3h4l2 18H3Z"/><path d="M7 17h1m4 0h1m4 0h1"/>',
 leaf:'<path d="M20 3s2 10-3 15c-3 3-8 3-11 0S3 10 6 7c5-5 14-4 14-4Z"/><path d="M3 21 15 9"/>',
 pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
 file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 users:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m3 10v-3a6 6 0 0 0-3-5"/>',
 search:'<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
 settings:'<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m9 3 1-1h4l1 3 3 1 3 2v4l-3 2-1 3-2 4h-4l-2-3-3-1-4-2v-4l3-2 1-3 3-1Z"/>',
 logout:'<path d="M9 21H4V3h5M9 12h12m-5-5 5 5-5 5"/>',
 external:'<path d="M15 3h6v6m0-6L10 14M10 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
 refresh:'<path d="M20 7v5h-5M4 17v-5h5M5 7a8 8 0 0 1 14-2l1 7M4 12l1 7a8 8 0 0 0 14-2"/>',
 flame:'<path d="M12 2c2 6 6 7 6 12a6 6 0 0 1-12 0c0-4 3-5 3-9 3 3 1 5 3 5 1-2 1-5 0-8Z"/>',
 trophy:'<path d="M8 3h8v7a4 4 0 0 1-8 0V3ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 14v6m-5 1h10"/>',
 copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
 trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
 phone:'<path d="m6 3 4 5-3 3a15 15 0 0 0 6 6l3-3 5 4c0 3-3 4-5 3C8 19 5 16 3 8 2 5 3 3 6 3Z"/>',
 eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',
 solar:'<path d="m6 3-4 14h20L18 3H6Zm6 0v14M4 10h16M12 17v4m-5 0h10"/>'
};
export const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const icon = name => `<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.sun}</svg>`;
export function initIcons(root=document) { root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML=icon(el.dataset.icon); }); }
export function brl(v) { return Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:2}); }
export function date(v, withTime=false) { if(!v)return '—';const d = new Date(v.length===10?v+'T12:00:00':v);if(!Number.isFinite(d.getTime()))return '—';return d.toLocaleString('pt-BR',{dateStyle:'short',...(withTime?{timeStyle:'short'}:{})}); }
export function phoneDigits(v) { let d=String(v||'').replace(/\D/g,'');if((d.length===12||d.length===13)&&d.startsWith('55'))d=d.slice(2);if(d.startsWith('0'))d=d.slice(1);return d; }
export function formatPhone(v) { const d=phoneDigits(v);return d.length===11?`(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`:d.length===10?`(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`:v||'Sem telefone'; }
export async function api(url,{method='GET',body,timeout=30000,auth=false}={}) {
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try {
  const r=await fetch(url,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:controller.signal,credentials:'same-origin'});
  let data;try{data=await r.json();}catch{throw new Error('Resposta inesperada do servidor. Tente recarregar a página.');}
  if(!r.ok){if(r.status===401&&auth)window.location.assign('/login?expired=1');const e=new Error(data.error||'Não foi possível concluir a solicitação.');e.status=r.status;throw e;}
  return data;
 }catch(e){if(e.name==='AbortError')throw new Error('A consulta demorou mais que o esperado. Tente novamente.');if(e instanceof TypeError)throw new Error('Não foi possível conectar. Confira sua conexão e tente novamente.');throw e;}finally{clearTimeout(timer);}
}
let toastTimer;
export function toast(message,error=false) {
 let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';t.setAttribute('role','status');document.body.append(t);}
 const host=document.querySelector('dialog[open]')||document.body;if(t.parentElement!==host)host.append(t);
 t.className='toast show'+(error?' error-toast':'');t.textContent=message;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),4500);
}
export async function loadBrand() {
 try {
  const config=await api('/api/site-config');
  if(config.assets?.wordmark)document.querySelectorAll('[data-brand]').forEach(el=>{const img=new Image();img.alt=config.name;img.className='brand-original';img.onload=()=>{el.replaceChildren(img);};img.src=config.assets.wordmark;});
  if(config.assets?.logo){const favicon=document.querySelector('link[rel="icon"]');if(favicon)favicon.href=config.assets.logo;}
  if(config.assets?.hero)document.querySelectorAll('[data-hero-image]').forEach(el=>{el.style.backgroundImage=`linear-gradient(90deg,rgba(4,32,66,.92),rgba(4,32,66,.65)),url("${config.assets.hero}")`;});
  return config;
 }catch{return {name:'Estrutura Energia Solar',whatsapp:'5547989022728'};}
}
export function initDialogs() {
 document.querySelectorAll('[data-close-dialog]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
 document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
}
