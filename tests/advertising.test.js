const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { advertisingConfig, advertisingCsp } = require('../lib/ads');
const PIXEL = '1425129716157804';
const ADS = 'AW-17289607771';
const LABEL = 'SJlgCKvclvAcENv0qbRA';
const EVENT = 'lead_00000000-1111-4222-8333-444444444444';

function browserHarness() {
  const nodes = [], listeners = {}, store = new Map(); let reloads = 0;
  const element = tag => {
    const el = { tagName: tag.toUpperCase(), children: [], dataset: {}, handlers: {}, removed: false,
      setAttribute(k,v) { this[k] = v; },
      addEventListener(k,fn) { this.handlers[k] = fn; },
      appendChild(child) { this.children.push(child); return child; },
      append(...children) { this.children.push(...children); },
      remove() { this.removed = true; },
      showModal() { this.open = true; }
    }; nodes.push(el); return el;
  };
  const prefs = element('button');
  const doc = { head: element('head'), body: element('body'), cookie: '', createElement: element,
    getElementById(id) { return nodes.find(n => n.id === id && !n.removed) || null; },
    querySelectorAll(selector) { return selector === '[data-ad-preferences]' ? [prefs] : []; },
    querySelector(selector) { const name = selector.match(/data-estrutura-ad="([^"]+)"/)?.[1]; return nodes.find(n => name && n.dataset.estruturaAd === name) || null; },
    addEventListener(name,fn) { listeners[name] = fn; }
  };
  const storage = { getItem: key => store.get(key) || null, setItem: (key,value) => store.set(key,value), removeItem: key => store.delete(key) };
  const win = {};
  const context = vm.createContext({ window:win, document:doc, localStorage:storage, sessionStorage:storage, location:{hostname:'solar.example',protocol:'https:',reload:()=>reloads++}, crypto:{randomUUID:crypto.randomUUID}, URL, console });
  const source = fs.readFileSync(path.join(__dirname,'../public/assets/ads.js'),'utf8').replace(/\bexport\s+/g,'');
  vm.runInContext(source + '\nglobalThis.tracker = { initAdvertising, trackConfirmedLead, hasAdConsent, advertisingConsent };', context);
  return { tracker:context.tracker, win, doc, nodes, store, prefs,
    click(text) { const b = [...nodes].reverse().find(n=>n.tagName==='BUTTON' && n.textContent===text); assert.ok(b,'Botão: '+text); b.handlers.click({}); },
    whatsApp() { listeners.click({target:{closest:()=>({id:'result-whatsapp',href:'https://wa.me/5547989022728?text=PII_NAO_ENVIAR_123'})}}); },
    scripts:()=>doc.head.children.filter(n=>n.tagName==='SCRIPT'),
    reloads:()=>reloads,
    metaCalls:()=>Array.from(win.fbq?.queue||[], args=>Array.from(args)),
    googleCalls:()=>Array.from(win.dataLayer||[], args=>Array.from(args))
  };
}
function liveConfig() { return advertisingConfig({env:{ADS_TRACKING_ENABLED:'true'},production:true,preview:false}); }

