// PK Trénink – logbook app (PWA). Data stay in this phone (localStorage).
'use strict';
const KEY = 'pk-trenink-v1';
const PAUSE = {hack:150,legpress:120,dbpress:120,bench:150,rdl:120,incline:90,bulgarian:90,row:90,pulldown:90,landmine:90,
  legext:75,curlseat:75,lyingcurl:75,lateral:60,cablelat:60,frontcable:60,reardb:60,facepull:60,hammer:60,pushdown:60,
  fly:60,revfly:60,calf:60,abduct:60,extrot:45,captain:60,machcrunch:60,benchcrunch:60,pallof:45,sideplank:45,
  iso:60,ecc:60,pron:60,stretch:30};
const PLACES = ['Pravé rameno','Levé rameno','Pravý loket','Levý loket','Pravá kyčel','Levá kyčel','Pravé koleno','Levé koleno',
  'Bedra / záda','Krk','Zápěstí','Hrudník','Sval (natažení)','Jiné'];
const TYPES = ['Bolest při pohybu','Bolest po tréninku','Píchnutí','Lupnutí / prasknutí','Otok nebo modřina','Brnění nebo necitlivost','Ztráta síly','Ztuhlost','Jiné'];
const RED_TYPES = ['Lupnutí / prasknutí','Otok nebo modřina','Brnění nebo necitlivost','Ztráta síly'];

// ---------- storage ----------
function blank(){return {sessions:[],measures:[],issues:[],drafts:{},day:'den-1'};}
function load(){
  try{const s=JSON.parse(localStorage.getItem(KEY)); if(s&&s.sessions) return Object.assign(blank(),s);}catch(e){}
  return blank();
}
let ST = load();
function save(){try{localStorage.setItem(KEY,JSON.stringify(ST));}catch(e){toast('Uložení se nepodařilo – udělejte zálohu v Exportu');}}

// ---------- utils ----------
const $ = s=>document.querySelector(s);
const esc = s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function fmtDate(iso){const [y,m,d]=iso.split('-');return `${+d}. ${+m}. ${y}`;}
function shortDate(iso){const [,m,d]=iso.split('-');return `${+d}. ${+m}.`;}
function num(v){if(v===''||v==null)return null;const n=parseFloat(String(v).replace(',','.'));return isNaN(n)?null:n;}
function fmtNum(n){return n==null?'':String(n).replace('.',',');}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function dayById(id){return DAYS.find(d=>d.id===id)||DAYS[0];}
function setsInfo(dose){
  const timed=/min|\d\s*s(\s|$)/.test(dose);
  const m=dose.match(/^(\d+)\s*×/); const n=m?+m[1]:1;
  return {n, timed, unit: /min/.test(dose)?'min':'s'};
}
let toastT;
function toast(msg){const t=$('#toast');t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,2400);}

// last logged sets for an exercise (excluding today's draft)
function lastFor(key){
  for(let i=ST.sessions.length-1;i>=0;i--){
    const s=ST.sessions[i], e=s.entries[key];
    if(e&&e.some(x=>x.kg!=null||x.reps!=null||x.t!=null)) return {date:s.date,sets:e};
  }
  return null;
}
function setsText(sets,timed,unit){
  return sets.filter(x=>x.kg!=null||x.reps!=null||x.t!=null).map(x=>{
    if(timed) return fmtNum(x.t)+' '+unit;
    if(x.kg!=null&&x.reps!=null) return fmtNum(x.kg)+'×'+x.reps;
    if(x.reps!=null) return x.reps+' opak.';
    return fmtNum(x.kg)+' kg';
  }).join(', ');
}

