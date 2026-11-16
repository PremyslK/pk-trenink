// PK Trénink – Jídlo: sběr dat pro agenta (oblíbené, fotky, popisy) + týdenní balík.
// Fotky jsou v IndexedDB v telefonu; záznamy v ST.meals, oblíbené v ST.foods.
'use strict';
const MEALS=['Snídaně','Dopolední svačina','Oběd','Odpolední svačina','Večeře','Po tréninku','Jiné'];
const MEAL_SLUG={'Snídaně':'snidane','Dopolední svačina':'svacina1','Oběd':'obed','Odpolední svačina':'svacina2','Večeře':'vecere','Po tréninku':'po-treninku','Jiné':'jine'};
const WD=['neděle','pondělí','úterý','středa','čtvrtek','pátek','sobota'];
function mealByTime(){const h=new Date().getHours();return h<10?'Snídaně':h<12?'Dopolední svačina':h<15?'Oběd':h<18?'Odpolední svačina':'Večeře';}
function nowTime(){const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
function addDays(iso,n){const [y,m,d]=iso.split('-').map(Number);const x=new Date(y,m-1,d+n);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');}
function weekday(iso){const [y,m,d]=iso.split('-').map(Number);return WD[new Date(y,m-1,d).getDay()];}
function r1(n){return Math.round(n*10)/10;}
function kfmt(n){return n==null?'–':Math.round(n).toLocaleString('cs-CZ');}
let foodDate=null, foodExpMode='unsent', thumbURLs=[];

// ---------- photo storage (IndexedDB) ----------
const PDB={_db:null,
  open(){if(this._db)return Promise.resolve(this._db);
    return new Promise((res,rej)=>{if(!window.indexedDB)return rej(new Error('IndexedDB není k dispozici'));
      const r=indexedDB.open('pk-trenink-foto',1);r.onupgradeneeded=()=>r.result.createObjectStore('p');
      r.onsuccess=()=>{this._db=r.result;res(r.result);};r.onerror=()=>rej(r.error);});},
  async put(id,blob){const db=await this.open();return new Promise((res,rej)=>{const t=db.transaction('p','readwrite');t.objectStore('p').put(blob,id);t.oncomplete=()=>res();t.onerror=()=>rej(t.error);});},
  async get(id){const db=await this.open();return new Promise((res,rej)=>{const q=db.transaction('p').objectStore('p').get(id);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error);});},
  async del(id){try{const db=await this.open();return new Promise(res=>{const t=db.transaction('p','readwrite');t.objectStore('p').delete(id);t.oncomplete=()=>res();t.onerror=()=>res();});}catch(e){}}
};
function compress(file,max=1280,q=0.8){
  return new Promise(res=>{const url=URL.createObjectURL(file);const img=new Image();
    img.onload=()=>{let w=img.naturalWidth,h=img.naturalHeight;const s=Math.min(1,max/Math.max(w,h));w=Math.round(w*s);h=Math.round(h*s);
      const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);URL.revokeObjectURL(url);
      c.toBlob(b=>res(b||file),'image/jpeg',q);};
    img.onerror=()=>{URL.revokeObjectURL(url);res(file);};img.src=url;});
}
function photoName(m,i){return `${m.date}_${(m.time||'0000').replace(':','')}_${MEAL_SLUG[m.meal]||'jidlo'}${i?'_'+i:''}.jpg`;}

// ---------- values ----------
function favValues(f,qty){const v={};['kcal','p','f','c'].forEach(k=>v[k]=f[k]==null?null:r1(f[k]*qty));return v;}
function sumDay(items){const s={kcal:0,p:0,f:0,c:0,known:0,pending:0};
  items.forEach(m=>{if(m.kcal==null){s.pending++;return;}s.known++;['kcal','p','f','c'].forEach(k=>s[k]+=m[k]||0);});return s;}
function valText(m){if(m.kcal==null)return '';return `${kfmt(m.kcal)} kcal · B ${fmtNum(r1(m.p||0))} g · T ${fmtNum(r1(m.f||0))} g · S ${fmtNum(r1(m.c||0))} g`;}