test('Identificadores reais preservados e ativação desligada por padrão',()=>{
  const config=advertisingConfig({env:{},production:true});
  assert.equal(config.metaPixelId,PIXEL);assert.equal(config.googleAdsId,ADS);assert.equal(config.googleLeadLabel,LABEL);
  assert.equal(config.googleReady,true);assert.equal(config.enabled,false);assert.equal(config.googleWhatsAppLabel,'');
  assert.equal(liveConfig().enabled,true);
  assert.equal(advertisingConfig({env:{ADS_TRACKING_ENABLED:'true'},production:true,preview:true}).enabled,false);
  assert.equal(advertisingConfig({env:{ADS_TRACKING_ENABLED:'true'},production:false}).enabled,false);
  assert.equal(advertisingConfig({env:{GOOGLE_ADS_ID:'17289607771',GOOGLE_ADS_LEAD_LABEL:LABEL}}).googleAdsId,ADS);
});
test('CSP libera somente provedores necessários e somente na landing ativa',()=>{
  const config=liveConfig(), sources=advertisingCsp(config,true);
  assert.ok(sources.scripts.includes('https://connect.facebook.net'));
  assert.ok(sources.scripts.includes('https://www.googletagmanager.com'));
  assert.equal(advertisingCsp(config,false).scripts.length,0);
  assert.equal(advertisingCsp(advertisingConfig({env:{},production:true}),true).scripts.length,0);
});
test('Sem consentimento ou após recusa: nenhuma biblioteca e nenhuma conversão',()=>{
  const b=browserHarness();b.tracker.initAdvertising(liveConfig());b.tracker.trackConfirmedLead(EVENT);
  assert.equal(b.scripts().length,0);assert.equal(b.metaCalls().length,0);assert.equal(b.googleCalls().length,0);
  b.click('Recusar medição');b.tracker.trackConfirmedLead(EVENT);
  assert.equal(b.scripts().length,0);assert.equal(b.tracker.hasAdConsent(),false);
});
test('Com permissão: configuração, destino exato e deduplicação do mesmo lead',()=>{
  const b=browserHarness();b.tracker.initAdvertising(liveConfig());b.click('Permitir medição');
  assert.equal(b.scripts().length,2);
  const consent=b.googleCalls().filter(c=>c[0]==='consent');
  assert.equal(consent[0][1],'default');assert.equal(consent[0][2].ad_storage,'denied');
  assert.equal(consent[1][1],'update');assert.equal(consent[1][2].ad_storage,'granted');
  assert.equal(consent[1][2].ad_personalization,'denied');
  assert.equal(b.metaCalls().filter(c=>c[0]==='trackSingle'&&c[2]==='PageView').length,1);
  b.tracker.trackConfirmedLead(EVENT);b.tracker.trackConfirmedLead(EVENT);
  const meta=b.metaCalls().filter(c=>c[0]==='trackSingle'&&c[2]==='Lead');
  assert.equal(meta.length,1);assert.equal(meta[0][1],PIXEL);assert.equal(meta[0][4].eventID,EVENT);
  const google=b.googleCalls().filter(c=>c[0]==='event'&&c[1]==='conversion');
  assert.equal(google.length,1);assert.equal(google[0][2].send_to,ADS+'/'+LABEL);assert.equal(google[0][2].transaction_id,EVENT);
  assert.equal(Object.hasOwn(google[0][2],'value'),false);assert.equal(Object.hasOwn(google[0][2],'user_data'),false);
});
test('WhatsApp é separado: não duplica a conversão principal e não envia o URL pessoal',()=>{
  const b=browserHarness();b.tracker.initAdvertising(liveConfig());b.click('Permitir medição');b.tracker.trackConfirmedLead(EVENT);b.whatsApp();
  assert.equal(b.metaCalls().filter(c=>c[0]==='trackSingleCustom'&&c[2]==='WhatsAppClick').length,1);
  assert.equal(b.googleCalls().filter(c=>c[0]==='event'&&c[1]==='conversion').length,1);
  assert.ok(!JSON.stringify([...b.metaCalls(),...b.googleCalls()]).includes('PII_NAO_ENVIAR'));
});
test('Revogação impede novos eventos e pede recarga para encerrar bibliotecas',()=>{
  const b=browserHarness();b.tracker.initAdvertising(liveConfig());b.click('Permitir medição');b.prefs.handlers.click();b.click('Recusar medição');
  const before=b.googleCalls().filter(c=>c[0]==='event').length;b.tracker.trackConfirmedLead(EVENT);
  assert.equal(b.googleCalls().filter(c=>c[0]==='event').length,before);assert.equal(b.tracker.hasAdConsent(),false);assert.equal(b.reloads(),1);
});
test('Na prévia, nem permitir carregamento acidental com IDs configurados',()=>{
  const b=browserHarness();b.tracker.initAdvertising(advertisingConfig({env:{ADS_TRACKING_ENABLED:'true'},production:true,preview:true}));
  assert.equal(b.scripts().length,0);b.tracker.trackConfirmedLead(EVENT);assert.equal(b.googleCalls().length,0);
});