// ---------- router ----------
const VIEWS={trenink:renderTrain,mereni:renderMeasure,potize:renderIssues,export:renderExport};
function route(){
  let v=(location.hash||'#trenink').slice(1); if(!VIEWS[v]) v='trenink';
  document.querySelectorAll('nav.tabbar a').forEach(a=>a.dataset.v===v?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
  VIEWS[v](); window.scrollTo(0,0); badge();
}
window.addEventListener('hashchange',route);
function badge(){const n=ST.issues.filter(i=>!i.resolved).length;const b=$('#badge');b.hidden=!n;b.textContent=n;}

// ---------- TRAINING ----------
function draft(dayId){
  if(!ST.drafts[dayId]){
    const day=dayById(dayId), entries={};
    day.x.forEach(([k,dose])=>{const {n}=setsInfo(dose);entries[k]=Array.from({length:n},()=>({kg:null,reps:null,t:null,done:false}));});
    ST.drafts[dayId]={entries,note:'',started:today()};
  }
  return ST.drafts[dayId];
}
function renderTrain(){
  const day=dayById(ST.day), dr=draft(ST.day);
  let h=`<h1>Trénink</h1><div class="chips" role="group" aria-label="Den">`;
  DAYS.forEach((d,i)=>h+=`<button class="chip" data-day="${d.id}" aria-pressed="${d.id===ST.day}">${i<7?`<b>${i+1}</b>`:''}${esc(d.tab)}</button>`);
  h+=`</div><h2 style="margin-top:6px">${esc(day.t)}</h2><p class="lead">${esc(day.d)}</p>`;
  day.x.forEach(([k,dose],j)=>{
    const ex=EX[k], si=setsInfo(dose), last=lastFor(k), sets=dr.entries[k]||(dr.entries[k]=[{kg:null,reps:null,t:null,done:false}]);
    const ph=last?last.sets:[];
    h+=`<section class="card" data-ex="${k}"><div class="exhead"><h3><span>${j+1}.</span>${esc(ex.n)}</h3><div class="dose">${esc(dose)}</div></div>`;
    h+=`<div class="last">${last?`Minule (${shortDate(last.date)}): ${esc(setsText(last.sets,si.timed,si.unit))}`:'Zatím bez záznamu'}</div><div class="sets">`;
    sets.forEach((s,i)=>{
      const p=ph[i]||ph[ph.length-1]||{};
      if(si.timed){
        h+=`<div class="set time"><div class="n">${i+1}</div><div class="fld"><input inputmode="decimal" aria-label="STérie ${i+1}: ${si.unit==='min'?'minuty':'sekundy'}" data-i="${i}" data-f="t" value="${s.t==null?'':fmtNum(s.t)}" placeholder="${p.t!=null?fmtNum(p.t):''}"><span>${si.unit}</span></div>
          <button class="done" data-i="${i}" aria-pressed="${!!s.done}" aria-label="STérie ${i+1} hotová">✓</button></div>`;
      }else{
        h+=`<div class="set"><div class="n">${i+1}</div>
          <div class="fld"><input inputmode="decimal" aria-label="STérie ${i+1}: kg" data-i="${i}" data-f="kg" value="${s.kg==null?'':fmtNum(s.kg)}" placeholder="${p.kg!=null?fmtNum(p.kg):''}"><span>kg</span></div>
          <div class="fld"><input inputmode="numeric" aria-label="STérie ${i+1}: opakování" data-i="${i}" data-f="reps" value="${s.reps==null?'':s.reps}" placeholder="${p.reps!=null?p.reps:''}"><span>opak.</span></div>
          <button class="done" data-i="${i}" aria-pressed="${!!s.done}" aria-label="STérie ${i+1} hotová">✓</button></div>`;
      }
    });
    const pause=PAUSE[k]||60;
    h+=`</div><div class="acts"><button class="btn" data-act="add">+ série</button><button class="btn" data-act="timer" data-sec="${pause}">Pauza ${Math.floor(pause/60)}:${String(pause%60).padStart(2,'0')}</button>
      <button class="btn" data-act="how" aria-expanded="false">Jak na to</button><button class="btn warn" data-act="issue">Potíž</button></div>
      <div class="how" hidden><div class="fig">${svgFor(ex)}</div><ol>${ex.st.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>${ex.w?`<div class="note-warn"><strong>Pozor:</strong> ${esc(ex.w)}</div>`:''}</div></section>`;
  });
  h+=`<label class="l" for="tnote">Poznámka k tréninku</label><textarea class="in" id="tnote" placeholder="Jak se cítím, co šlo dobře nebo špatně…">${esc(dr.note)}</textarea>
    <div style="margin-top:12px"><button class="btn primary big" id="saveTrain">Uložit trénink</button></div>
    <p class="small" style="margin-top:8px">Rozpracované hodnoty se ukládají průběžně. Tlačítko „Uložit trénink“ ho zapíše do historie s dnešním datem.</p>`;
  $('#view').innerHTML=h;

  $('#view').querySelectorAll('.chip').forEach(b=>b.onclick=()=>{ST.day=b.dataset.day;save();renderTrain();});
  $('#view').querySelectorAll('section[data-ex]').forEach(sec=>{
    const k=sec.dataset.ex, sets=dr.entries[k];
    sec.querySelectorAll('input').forEach(inp=>inp.addEventListener('input',()=>{
      const s=sets[+inp.dataset.i], f=inp.dataset.f; s[f]=f==='reps'?(num(inp.value)==null?null:Math.round(num(inp.value))):num(inp.value); save();
    }));
    sec.querySelectorAll('.done').forEach(b=>b.onclick=()=>{
      const i=+b.dataset.i, s=sets[i]; s.done=!s.done;
      // fill from placeholder if empty
      if(s.done){sec.querySelectorAll(`input[data-i="${i}"]`).forEach(inp=>{if(inp.value===''&&inp.placeholder){inp.value=inp.placeholder;inp.dispatchEvent(new Event('input'));}});}
      b.setAttribute('aria-pressed',s.done); save();
      if(s.done){const tb=sec.querySelector('[data-act="timer"]'); startTimer(+tb.dataset.sec, EX[k].n);}
    });
    sec.querySelector('[data-act="add"]').onclick=()=>{sets.push({kg:null,reps:null,t:null,done:false});save();renderTrain();
      document.querySelector(`section[data-ex="${k}"]`).scrollIntoView({block:'center'});};
    sec.querySelector('[data-act="timer"]').onclick=e=>startTimer(+e.currentTarget.dataset.sec, EX[k].n);
    sec.querySelector('[data-act="how"]').onclick=e=>{const hw=sec.querySelector('.how');hw.hidden=!hw.hidden;e.currentTarget.setAttribute('aria-expanded',!hw.hidden);e.currentTarget.textContent=hw.hidden?'Jak na to':'Skrýt';};
    sec.querySelector('[data-act="issue"]').onclick=()=>openIssue({exercise:EX[k].n,day:ST.day});
  });
  $('#tnote').addEventListener('input',e=>{dr.note=e.target.value;save();});
  $('#saveTrain').onclick=saveTrain;
}
function saveTrain(){
  const dr=draft(ST.day), entries={}; let any=false;
  Object.entries(dr.entries).forEach(([k,sets])=>{
    const f=sets.filter(s=>s.kg!=null||s.reps!=null||s.t!=null).map(s=>({kg:s.kg,reps:s.reps,t:s.t}));
    if(f.length){entries[k]=f;any=true;}
  });
  if(!any&&!dr.note){toast('Zatím není co uložit – zapište aspoň jednu sérii');return;}
  ST.sessions.push({id:uid(),date:today(),day:ST.day,entries,note:dr.note||''});
  delete ST.drafts[ST.day];
  const idx=DAYS.findIndex(d=>d.id===ST.day);
  if(idx>-1&&idx<6) ST.day=DAYS[idx+1].id; else if(idx===6) ST.day=DAYS[0].id;
  save(); stopTimer(); toast('Trénink uložen. Další na řadě: '+dayById(ST.day).t); renderTrain();
}

// ---------- TIMER ----------
let tEnd=0,tInt=null,tLabel='';
function startTimer(sec,label){
  tEnd=Date.now()+sec*1000; tLabel=label||'Pauza'; $('#timer').hidden=false; $('#timer').classList.remove('end');
  unlockAudio(); clearInterval(tInt); tick(); tInt=setInterval(tick,250);
}
function tick(){
  const left=Math.max(0,Math.round((tEnd-Date.now())/1000));
  $('#tv').textContent=Math.floor(left/60)+':'+String(left%60).padStart(2,'0');
  $('#tl').textContent='Pauza · '+tLabel;
  if(left<=0){clearInterval(tInt);tInt=null;$('#timer').classList.add('end');$('#tl').textContent='Další série · '+tLabel;beep();
    try{navigator.vibrate&&navigator.vibrate([200,100,200]);}catch(e){}}
}
function stopTimer(){clearInterval(tInt);tInt=null;$('#timer').hidden=true;}
$('#tplus').onclick=()=>{tEnd=Math.max(tEnd,Date.now())+15000;if(!tInt){$('#timer').classList.remove('end');tInt=setInterval(tick,250);}tick();};
$('#tminus').onclick=()=>{tEnd-=15000;tick();};
$('#tstop').onclick=stopTimer;
let actx=null;
function unlockAudio(){try{if(!actx){const A=window.AudioContext||window.webkitAudioContext;if(A)actx=new A();}if(actx&&actx.state==='suspended')actx.resume();}catch(e){}}
function beep(){try{if(!actx)return;[0,0.25,0.5].forEach(t=>{const o=actx.createOscillator(),g=actx.createGain();o.frequency.value=880;o.connect(g);g.connect(actx.destination);
  g.gain.setValueAtTime(0.0001,actx.currentTime+t);g.gain.exponentialRampToValueAtTime(0.3,actx.currentTime+t+0.02);g.gain.exponentialRampToValueAtTime(0.0001,actx.currentTime+t+0.18);
  o.start(actx.currentTime+t);o.stop(actx.currentTime+t+0.2);});}catch(e){}}

// ---------- ISSUES ----------
function issueAdvice(i){
  if(i.place==='Hrudník') return {bad:true,txt:'Bolest nebo tlak na hrudi: okamžitě přestaňte cvičit. Pokud neustoupí do několika minut, nebo je spojená s dušností, pocením či bolestí do paže nebo čelisti, volejte 155.'};
  if(RED_TYPES.includes(i.type)||i.intensity>=7) return {bad:true,txt:'Dnes trénink této partie ukončete. Při lupnutí s náhlou bolestí, otoku, modřině, ztrátě síly nebo brnění jděte co nejdříve k lékaři (ortoped, při náhlém zhoršení pohotovost). Do té doby klid, chlazení 15–20 min několikrát denně, nezatěžovat.'};
  if(i.intensity>=4) return {bad:false,txt:'Cvik dnes upravte: snižte váhu nebo rozsah, případně ho vynechte. Pokud bolest trvá déle než 48 hodin, nebo je druhý den ráno horší, řešte ji s mentorem.'};
  return {bad:false,txt:'Mírná potíž: můžete pokračovat, ale s nižší zátěží a v rozsahu bez bolesti. Sledujte, jak se cítíte druhý den ráno.'};
}
function openIssue(pre){
  pre=pre||{};
  const exOpts=['—'].concat([...new Set(DAYS.flatMap(d=>d.x.map(([k])=>EX[k].n)))]);
  const sh=$('#sheet');
  sh.innerHTML=`<div class="grab"></div><h2 id="sheettitle">Nová potíž</h2>
    <div class="row2"><div><label class="l" for="ip">Kde</label><select class="in" id="ip">${PLACES.map(p=>`<option>${esc(p)}</option>`).join('')}</select></div>
    <div><label class="l" for="it">Co se stalo</label><select class="in" id="it">${TYPES.map(p=>`<option>${esc(p)}</option>`).join('')}</select></div></div>
    <label class="l" for="isv">Intenzita bolesti</label><div class="sevrow"><span class="small">0 žádná</span><span id="isvv" class="sev">3 / 10</span><span class="small">10 nejhorší</span></div>
    <input type="range" id="isv" min="0" max="10" value="3">
    <label class="l" for="ie">Při cviku</label><select class="in" id="ie">${exOpts.map(p=>`<option ${p===pre.exercise?'selected':''}>${esc(p)}</option>`).join('')}</select>
    <div class="row2"><div><label class="l" for="id">Datum</label><input class="in" type="date" id="id" value="${today()}"></div>
    <div><label class="l" for="iw">Kdy</label><select class="in" id="iw"><option>během cvičení</option><option>po tréninku</option><option>druhý den</option><option>mimo trénink</option></select></div></div>
    <label class="l" for="in">Poznámka</label><textarea class="in" id="in" placeholder="Jak to přesně bolí, při jakém pohybu, jak dlouho…"></textarea>
    <div id="iadv" style="margin-top:10px"></div>
    <div class="row2" style="margin-top:12px"><button class="btn big" id="icancel">Zrušit</button><button class="btn primary big" id="isave">Uložit</button></div>`;
  $('#sheetbg').hidden=false;
  const upd=()=>{const i={place:$('#ip').value,type:$('#it').value,intensity:+$('#isv').value};$('#isvv').textContent=i.intensity+' / 10';
    const a=issueAdvice(i);$('#iadv').innerHTML=`<div class="${a.bad?'note-bad':'note-ok'}">${esc(a.txt)}</div>`;};
  ['#ip','#it','#isv'].forEach(s=>$(s).addEventListener('input',upd)); upd();
  $('#icancel').onclick=closeSheet;
  $('#isave').onclick=()=>{
    const e=$('#ie').value;
    ST.issues.push({id:uid(),date:$('#id').value||today(),place:$('#ip').value,type:$('#it').value,intensity:+$('#isv').value,
      exercise:e==='—'?'':e,when:$('#iw').value,note:$('#in').value.trim(),resolved:false,resolvedDate:null});
    save();closeSheet();badge();toast('Potíž zapsána – objeví se v exportu pro mentora');
    if((location.hash||'#trenink')==='#potize') renderIssues();
  };
  setTimeout(()=>$('#ip').focus(),50);
}
function closeSheet(){$('#sheetbg').hidden=true;$('#sheet').innerHTML='';}
$('#sheetbg').addEventListener('click',e=>{if(e.target.id==='sheetbg')closeSheet();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#sheetbg').hidden)closeSheet();});

function renderIssues(){
  const open=ST.issues.filter(i=>!i.resolved).slice().reverse(), closed=ST.issues.filter(i=>i.resolved).slice().reverse();
  let h=`<h1>Potíže</h1><p class="lead">Bolesti, píchnutí, lupnutí nebo natažení. Všechno se propíše do exportu pro mentora.</p>
    <button class="btn primary big" id="newIssue">+ Zapsat potíž</button><h2>Trvá (${open.length})</h2>`;
  const item=i=>`<div class="item"><div class="top"><strong>${esc(i.place)}</strong><span class="pill ${i.resolved?'closed':'open'}">${i.resolved?'odeznělo':'trvá'}</span></div>
    <div>${esc(i.type)} · <span class="sev">${i.intensity}/10</span>${i.exercise?' · '+esc(i.exercise):''}</div>
    <div class="meta">${fmtDate(i.date)} · ${esc(i.when||'')}${i.resolved&&i.resolvedDate?' · odeznělo '+fmtDate(i.resolvedDate):''}</div>
    ${i.note?`<div>${esc(i.note)}</div>`:''}
    <div class="acts">${i.resolved?`<button class="btn" data-reopen="${i.id}">Znovu se objevilo</button>`:`<button class="btn" data-resolve="${i.id}">Odeznělo</button>`}
    <button class="btn warn" data-del="${i.id}">Smazat</button></div></div>`;
  h+=open.length?`<div class="list">${open.map(item).join('')}</div>`:'<p class="empty">Žádné aktivní potíže.</p>';
  h+=`<h2>Odeznělo (${closed.length})</h2>`+(closed.length?`<div class="list">${closed.map(item).join('')}</div>`:'<p class="empty">Zatím nic.</p>');
  $('#view').innerHTML=h;
  $('#newIssue').onclick=()=>openIssue({});
  bindList(ST.issues,renderIssues,{resolve:i=>{i.resolved=true;i.resolvedDate=today();},reopen:i=>{i.resolved=false;i.resolvedDate=null;}});
}
// two-tap delete + simple actions
function bindList(arr,rerender,acts){
  document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{
    if(b.dataset.armed){const ix=arr.findIndex(x=>x.id===b.dataset.del);if(ix>-1)arr.splice(ix,1);save();badge();rerender();toast('Smazáno');}
    else{b.dataset.armed='1';b.textContent='Opravdu smazat?';setTimeout(()=>{if(b.isConnected){delete b.dataset.armed;b.textContent='Smazat';}},3000);}
  });
  Object.entries(acts||{}).forEach(([a,fn])=>document.querySelectorAll(`[data-${a}]`).forEach(b=>b.onclick=()=>{
    const it=arr.find(x=>x.id===b.dataset[a]);if(it){fn(it);save();badge();rerender();}
  }));
}

// ---------- MEASUREMENTS ----------
const MF=[['weight','Hmotnost','kg'],['waist','Pas','cm'],['arm','Paže','cm'],['thigh','Stehno','cm'],['sleep','Spánek','h'],['energy','Energie','1–5'],['joints','Klouby','1–5']];
function renderMeasure(){
  const last=ST.measures[ST.measures.length-1]||{};
  let h=`<h1>Měření</h1><p class="lead">Váha 3–4× týdně ráno po toaletě, pas v neděli ráno, paže a stehno jednou za 4 týdny. Vyplňte jen to, co jste dnes měřil.</p>
    <div class="card"><label class="l" for="md">Datum</label><input class="in" type="date" id="md" value="${today()}">
    <div class="row2">${MF.map(([k,n,u])=>`<div><label class="l" for="m_${k}">${n} (${u})</label><input class="in" id="m_${k}" inputmode="decimal" placeholder="${last[k]!=null?fmtNum(last[k]):''}"></div>`).join('')}</div>
    <label class="l" for="mn">Poznámka</label><input class="in" id="mn" placeholder="např. špatně jsem spal, nadýmání…">
    <div style="margin-top:12px"><button class="btn primary big" id="msave">Uložit měření</button></div></div>`;
  // trends
  const trend=k=>{const v=ST.measures.filter(m=>m[k]!=null);if(v.length<2)return '';const a=v[0][k],b=v[v.length-1][k],d=Math.round((b-a)*10)/10;
    return `${fmtNum(a)} → ${fmtNum(b)} (${d>0?'+':''}${fmtNum(d)})`;};
  const tr=[['weight','Hmotnost','kg'],['waist','Pas','cm'],['arm','Paže','cm'],['thigh','Stehno','cm']].map(([k,n,u])=>{const t=trend(k);return t?`<div><strong>${n}:</strong> ${t} ${u}</div>`:'';}).join('');
  if(tr) h+=`<h2>Vývoj od prvního záznamu</h2><div class="card">${tr}</div>`;
  h+=`<h2>Záznamy</h2>`;
  if(!ST.measures.length) h+='<p class="empty">Zatím žádné měření.</p>';
  else{
    h+=`<div class="card scroll"><table class="t"><thead><tr><th>Datum</th>${MF.map(([,n,u])=>`<th>${n}<br><span class="small">${u}</span></th>`).join('')}<th></th></tr></thead><tbody>`;
    ST.measures.slice().reverse().forEach(m=>{h+=`<tr><td>${shortDate(m.date)}</td>${MF.map(([k])=>`<td>${m[k]!=null?fmtNum(m[k]):''}</td>`).join('')}<td><button class="btn warn" data-del="${m.id}" style="padding:4px 8px">Smazat</button></td></tr>`;
      if(m.note) h+=`<tr><td></td><td colspan="${MF.length+1}" class="small" style="white-space:normal">${esc(m.note)}</td></tr>`;});
    h+='</tbody></table></div>';
  }
  $('#view').innerHTML=h;
  $('#msave').onclick=()=>{
    const m={id:uid(),date:$('#md').value||today(),note:$('#mn').value.trim()};let any=!!m.note;
    MF.forEach(([k])=>{const v=num($('#m_'+k).value);m[k]=v;if(v!=null)any=true;});
    if(!any){toast('Vyplňte aspoň jednu hodnotu');return;}
    ST.measures.push(m);ST.measures.sort((a,b)=>a.date.localeCompare(b.date));save();toast('Měření uloženo');renderMeasure();
  };
  bindList(ST.measures,renderMeasure);
}

// ---------- EXPORT ----------
function report(days){
  const from=days?new Date(Date.now()-days*864e5).toISOString().slice(0,10):'0000';
  const ses=ST.sessions.filter(s=>s.date>=from), mea=ST.measures.filter(m=>m.date>=from);
  const iss=ST.issues.filter(i=>i.date>=from||!i.resolved);
  const L=[];
  L.push('# PK trénink – export pro mentora');
  L.push(`Vytvořeno ${fmtDate(today())} · období: ${days?`posledních ${days} dní (od ${fmtDate(from)})`:'vše'}`);
  L.push('');
  L.push(`## Potíže (${iss.length})`);
  if(!iss.length) L.push('Žádné.');
  iss.forEach(i=>L.push(`- ${fmtDate(i.date)} · **${i.place}** · ${i.type} · ${i.intensity}/10${i.exercise?' · cvik: '+i.exercise:''} · ${i.when||''} · ${i.resolved?'odeznělo'+(i.resolvedDate?' '+fmtDate(i.resolvedDate):''):'TRVÁ'}${i.note?'\n  Poznámka: '+i.note:''}`));
  L.push('');
  L.push(`## Měření (${mea.length})`);
  if(mea.length){
    L.push('| Datum | Hmotnost kg | Pas cm | Paže cm | Stehno cm | Spánek h | Energie 1–5 | Klouby 1–5 | Poznámka |');
    L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    mea.forEach(m=>L.push(`| ${m.date} | ${MF.map(([k])=>m[k]!=null?fmtNum(m[k]):'').join(' | ')} | ${(m.note||'').replace(/\|/g,'/')} |`));
  }else L.push('Žádná.');
  L.push('');
  L.push(`## Tréninky (${ses.length})`);
  if(!ses.length) L.push('Žádné.');
  ses.forEach(s=>{
    const d=dayById(s.day); L.push(`### ${s.date} – ${d.t}`);
    d.x.forEach(([k,dose])=>{const e=s.entries[k];if(!e)return;const si=setsInfo(dose);L.push(`- ${EX[k].n} (${dose}): ${setsText(e,si.timed,si.unit)}`);});
    Object.keys(s.entries).filter(k=>!d.x.some(([x])=>x===k)).forEach(k=>L.push(`- ${EX[k]?EX[k].n:k}: ${setsText(s.entries[k],false,'')}`));
    if(s.note) L.push(`Poznámka: ${s.note}`);
    L.push('');
  });
  return L.join('\n');
}
let expDays=28;
function renderExport(){
  const txt=report(expDays);
  let h=`<h1>Export pro mentora</h1><p class="lead">Jednou za 3–4 týdny pošlete mentorovi tento přehled (vložte ho do konverzace nebo uložte do složky 01_Mereni). Data jsou jen v tomto telefonu.</p>
    <div class="chips" role="group" aria-label="Období">${[[28,'4 týdny'],[56,'8 týdnů'],[0,'Vše']].map(([d,n])=>`<button class="chip" data-d="${d}" aria-pressed="${d===expDays}">${n}</button>`).join('')}</div>
    <div class="row2"><button class="btn primary big" id="share">Sdílet…</button><button class="btn big" id="copy">Kopírovat</button></div>
    <pre class="exp" id="exp">${esc(txt)}</pre>
    <h2>Záloha dat</h2><p class="small">Zálohu si občas uložte do Souborů (iCloud). Hodí se při výměně telefonu.</p>
    <div class="row2"><button class="btn big" id="backup">Uložit zálohu</button><label class="btn big" style="text-align:center" for="restore">Obnovit ze zálohy</label></div>
    <input type="file" id="restore" accept="application/json,.json" hidden>
    <h2>Uložené tréninky (${ST.sessions.length})</h2>`;
  if(!ST.sessions.length) h+='<p class="empty">Zatím žádný uložený trénink.</p>';
  else h+='<div class="list">'+ST.sessions.slice().reverse().slice(0,30).map(s=>`<div class="item"><div class="top"><strong>${esc(dayById(s.day).t)}</strong><span class="meta">${fmtDate(s.date)}</span></div>
    <div class="meta">${Object.keys(s.entries).length} cviků${s.note?' · '+esc(s.note):''}</div><div class="acts"><button class="btn warn" data-del="${s.id}">Smazat</button></div></div>`).join('')+'</div>';
  h+=`<p class="small" style="margin-top:18px">PK Trénink · program platný od 16. 11. 2026</p>`;
  $('#view').innerHTML=h;
  $('#view').querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{expDays=+b.dataset.d;renderExport();});
  $('#copy').onclick=async()=>{try{await navigator.clipboard.writeText(txt);toast('Zkopírováno – vložte do konverzace s mentorem');}catch(e){selectExp();toast('Text je označený – zkopírujte ho');}};
  $('#share').onclick=async()=>{
    const name=`${today()}_PK_trenink_export.md`;
    try{
      const f=new File([txt],name,{type:'text/markdown'});
      if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:'PK trénink – export'});return;}
      if(navigator.share){await navigator.share({title:'PK trénink – export',text:txt});return;}
    }catch(e){if(e&&e.name==='AbortError')return;}
    try{await navigator.clipboard.writeText(txt);toast('Sdílení tu nejde – text je zkopírovaný');}catch(e){selectExp();toast('Text je označený – zkopírujte ho');}
  };
  $('#backup').onclick=async()=>{
    const data=JSON.stringify(Object.assign({app:'pk-trenink',version:1,saved:new Date().toISOString()},ST),null,1);
    const name=`${today()}_PK_trenink_zaloha.json`;
    try{const f=new File([data],name,{type:'application/json'});
      if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:'Záloha PK trénink'});return;}}catch(e){if(e&&e.name==='AbortError')return;}
    try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();a.remove();toast('Záloha stažena');}
    catch(e){toast('Zálohu se nepodařilo uložit');}
  };
  $('#restore').onchange=async e=>{
    const f=e.target.files[0];if(!f)return;
    try{const d=JSON.parse(await f.text());if(d.app!=='pk-trenink'||!Array.isArray(d.sessions))throw 0;
      ST=Object.assign(blank(),{sessions:d.sessions,measures:d.measures||[],issues:d.issues||[],drafts:d.drafts||{},day:d.day||'den-1'});save();badge();
      toast(`Obnoveno: ${ST.sessions.length} tréninků, ${ST.measures.length} měření, ${ST.issues.length} potíží`);renderExport();}
    catch(err){toast('Tohle není záloha z PK Trénink');}
  };
  bindList(ST.sessions,renderExport);
}
function selectExp(){const r=document.createRange();r.selectNodeContents($('#exp'));const s=getSelection();s.removeAllRanges();s.addRange(r);}

// ---------- start ----------
route();
if('serviceWorker' in navigator && location.protocol==='https:' && !/claude|claudeusercontent/.test(location.hostname)){
  try{navigator.serviceWorker.register('sw.js').catch(()=>{});}catch(e){}
}
