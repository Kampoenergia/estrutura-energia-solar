import { initIcons, initDialogs, api, brl, formatPhone, loadBrand } from './shared.js';
import { initAdvertising, hasAdConsent, advertisingConsent, trackConfirmedLead } from './ads.js';
initIcons(); initDialogs();
let brand = { whatsapp: '5547989022728' };
loadBrand().then(config => { brand = config; initAdvertising(config.advertising || {}); });
const form=document.getElementById('analysis-form'), bill=document.getElementById('conta'), range=document.getElementById('conta-range');
const error=document.getElementById('form-error'),button=document.getElementById('submit-analysis');
const labels={residencial:'Residência',comercial:'Comércio / empresa',industrial:'Indústria',rural:'Propriedade rural'};
const directions={residencial:'Para sua residência, a análise vai considerar o consumo da família e as condições do local de instalação.',comercial:'Para seu comércio, a análise vai considerar o perfil de consumo da operação e o espaço disponível.',industrial:'Para sua indústria, será importante avaliar a fatura completa, a demanda e as condições técnicas da instalação.',rural:'Para sua propriedade rural, a análise vai considerar o uso da energia, a localização e a estrutura disponível.'};
function paybackDescription(months){const total=Math.max(1,Math.round(months));const years=Math.floor(total/12),remaining=total%12;const parts=[];if(years)parts.push(years+' '+(years===1?'ano':'anos'));if(remaining)parts.push(remaining+' '+(remaining===1?'mês':'meses'));return parts.join(' e ');}
function tracking(){
 const params=new URLSearchParams(location.search),current={};
 for(const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term',...(hasAdConsent()?['fbclid','gclid','gbraid','wbraid']:[])])if(params.has(key))current[key]=params.get(key).slice(0,240);
 try{const ref=new URL(document.referrer);if(ref.origin!==location.origin)current.referrer=ref.origin;}catch{}
 if(!hasAdConsent())return current;
 try{if(Object.keys(current).length){sessionStorage.setItem('estrutura_tracking',JSON.stringify(current));return current;}return JSON.parse(sessionStorage.getItem('estrutura_tracking')||'{}');}catch{return current;}
}

bill.addEventListener('input',()=>{const v=Number(bill.value);if(Number.isFinite(v))range.value=Math.max(150,Math.min(20000,v));});
range.addEventListener('input',()=>{bill.value=range.value;});
document.getElementById('whatsapp').addEventListener('blur',e=>{if(e.target.value.trim())e.target.value=formatPhone(e.target.value);});
document.querySelectorAll('[data-open-privacy]').forEach(el=>el.addEventListener('click',()=>document.getElementById('privacy-dialog').showModal()));
form.addEventListener('submit',async event=>{
 event.preventDefault();if(button.disabled)return;
 if(!form.reportValidity())return;
 const values=new FormData(form),payload={nome:String(values.get('nome')||'').trim(),whatsapp:String(values.get('whatsapp')||'').trim(),cidade:String(values.get('cidade')||'').trim(),propertyType:values.get('propertyType'),conta:Number(values.get('conta')),consentimento:values.get('consentimento')==='on',company_website:values.get('company_website'),tracking:tracking(),advertisingConsent:advertisingConsent()};
 error.hidden=true;button.disabled=true;button.innerHTML='<span>Registrando sua solicitação…</span><span class="spinner" aria-hidden="true"></span>';
 try{
  const data=await api('/api/capture',{method:'POST',body:payload});
  if(!data.ok||!data.receipt)throw new Error('Não foi possível confirmar a solicitação. Tente novamente.');
  trackConfirmedLead(data.measurement?.eventId);
  const e=data.estimate;
  if(!e||['economyMonth','economyYear','financingInstallment','financingMonths','paybackMonths'].some(k=>typeof e[k]!=='number'||!Number.isFinite(e[k])||e[k]<0))throw new Error('A solicitação foi recebida, mas não foi possível carregar as estimativas. Tente novamente para visualizá-las.');
  document.getElementById('result-description').textContent=`${payload.nome.split(' ')[0]}, estes são valores estimados com base na conta informada. A proposta final depende da análise da sua fatura e do local de instalação.`;
  document.getElementById('result-installment').textContent=brl(e.financingInstallment);
  document.getElementById('result-finance-period').textContent=`Simulação em ${e.financingMonths} meses. Prazo e condições a confirmar.`;
  document.getElementById('result-economy').textContent=brl(e.economyMonth);
  document.getElementById('result-economy-year').textContent=brl(e.economyYear)+'/ano na simulação';
  document.getElementById('result-payback').textContent=Math.round(e.paybackMonths)+' meses';
  document.getElementById('result-payback-years').textContent='Cerca de '+paybackDescription(e.paybackMonths);
  for(const [id,value] of Object.entries({'summary-name':payload.nome,'summary-property':labels[payload.propertyType],'summary-city':payload.cidade,'summary-bill':brl(payload.conta)+'/mês · informada por você','summary-receipt':data.receipt}))document.getElementById(id).textContent=value;
  const message=`Olá, Estrutura Energia Solar! Preenchi a pré-análise no site e gostaria de conversar sobre meu projeto.\n\nNome: ${payload.nome}\nCidade: ${payload.cidade}\nImóvel: ${labels[payload.propertyType]}\nConta média informada por mim: ${brl(payload.conta)}/mês\nProtocolo: ${data.receipt}\n\nReferências do simulador:\nEconomia estimada: ${brl(e.economyMonth)}/mês (${brl(e.economyYear)}/ano).\nRetorno simples estimado: cerca de ${Math.round(e.paybackMonths)} meses, sem juros do financiamento nem outros custos.\nParcela estimada: a partir de ${brl(e.financingInstallment)}/mês, na simulação em ${e.financingMonths} meses.\nValores sujeitos à avaliação técnica, aprovação de crédito e condições da proposta.\n\nGostaria de enviar minha fatura e receber uma avaliação e uma proposta personalizada.`;
  document.getElementById('result-whatsapp').href=`https://wa.me/${brand.whatsapp||'5547989022728'}?text=${encodeURIComponent(message)}`;
  document.getElementById('form-area').hidden=true;const result=document.getElementById('result-area');result.hidden=false;result.focus({preventScroll:true});document.getElementById('analise').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
 }catch(e){error.textContent=e.message;error.hidden=false;}finally{button.disabled=false;button.innerHTML='<span>Ver minha simulação</span><span data-icon="arrow"></span>';initIcons(button);}
});
document.getElementById('new-analysis').addEventListener('click',()=>{document.getElementById('result-area').hidden=true;document.getElementById('form-area').hidden=false;error.hidden=true;form.reset();range.value=bill.value;document.getElementById('nome').focus();});