// ---------- main view ----------
function renderFood(){
  thumbURLs.forEach(u=>URL.revokeObjectURL(u));thumbURLs=[];
  const d=foodDate||today(), isToday=d===today();
  const items=ST.meals.filter(m=>m.date===d).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  const s=sumDay(items);
  const unsent=ST.meals.filter(m=>!m.sent), oldest=unsent.reduce((a,m)=>a&&a<m.date?a:m.date,null);
  const stale=oldest&&oldest<=addDays(today(),-7);
  let h=`<h1>Jídlo</h1><p class="lead">Zapisujte, co jíte. Hodnoty z fotek a popisů doplní agent při týdenním vyhodnocení.</p>`;
  if(unsent.length) h+=`<div class="${stale?'note-warn':'note-ok'}" style="margin-bottom:12px">Neodesláno agentovi: <strong>${unsent.length}</strong> záznamů z ${new Set(unsent.map(m=>m.date)).size} dní${stale?' – je čas poslat balík':''}. <a href="#export">Odeslat v Exportu</a></div>`;
  h+=`<div class="daynav"><button class="btn" id="dprev" aria-label="Předchozí den">‹</button>
      <div><strong>${isToday?'Dnes':esc(weekday(d))}</strong><span class="small"> · ${fmtDate(d)}</span></div>
      <button class="btn" id="dnext" aria-label="Další den" ${isToday?'disabled':''}>›</button></div>
    <div class="grid3"><button class="btn primary" id="addFav">★ Oblíbené</button>
      <label class="btn primary" for="fphoto" role="button" tabindex="0">Fotka</label>
      <button class="btn primary" id="addText">Popis</button></div>
    <input type="file" id="fphoto" accept="image/*" hidden>
    <div class="card daysum"><div><strong>${kfmt(s.kcal)} kcal</strong> · B ${fmtNum(r1(s.p))} g · T ${fmtNum(r1(s.f))} g · S ${fmtNum(r1(s.c))} g</div>
      <div class="small">${s.known?'Součet záznamů se známými hodnotami':'Zatím žádné známé hodnoty'}${s.pending?` · <strong>${s.pending}</strong> čeká na odhad agenta`:''}</div>
      <div class="small">Cíl ve fázi objemu: 2 350–2 500 kcal, 150–160 g bílkovin</div></div>`;
  if(!items.length) h+=`<p class="empty">Na tento den zatím nic. Přidejte oblíbenou potravinu, vyfoťte talíř nebo obal, nebo jídlo krátce popište.</p>`;
  else{
    h+='<div class="list">';
    items.forEach(m=>{
      h+=`<div class="item food"><div class="frow">${m.photoId?`<img class="thumb" data-photo="${m.photoId}" alt="Fotka: ${esc(m.name||m.meal)}">`:`<div class="thumb ph">${m.kind==='fav'?'★':'✎'}</div>`}
        <div class="fbody"><div class="top"><strong>${esc(m.name||(m.kind==='photo'?(m.photoType==='obal'?'Obal – tabulka hodnot':'Jídlo z fotky'):'Popis'))}</strong><span class="meta">${esc(m.time||'')}</span></div>
        <div class="meta">${esc(m.meal)}${m.kind==='fav'?` · ${fmtNum(m.qty)} × ${esc(m.portion||'porce')}`:''}${m.sent?' · odesláno':''}</div>
        ${m.note?`<div>${esc(m.note)}</div>`:''}
        <div class="${m.kcal==null?'small':''}">${m.kcal==null?'Hodnoty doplní agent':esc(valText(m))}</div></div></div>
        <div class="acts"><button class="btn warn" data-delmeal="${m.id}">Smazat</button></div></div>`;
    });
    h+='</div>';
  }
  const favs=ST.foods.slice().sort((a,b)=>(b.uses||0)-(a.uses||0)||a.name.localeCompare(b.name,'cs'));
  h+=`<h2>Oblíbené potraviny (${favs.length})</h2><p class="small">Potraviny, které jíte často. Hodnoty jsou na uvedenou porci. Agent vám je může poslat jako kód k vložení.</p>
    <div class="row2" style="margin-bottom:10px"><button class="btn big" id="newFav">+ Nová oblíbená</button><button class="btn big" id="impFav">Vložit od agenta</button></div>`;
  if(favs.length){h+='<div class="list">';favs.forEach(f=>{h+=`<div class="item"><div class="top"><strong>${esc(f.name)}</strong><span class="meta">${esc(f.portion||'')}</span></div>
    <div class="small">${esc(valText(f))}</div><div class="acts"><button class="btn" data-editfav="${f.id}">Upravit</button><button class="btn warn" data-delfav="${f.id}">Smazat</button></div></div>`;});h+='</div>';}
  $('#view').innerHTML=h;

  $('#dprev').onclick=()=>{foodDate=addDays(d,-1);renderFood();};
  $('#dnext').onclick=()=>{if(!isToday){foodDate=addDays(d,1);renderFood();}};
  $('#addFav').onclick=()=>openFavPick(d);
  $('#addText').onclick=()=>openTextMeal(d);
  $('#fphoto').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)openPhotoMeal(f,d);};
  $('#newFav').onclick=()=>openFavEdit(null);
  $('#impFav').onclick=openFavImport;
  document.querySelectorAll('img[data-photo]').forEach(async img=>{try{const b=await PDB.get(img.dataset.photo);if(b){const u=URL.createObjectURL(b);thumbURLs.push(u);img.src=u;}}catch(e){}});
  armDelete('[data-delmeal]','delmeal',id=>{const ix=ST.meals.findIndex(m=>m.id===id);if(ix>-1){const m=ST.meals[ix];if(m.photoId)PDB.del(m.photoId);ST.meals.splice(ix,1);}});
  armDelete('[data-delfav]','delfav',id=>{const ix=ST.foods.findIndex(f=>f.id===id);if(ix>-1)ST.foods.splice(ix,1);});
  document.querySelectorAll('[data-editfav]').forEach(b=>b.onclick=()=>openFavEdit(ST.foods.find(f=>f.id===b.dataset.editfav)));
}
function armDelete(sel,key,fn){
  document.querySelectorAll(sel).forEach(b=>b.onclick=()=>{
    if(b.dataset.armed){fn(b.dataset[key]);save();renderFood();toast('Smazáno');}
    else{b.dataset.armed='1';b.textContent='Opravdu smazat?';setTimeout(()=>{if(b.isConnected){delete b.dataset.armed;b.textContent='Smazat';}},3000);}
  });
}

// ---------- sheets ----------
function whenFields(d){
  return `<div class="row2"><div><label class="l" for="fdate">Datum</label><input class="in" type="date" id="fdate" value="${d}"></div>
    <div><label class="l" for="ftime">Čas</label><input class="in" type="time" id="ftime" value="${d===today()?nowTime():'12:00'}"></div></div>
    <label class="l" for="fmeal">Jídlo dne</label><select class="in" id="fmeal">${MEALS.map(x=>`<option ${x===mealByTime()?'selected':''}>${x}</option>`).join('')}</select>`;
}
function readWhen(){return {date:$('#fdate').value||today(),time:$('#ftime').value||nowTime(),meal:$('#fmeal').value};}
function showSheet(html){$('#sheet').innerHTML='<div class="grab"></div>'+html;$('#sheetbg').hidden=false;}
function afterAdd(date,msg){save();closeSheet();foodDate=date;toast(msg);renderFood();}

function openFavPick(d){
  const favs=ST.foods.slice().sort((a,b)=>(b.uses||0)-(a.uses||0)||a.name.localeCompare(b.name,'cs'));
  if(!favs.length){showSheet(`<h2 id="sheettitle">Oblíbené</h2><p class="empty">Zatím nemáte žádnou oblíbenou potravinu. Přidejte ji ručně, nebo vyfoťte obal a agent vám pošle kód k vložení.</p>
    <div class="row2"><button class="btn big" id="fx">Zavřít</button><button class="btn primary big" id="fn">+ Nová oblíbená</button></div>`);
    $('#fx').onclick=closeSheet;$('#fn').onclick=()=>openFavEdit(null);return;}
  showSheet(`<h2 id="sheettitle">Přidat z oblíbených</h2><input class="in" id="fq" placeholder="Hledat…" autocomplete="off">
    <div class="list" id="fl" style="margin-top:10px"></div><div style="margin-top:12px"><button class="btn big" id="fx">Zavřít</button></div>`);
  const list=()=>{const q=$('#fq').value.trim().toLowerCase();
    $('#fl').innerHTML=favs.filter(f=>!q||f.name.toLowerCase().includes(q)).map(f=>`<button class="item pick" data-f="${f.id}"><strong>${esc(f.name)}</strong><span class="small">${esc(f.portion||'')} · ${kfmt(f.kcal)} kcal · B ${fmtNum(f.p)} g</span></button>`).join('')||'<p class="empty">Nic nenalezeno.</p>';
    document.querySelectorAll('#fl [data-f]').forEach(b=>b.onclick=()=>openFavQty(ST.foods.find(f=>f.id===b.dataset.f),d));};
  $('#fq').oninput=list;list();$('#fx').onclick=closeSheet;
}
function openFavQty(f,d){
  let qty=1;
  showSheet(`<h2 id="sheettitle">${esc(f.name)}</h2><p class="small">Porce: ${esc(f.portion||'1 porce')}</p>
    <label class="l">Množství (počet porcí)</label><div class="qty"><button class="btn" id="qm" aria-label="Méně">−</button><output id="qv">1</output><button class="btn" id="qp" aria-label="Více">+</button></div>
    <div class="note-ok" id="qval" style="margin-top:8px"></div>${whenFields(d)}
    <div class="row2" style="margin-top:12px"><button class="btn big" id="fx">Zpět</button><button class="btn primary big" id="fs">Přidat</button></div>`);
  const upd=()=>{$('#qv').textContent=fmtNum(qty);$('#qval').textContent=valText(favValues(f,qty))||'Bez hodnot';};upd();
  $('#qm').onclick=()=>{qty=Math.max(0.25,qty>1?qty-0.5:qty-0.25);upd();};$('#qp').onclick=()=>{qty=qty<1?qty+0.25:qty+0.5;upd();};
  $('#fx').onclick=()=>openFavPick(d);
  $('#fs').onclick=()=>{const w=readWhen();f.uses=(f.uses||0)+1;
    ST.meals.push(Object.assign({id:uid(),kind:'fav',favId:f.id,name:f.name,portion:f.portion,qty,sent:false},w,favValues(f,qty)));afterAdd(w.date,'Přidáno');};
}
function openTextMeal(d){
  showSheet(`<h2 id="sheettitle">Popis jídla</h2><label class="l" for="tn">Co jste jedl (a kolik)</label>
    <textarea class="in" id="tn" placeholder="např. 2 rohlíky s máslem a šunkou, kafe s mlékem"></textarea>${whenFields(d)}
    <details style="margin-top:10px"><summary class="small">Znám hodnoty (nepovinné)</summary><div class="row2">${['kcal','p','f','c'].map(k=>`<div><label class="l" for="v_${k}">${{kcal:'kcal',p:'Bílkoviny g',f:'Tuky g',c:'Sacharidy g'}[k]}</label><input class="in" id="v_${k}" inputmode="decimal"></div>`).join('')}</div></details>
    <div class="row2" style="margin-top:12px"><button class="btn big" id="fx">Zrušit</button><button class="btn primary big" id="fs">Uložit</button></div>`);
  $('#fx').onclick=closeSheet;setTimeout(()=>{const t=$('#tn');if(t)t.focus();},50);
  $('#fs').onclick=()=>{const note=$('#tn').value.trim();if(!note){toast('Napište, co jste jedl');return;}
    const w=readWhen(),v={};['kcal','p','f','c'].forEach(k=>v[k]=num($('#v_'+k).value));if(v.kcal==null)['p','f','c'].forEach(k=>{if(v[k]==null)v[k]=null;});
    ST.meals.push(Object.assign({id:uid(),kind:'text',name:'',note,sent:false},w,v.kcal!=null?v:{kcal:null}));afterAdd(w.date,'Uloženo');};
}
async function openPhotoMeal(file,d){
  showSheet(`<h2 id="sheettitle">Fotka jídla</h2><p class="small">Zpracovávám fotku…</p>`);
  let blob;try{blob=await compress(file);}catch(e){blob=file;}
  const url=URL.createObjectURL(blob);
  showSheet(`<h2 id="sheettitle">Fotka jídla</h2><img class="preview" src="${url}" alt="Náhled fotky">
    <label class="l">Co je na fotce</label><div class="seg" role="radiogroup"><button class="btn" data-t="talir" aria-pressed="true">Talíř / jídlo</button><button class="btn" data-t="obal" aria-pressed="false">Obal – tabulka hodnot</button></div>
    <label class="l" for="pn">Název (nepovinné)</label><input class="in" id="pn" placeholder="např. kuře s rýží / Skyr bílý">
    <label class="l" for="pt">Poznámka – hlavně množství</label><input class="in" id="pt" placeholder="např. velký talíř, snědl jsem půlku balení">
    ${whenFields(d)}
    <div class="row2" style="margin-top:12px"><button class="btn big" id="fx">Zrušit</button><button class="btn primary big" id="fs">Uložit</button></div>`);
  let type='talir';
  document.querySelectorAll('.seg [data-t]').forEach(b=>b.onclick=()=>{type=b.dataset.t;document.querySelectorAll('.seg [data-t]').forEach(x=>x.setAttribute('aria-pressed',x===b));
    $('#pt').placeholder=type==='obal'?'např. snědl jsem celé balení 140 g':'např. velký talíř, polovina rýže';});
  $('#fx').onclick=()=>{URL.revokeObjectURL(url);closeSheet();};
  $('#fs').onclick=async()=>{
    const id='p'+uid(),w=readWhen();
    try{await PDB.put(id,blob);}catch(e){toast('Fotku se nepodařilo uložit do telefonu');return;}
    URL.revokeObjectURL(url);
    ST.meals.push(Object.assign({id:uid(),kind:'photo',photoType:type,photoId:id,name:$('#pn').value.trim(),note:$('#pt').value.trim(),kcal:null,sent:false},w));
    afterAdd(w.date,'Fotka uložena');
  };
}
function openFavEdit(f){
  const e=f||{name:'',portion:'',kcal:null,p:null,f:null,c:null};
  showSheet(`<h2 id="sheettitle">${f?'Upravit oblíbenou':'Nová oblíbená potravina'}</h2>
    <label class="l" for="en">Název</label><input class="in" id="en" value="${esc(e.name)}" placeholder="např. Skyr bílý Milko">
    <label class="l" for="ep">Porce</label><input class="in" id="ep" value="${esc(e.portion||'')}" placeholder="např. 1 kelímek 140 g / 100 g / 1 ks">
    <p class="small">Hodnoty na tuto porci:</p>
    <div class="row2">${[['kcal','kcal'],['p','Bílkoviny g'],['f','Tuky g'],['c','Sacharidy g']].map(([k,n])=>`<div><label class="l" for="e_${k}">${n}</label><input class="in" id="e_${k}" inputmode="decimal" value="${e[k]==null?'':fmtNum(e[k])}"></div>`).join('')}</div>
    <div class="row2" style="margin-top:12px"><button class="btn big" id="fx">Zrušit</button><button class="btn primary big" id="fs">Uložit</button></div>`);
  $('#fx').onclick=closeSheet;
  $('#fs').onclick=()=>{const n=$('#en').value.trim();if(!n){toast('Vyplňte název');return;}
    const v={name:n,portion:$('#ep').value.trim()};['kcal','p','f','c'].forEach(k=>v[k]=num($('#e_'+k).value));
    if(v.kcal==null){toast('Vyplňte aspoň kcal');return;}
    if(f)Object.assign(f,v);else ST.foods.push(Object.assign({id:uid(),uses:0},v));save();closeSheet();toast('Uloženo');renderFood();};
}
function openFavImport(){
  showSheet(`<h2 id="sheettitle">Vložit oblíbené od agenta</h2><p class="small">Agent vám po vyhodnocení pošle kód (začíná znakem [ ). Zkopírujte ho celý a vložte sem.</p>
    <textarea class="in" id="ij" style="min-height:140px" placeholder='[{"name":"Skyr bílý","portion":"1 kelímek 140 g","kcal":88,"p":15.4,"f":0.3,"c":5.6}]'></textarea>
    <div class="row2" style="margin-top:12px"><button class="btn big" id="fx">Zrušit</button><button class="btn primary big" id="fs">Vložit</button></div>`);
  $('#fx').onclick=closeSheet;
  $('#fs').onclick=()=>{const t=$('#ij').value;const a=t.indexOf('['),b=t.lastIndexOf(']');let arr;
    try{arr=JSON.parse(t.slice(a,b+1));if(!Array.isArray(arr))throw 0;}catch(e){toast('Kód se nepodařilo přečíst – zkopírujte ho celý');return;}
    let add=0,upd=0;arr.forEach(x=>{if(!x||!x.name||x.kcal==null)return;const v={name:String(x.name),portion:String(x.portion||''),kcal:+x.kcal,p:x.p==null?null:+x.p,f:x.f==null?null:+x.f,c:x.c==null?null:+x.c};
      const ex=ST.foods.find(f=>f.name.toLowerCase()===v.name.toLowerCase());if(ex){Object.assign(ex,v);upd++;}else{ST.foods.push(Object.assign({id:uid(),uses:0},v));add++;}});
    save();closeSheet();toast(`Přidáno ${add}, aktualizováno ${upd}`);renderFood();};
}

// ---------- export for the agent ----------
function foodSelection(){
  if(foodExpMode==='unsent') return ST.meals.filter(m=>!m.sent);
  const from=addDays(today(),foodExpMode==='7'?-6:-27);return ST.meals.filter(m=>m.date>=from);
}
function foodReport(items){
  const days=[...new Set(items.map(m=>m.date))].sort();const L=[];let pi=0;const names={};
  L.push('# PK jídelníček – balík pro agenta');
  L.push(`Vytvořeno ${fmtDate(today())} ${nowTime()} · ${days.length?`období ${fmtDate(days[0])} – ${fmtDate(days[days.length-1])}`:'bez záznamů'} · záznamů ${items.length} · fotek ${items.filter(m=>m.photoId).length}`);
  L.push('Cíl (fáze objemu): 2 350–2 500 kcal, 150–160 g bílkovin, tuky 65–80 g, sacharidy 260–300 g denně.');
  L.push('');
  days.forEach(d=>{
    const di=items.filter(m=>m.date===d).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
    L.push(`## ${d} (${weekday(d)})`);
    di.forEach(m=>{
      let line=`- ${m.time||'--:--'} · ${m.meal} · `;
      if(m.kind==='fav') line+=`**${m.name}** – ${fmtNum(m.qty)} × (${m.portion||'porce'}) = ${valText(m)} [oblíbené]`;
      else if(m.kind==='photo'){const used=(names[m.date+m.time+m.meal]||0);names[m.date+m.time+m.meal]=used+1;m._file=photoName(m,used);
        line+=`FOTO ${m.photoType==='obal'?'OBAL (tabulka hodnot)':'TALÍŘ'}: ${m._file}${m.name?` · ${m.name}`:''}${m.note?` · „${m.note}“`:''} → ${m.kcal==null?'doplní agent':valText(m)}`;}
      else line+=`POPIS: „${m.note}“ → ${m.kcal==null?'doplní agent':valText(m)}`;
      L.push(line);
    });
    const s=sumDay(di);L.push(`Součet známých hodnot: ${valText(s)||'0 kcal'}${s.pending?` · čeká na odhad: ${s.pending}`:''}`);L.push('');
  });
  if(ST.foods.length){L.push('## Oblíbené potraviny v aplikaci');L.push('| Název | Porce | kcal | B g | T g | S g |');L.push('| --- | --- | --- | --- | --- | --- |');
    ST.foods.forEach(f=>L.push(`| ${f.name} | ${f.portion||''} | ${fmtNum(f.kcal)} | ${fmtNum(f.p)} | ${fmtNum(f.f)} | ${fmtNum(f.c)} |`));L.push('');}
  L.push('## Pro agenta');
  L.push('1. U FOTO TALÍŘ a POPIS odhadni porci a hodnoty (kcal, B, T, S); u FOTO OBAL přečti tabulku a přepočti na snědené množství.');
  L.push('2. Doplň denní součty, zapiš je do jídelníčku ve složce 04_Vyziva a aktualizuj přehled a grafy.');
  L.push('3. Opakující se potraviny pošli zpět jako kód pro „Vložit od agenta“: [{"name":"…","portion":"…","kcal":0,"p":0,"f":0,"c":0}]');
  return L.join('\n');
}
function renderFoodExport(el){
  const items=foodSelection().slice().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const photos=items.filter(m=>m.photoId).length;
  el.innerHTML=`<h2>Jídlo pro agenta</h2><p class="small">Balík = seznam jídel (text) + fotky. Na iPhonu vyberte <strong>AirDrop</strong> na Mac, nebo rovnou aplikaci Claude.</p>
    <div class="chips" role="group" aria-label="Které záznamy">${[['unsent','Neodeslané'],['7','7 dní'],['28','4 týdny']].map(([k,n])=>`<button class="chip" data-fm="${k}" aria-pressed="${k===foodExpMode}">${n}</button>`).join('')}</div>
    <div class="card"><strong>${items.length}</strong> záznamů · <strong>${photos}</strong> fotek${items.length?` · ${fmtDate(items[0].date)} – ${fmtDate(items[items.length-1].date)}`:''}</div>
    <button class="btn primary big" id="fshare" ${items.length?'':'disabled'}>Sdílet balík jídla</button>
    <p class="small">Po úspěšném odeslání se záznamy označí jako odeslané. Fotky zůstanou v telefonu, dokud záznam nesmažete.</p>`;
  el.querySelectorAll('[data-fm]').forEach(b=>b.onclick=()=>{foodExpMode=b.dataset.fm;renderFoodExport(el);});
  const btn=el.querySelector('#fshare');
  btn.onclick=async()=>{
    btn.disabled=true;btn.textContent='Připravuji balík…';
    try{
      const txt=foodReport(items);const files=[new File([txt],`${today()}_PK_jidlo.md`,{type:'text/markdown'})];
      for(const m of items){if(!m.photoId)continue;const b=await PDB.get(m.photoId);if(b)files.push(new File([b],m._file||photoName(m,0),{type:'image/jpeg'}));}
      if(navigator.canShare&&navigator.canShare({files})){
        await navigator.share({files,title:'PK jídelníček'});
        const sentAt=today();items.forEach(m=>{m.sent=true;m.sentDate=sentAt;});save();toast('Balík odeslán');
      }else{
        const a=document.createElement('a');a.href=URL.createObjectURL(files[0]);a.download=files[0].name;document.body.appendChild(a);a.click();a.remove();
        toast('Tady lze stáhnout jen text – fotky pošlete z iPhonu');
      }
    }catch(e){if(!(e&&e.name==='AbortError'))toast('Odeslání se nepodařilo');}
    renderFoodExport(el);
  };
}
