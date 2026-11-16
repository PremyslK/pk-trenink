// ---------- drawing helpers ----------
const S = (x,y)=>[x,y];
function pl(pts){return pts.filter(Boolean).map(p=>p.join(',')).join(' ');}
function side(o){
  const L=[],B=[];
  L.push(o.torso||[o.n,o.p]);
  L.push([o.p,o.k,o.a,o.t]);
  if(o.k2) B.push([o.p,o.k2,o.a2,o.t2]);
  if(o.e) L.push([o.s||o.n,o.e,o.w]);
  if(o.e2) B.push([o.s||o.n,o.e2,o.w2]);
  const db=[]; if(o.db){db.push(o.w); if(o.w2) db.push(o.w2);}
  return {h:o.h,L,B,db,extra:o.extra||[]};
}
function front(o){
  // o: h,n,p, arms:[[sh,e,w],[sh,e,w]], legs:[[...],[...]]
  const L=[[o.n,o.p],[S(97,46),S(123,46)]].concat(o.legs||[], o.arms||[]);
  const db=o.db?o.arms.map(a=>a[a.length-1]):[];
  return {h:o.h,L,B:o.back||[],db,extra:o.extra||[]};
}
function drawDb([x,y],cls){
  return `<g class="${cls}"><rect x="${x-7}" y="${y-2}" width="14" height="4" rx="1"/><rect x="${x-9}" y="${y-6}" width="5" height="12" rx="1.5"/><rect x="${x+4}" y="${y-6}" width="5" height="12" rx="1.5"/></g>`;
}
function drawPose(p,ghost){
  const c=ghost?'ghost':'body';
  let s='';
  p.B.forEach(l=>s+=`<polyline class="${c} back" points="${pl(l)}"/>`);
  p.L.forEach(l=>s+=`<polyline class="${c}" points="${pl(l)}"/>`);
  s+=`<circle class="${c} hd" cx="${p.h[0]}" cy="${p.h[1]}" r="7.5"/>`;
  p.db.forEach(w=>s+=drawDb(w,ghost?'wtg':'wt'));
  p.extra.forEach(e=>s+=e.replace(/CLS/g,ghost?'wtg':'wt'));
  return s;
}
let arrowId=0;
function drawArrow(d){
  // d: [x1,y1,cx,cy,x2,y2]
  const [x1,y1,cx,cy,x2,y2]=d;
  const ang=Math.atan2(y2-cy,x2-cx), L=8, W=4.5;
  const bx=x2-L*Math.cos(ang), by=y2-L*Math.sin(ang);
  const p1=[bx+W*Math.sin(ang),by-W*Math.cos(ang)], p2=[bx-W*Math.sin(ang),by+W*Math.cos(ang)];
  return `<path class="arr" d="M${x1},${y1} Q${cx},${cy} ${bx},${by}"/><polygon class="arrh" points="${x2},${y2} ${p1.join(',')} ${p2.join(',')}"/>`;
}
const ln=(x1,y1,x2,y2,c='eq')=>`<line class="${c}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
const floor=ln(20,141,200,141);
const cableTo=(px,py,hx,hy)=>`<circle class="eq" cx="${px}" cy="${py}" r="4" style="stroke-width:3"/><line x1="${px}" y1="${py}" x2="${hx}" y2="${hy}" style="stroke:var(--eq);stroke-width:1.6"/>`;
const label=(x,y,t)=>`<text class="lbl" x="${x}" y="${y}">${t}</text>`;

// standard front body parts
const FH=S(110,30),FN=S(110,42),FP=S(110,86);
const standLegs=[[S(104,88),S(103,113),S(102,138)],[S(116,88),S(117,113),S(118,138)]];

// ---------- exercise library ----------
const EX={
hack:{n:'Hacken dřep',view:'z boku',
  eq:ln(78,18,114,122)+ln(112,141,150,128)+floor,
  A:side({h:S(82,31),n:S(87,43),p:S(101,83),k:S(114,109),a:S(126,133),t:S(137,131),e:S(97,58),w:S(92,45)}),
  B:side({h:S(93,64),n:S(98,76),p:S(112,116),k:S(140,104),a:S(126,133),t:S(137,131),e:S(109,90),w:S(104,78)}),
  ar:[[66,46,62,70,74,96]],
  st:['Záda a ramena celou plochou na opěrce, chodidla na šířku pánve níže na plošině.','Pomalu dolů 2–3 s, do hloubky bez bolesti kolen a kyčle.','Vytlačit patami nahoru, kolena nahoře nezamykat.'],
  w:'Kyčel: jakmile se pánev na konci podsazuje nebo zatahá tříslo, zmenšit hloubku.'},
legpress:{n:'Leg press 45°',view:'z boku',
  eq:ln(40,70,72,120)+ln(72,120,100,122)+ln(95,132,165,62)+floor,
  A:side({h:S(46,68),n:S(54,80),p:S(78,116),k:S(98,98),a:S(118,80),t:S(124,71),e:S(68,100),w:S(80,110),extra:[ln(109,70,127,90)]}),
  B:side({h:S(46,68),n:S(54,80),p:S(78,116),k:S(80,88),a:S(100,98),t:S(107,89),e:S(68,100),w:S(80,110),extra:[ln(90,88,110,108)]}),
  ar:[[140,64,132,74,118,94]],
  st:['Hýždě a bedra přitisknuté k sedadlu, chodidla na šířku ramen uprostřed plošiny.','Spouštět pomalu, kolena směrem ke hrudníku jen tak hluboko, aby se pánev nezvedla.','Vytlačit, kolena nahoře nezamykat.'],
  w:'Kyčel: hloubku řídí tříslo. Bolest v třísle = menší rozsah nebo chodidla výš.'},
legext:{n:'Předkopávání na stroji',view:'z boku',
  eq:ln(80,100,118,100)+ln(80,100,76,48)+ln(84,100,84,141)+floor,
  A:side({h:S(85,40),n:S(87,52),p:S(93,96),k:S(119,96),a:S(122,124),t:S(130,127),e:S(98,76),w:S(110,94),extra:[`<circle class="eq" cx="126" cy="121" r="5"/>`]}),
  B:side({h:S(85,40),n:S(87,52),p:S(93,96),k:S(119,96),a:S(147,93),t:S(151,85),e:S(98,76),w:S(110,94),extra:[`<circle class="eq" cx="147" cy="99" r="5"/>`]}),
  ar:[[134,130,156,120,156,100]],
  st:['Kolena v ose otáčení stroje, opěrka nad kotníky.','Propnout nohy, nahoře 1 s výdrž.','Spouštět pomalu 2–3 s.'],
  w:'Kolena: vždy 1–2 opakování v rezervě, bez drop-setů.'},
curlseat:{n:'Zakopávání vsedě',view:'z boku',
  eq:ln(80,100,118,100)+ln(80,100,76,48)+ln(84,100,84,141)+ln(98,88,120,88)+floor,
  A:side({h:S(85,40),n:S(87,52),p:S(93,96),k:S(119,96),a:S(147,93),t:S(151,85),e:S(98,76),w:S(108,86),extra:[`<circle class="eq" cx="148" cy="100" r="5"/>`]}),
  B:side({h:S(85,40),n:S(87,52),p:S(93,96),k:S(119,96),a:S(110,123),t:S(117,128),e:S(98,76),w:S(108,86),extra:[`<circle class="eq" cx="104" cy="120" r="5"/>`]}),
  ar:[[158,104,152,130,120,134]],
  st:['Opěrku stehen pevně dotáhnout, kolena v ose stroje.','Ohnout nohy pod sedačku, 1 s výdrž.','Zpět pomalu 3 s.'],w:''},
abduct:{n:'Abdukce na stroji (unožování)',view:'zepředu',
  eq:ln(86,97,134,97)+ln(110,97,110,141)+floor,
  A:front({h:FH,n:FN,p:S(110,92),legs:[[S(104,94),S(100,104),S(100,132)],[S(116,94),S(120,104),S(120,132)]],arms:[[S(97,46),S(94,70),S(92,92)],[S(123,46),S(126,70),S(128,92)]],extra:[`<circle class="eq" cx="94" cy="104" r="4"/><circle class="eq" cx="126" cy="104" r="4"/>`]}),
  B:front({h:FH,n:FN,p:S(110,92),legs:[[S(104,94),S(84,104),S(88,132)],[S(116,94),S(136,104),S(132,132)]],arms:[[S(97,46),S(94,70),S(92,92)],[S(123,46),S(126,70),S(128,92)]],extra:[`<circle class="eq" cx="78" cy="104" r="4"/><circle class="eq" cx="142" cy="104" r="4"/>`]}),
  ar:[[74,118,66,110,68,96],[146,118,154,110,152,96]],
  st:['Sednout zpříma, opěrky z vnější strany kolen.','Roztáhnout kolena od sebe, 1 s výdrž.','Zpět pomalu, závaží nepouštět dolů.'],
  w:'Kyčel: posiluje stabilizátory kyčle, dělat lehce a plynule.'},
calf:{n:'Výpony na lýtka vestoje',view:'z boku',
  eq:`<rect class="eqf" x="114" y="128" width="40" height="13" rx="2"/>`+floor,
  A:side({h:S(110,30),n:S(110,42),p:S(110,84),k:S(111,110),a:S(109,135),t:S(123,129),e:S(116,60),w:S(126,66)}),
  B:side({h:S(112,20),n:S(112,32),p:S(112,74),k:S(113,100),a:S(113,122),t:S(125,129),e:S(118,50),w:S(126,58)}),
  ar:[[92,120,88,100,92,82]],
  st:['Přední část chodidla na hraně stupínku, paty volně dole.','Dole 2 s pauza v plném protažení.','Vytáhnout se na špičky co nejvýš, 1 s výdrž.'],w:''},
extrot:{n:'Rotace ven na kladce',view:'zepředu',
  eq:`<line class="eq" x1="172" y1="20" x2="172" y2="141"/>`+cableTo(166,72,118,72)+floor,
  A:front({h:FH,n:FN,p:FP,legs:standLegs,arms:[[S(97,46),S(97,70),S(118,72)],[S(123,46),S(125,66),S(126,86)]]}),
  B:front({h:FH,n:FN,p:FP,legs:standLegs,arms:[[S(97,46),S(97,70),S(76,66)],[S(123,46),S(125,66),S(126,86)]]}),
  ar:[[116,82,96,92,78,78]],
  st:['Kladka ve výšce lokte, stát bokem, loket u těla (lze vložit srolovaný ručník).','Otáčet předloktím ven, loket zůstává na místě.','Zpět pomalu. Lehce, jde o rozehřátí, ne o sílu.'],
  w:'Ramena: provádět na obou stranách, 2 × 15 na ruku.'},
dbpress:{n:'Tlaky s jednoručkami vsedě',view:'z boku',
  eq:ln(88,104,120,104)+ln(90,104,84,36)+ln(104,104,104,141)+floor,
  A:side({h:S(95,44),n:S(96,56),p:S(99,100),k:S(126,100),a:S(128,128),t:S(137,130),e:S(108,72),w:S(108,54),db:1}),
  B:side({h:S(95,44),n:S(96,56),p:S(99,100),k:S(126,100),a:S(128,128),t:S(137,130),e:S(103,38),w:S(103,18),db:1}),
  ar:[[124,58,128,40,118,22]],
  st:['Opěrka 75–80°, jednoručky neutrálním úchopem (dlaně proti sobě).','Lokty mírně před tělem, spouštět jen k uším.','Vytlačit nahoru, nahoře činky nesrážet.'],
  w:'Ramena: nespouštět hlouběji než k uším, žádné tlaky za hlavou.'},
incline:{n:'Šikmý tlak s jednoručkami',view:'z boku',
  eq:ln(70,92,118,120)+ln(108,120,108,141)+floor,
  A:side({h:S(70,77),n:S(79,85),p:S(112,110),k:S(137,108),a:S(140,136),t:S(149,138),e:S(72,106),w:S(86,90),db:1}),
  B:side({h:S(70,77),n:S(79,85),p:S(112,110),k:S(137,108),a:S(140,136),t:S(149,138),e:S(85,64),w:S(90,44),db:1}),
  ar:[[104,92,108,70,98,50]],
  st:['Lavice 30–45°, lopatky stažené vzad a dolů.','Neutrální úchop, spouštět k hornímu hrudníku.','Vytlačit nahoru nad ramena.'],
  w:'Ramena: lokty nespouštět hluboko pod úroveň lavice.'},
lateral:{n:'Upažování s jednoručkami',view:'zepředu',
  eq:floor,
  A:front({h:FH,n:FN,p:FP,legs:standLegs,arms:[[S(97,46),S(95,66),S(96,86)],[S(123,46),S(125,66),S(124,86)]],db:1}),
  B:front({h:FH,n:FN,p:FP,legs:standLegs,arms:[[S(97,46),S(78,50),S(60,54)],[S(123,46),S(142,50),S(160,54)]],db:1}),
  ar:[[84,92,58,86,54,64],[136,92,162,86,166,64]],
  st:['Mírný předklon, ruce asi 30° před tělem, lokty lehce pokrčené.','Zvedat do stran jen do výšky ramen, palce mírně nahoru.','Spouštět pomalu, bez švihu trupem.'],
  w:'Ramena: nikdy výš než ramena a nikdy „vylévání konvice“ (palce dolů).'},
frontcable:{n:'Předpažování na kladce',view:'z boku',
  eq:cableTo(82,136,114,82)+floor,
  A:side({h:S(110,30),n:S(110,42),p:S(110,84),k:S(111,110),a:S(110,136),t:S(121,138),e:S(112,62),w:S(114,82)}),
  B:side({h:S(110,30),n:S(110,42),p:S(110,84),k:S(111,110),a:S(110,136),t:S(121,138),e:S(130,46),w:S(150,46)}),
  ar:[[134,84,156,74,156,54]],
  st:['Zády ke spodní kladce, lano nebo rukojeť mezi nohama, neutrální úchop.','Zvednout paži před sebe jen do výšky ramen.','Spouštět pomalu.'],
  w:'Ramena: lehčí váha, nikdy nad výšku ramen.'},
reardb:{n:'Upažování v předklonu',view:'zepředu, v předklonu',
  eq:floor,
  A:front({h:S(110,40),n:S(110,50),p:S(110,80),legs:[[S(104,82),S(102,110),S(100,138)],[S(116,82),S(118,110),S(120,138)]],arms:[[S(97,52),S(98,74),S(99,94)],[S(123,52),S(122,74),S(121,94)]],db:1}),
  B:front({h:S(110,40),n:S(110,50),p:S(110,80),legs:[[S(104,82),S(102,110),S(100,138)],[S(116,82),S(118,110),S(120,138)]],arms:[[S(97,52),S(78,58),S(60,64)],[S(123,52),S(142,58),S(160,64)]],db:1}),
  ar:[[86,98,62,94,56,74],[134,98,158,94,164,74]],
  st:['Předklon asi 45°, záda rovná, kolena lehce pokrčená (nebo hrudník opřený o šikmou lavici).','Zvedat paže do stran, lokty mírně pokrčené.','Stlačit lopatky, spouštět pomalu.'],
  w:'Záda: při bolesti beder dělat s hrudníkem opřeným o lavici.'},
pulldown:{n:'Stahování horní kladky',view:'zepředu',
  eq:`<line x1="110" y1="2" x2="110" y2="12" style="stroke:var(--eq);stroke-width:1.6"/>`+ln(88,98,132,98)+ln(110,98,110,141)+floor,
  A:front({h:S(110,36),n:S(110,48),p:S(110,94),legs:[[S(104,96),S(98,104),S(98,134)],[S(116,96),S(122,104),S(122,134)]],arms:[[S(97,52),S(90,32),S(96,14)],[S(123,52),S(130,32),S(124,14)]],extra:[`<line class="eq" x1="94" y1="14" x2="126" y2="14" style="stroke-width:4"/>`]}),
  B:front({h:S(110,36),n:S(110,48),p:S(110,94),legs:[[S(104,96),S(98,104),S(98,134)],[S(116,96),S(122,104),S(122,134)]],arms:[[S(97,52),S(86,70),S(100,54)],[S(123,52),S(134,70),S(120,54)]],extra:[`<line class="eq" x1="98" y1="54" x2="122" y2="54" style="stroke-width:4"/>`]}),
  ar:[[78,22,72,42,80,60],[142,22,148,42,140,60]],
  st:['Rukojeť s neutrálním úchopem (dlaně proti sobě), trhačky na zápěstí.','Táhnout lokty dolů k bokům, hrudník mírně vpřed.','Nahoru pomalu do natažení.'],
  w:'Loket: trhačky a neutrální úchop odlehčí šlachám předloktí.'},
row:{n:'Seated cable row',view:'z boku',
  eq:ln(60,112,100,112)+ln(80,112,80,141)+ln(134,100,134,128)+cableTo(156,80,128,76)+floor,
  A:side({h:S(82,52),n:S(84,64),p:S(84,108),k:S(112,94),a:S(130,114),t:S(132,104),e:S(106,70),w:S(128,76)}),
  B:side({h:S(80,52),n:S(82,64),p:S(84,108),k:S(112,94),a:S(130,114),t:S(132,104),e:S(64,80),w:S(92,84)}),
  ar:[[124,90,110,98,96,94]],
  st:['Sednout zpříma, kolena mírně pokrčená, trup se nehoupe.','Neutrální rukojeť (V), trhačky. Přitáhnout k pupku, lokty podél těla.','Stlačit lopatky, vrátit pomalu.'],
  w:'Loket: trhačky a neutrální úchop.'},
facepull:{n:'Face pulls na kladce',view:'z boku',
  eq:cableTo(178,36,150,40)+`<line class="eq" x1="184" y1="12" x2="184" y2="141"/>`+floor,
  A:side({h:S(108,30),n:S(108,42),p:S(108,84),k:S(110,110),a:S(108,136),t:S(119,138),e:S(130,48),w:S(150,40)}),
  B:side({h:S(108,30),n:S(108,42),p:S(108,84),k:S(110,110),a:S(108,136),t:S(119,138),e:S(96,38),w:S(122,30)}),
  ar:[[150,26,138,18,124,22]],
  st:['Kladka ve výšce obličeje, lano, úchop palci dozadu.','Přitáhnout lano k očím, lokty vysoko a do stran.','Na konci rotace ven (ruce u spánků), vrátit pomalu.'],
  w:'Ramena: jeden z nejlepších cviků pro zdravá ramena.'},
hammer:{n:'Kladivové zdvihy',view:'z boku',
  eq:floor,
  A:side({h:S(110,30),n:S(110,42),p:S(110,84),k:S(111,110),a:S(110,136),t:S(121,138),e:S(111,62),w:S(113,82),extra:[`<rect class="CLS" x="110" y="74" width="6" height="16" rx="2"/>`]}),
  B:side({h:S(110,30),n:S(110,42),p:S(110,84),k:S(111,110),a:S(110,136),t:S(121,138),e:S(111,62),w:S(126,44),extra:[`<rect class="CLS" x="123" y="36" width="6" height="16" rx="2"/>`]}),
  ar:[[136,84,146,62,136,48]],
  st:['Jednoručky neutrálním úchopem (palce nahoru), lokty u těla.','Pokrčit paži, loket se nehýbe dopředu.','Spouštět pomalu. Alternativa: EZ osa.'],
  w:'Loket: místo rovné osy, která šlachy na vnitřní straně lokte dráždí nejvíc.'},
pushdown:{n:'Triceps – stahování kladky',view:'z boku',
  eq:cableTo(150,8,128,46)+`<line class="eq" x1="158" y1="4" x2="158" y2="141"/>`+floor,
  A:side({h:S(112,30),n:S(111,42),p:S(108,84),k:S(110,110),a:S(108,136),t:S(119,138),e:S(114,62),w:S(130,48)}),
  B:side({h:S(112,30),n:S(111,42),p:S(108,84),k:S(110,110),a:S(108,136),t:S(119,138),e:S(114,62),w:S(122,84)}),
  ar:[[140,52,146,70,132,86]],
  st:['Mírný předklon, lokty pevně u žeber.','Stáhnout lano dolů, dole roztáhnout konce od sebe.','Vrátit pomalu, lokty se nehýbou.'],w:''},
captain:{n:'Přednožování v opěře loktů',view:'z boku',
  eq:ln(92,28,92,92)+ln(98,64,130,64)+ln(126,64,126,141)+floor,
  A:side({h:S(100,22),n:S(100,34),p:S(100,78),k:S(102,105),a:S(102,132),t:S(110,136),e:S(102,58),w:S(124,58)}),
  B:side({h:S(100,22),n:S(100,34),p:S(102,78),k:S(126,72),a:S(122,100),t:S(130,102),e:S(102,58),w:S(124,58)}),
  ar:[[116,124,140,110,134,84]],
  st:['Předloktí na opěrkách, záda u opěry, nohy volně.','Přitáhnout kolena k hrudníku a pánev podsadit nahoru.','Spouštět pomalu, bez houpání.'],
  w:'Loket: na rozdíl od visu na hrazdě nezatěžuje úchop. Kyčel: při bolesti v třísle menší rozsah.'},
tread:{n:'Chůze do kopce / lehký běh',view:'z boku',
  eq:ln(40,140,180,126)+ln(170,126,176,60)+ln(160,64,182,58),
  A:null,
  B:side({h:S(112,24),n:S(112,36),p:S(110,78),k:S(124,102),a:S(122,128),t:S(132,128),k2:S(102,104),a2:S(90,130),t2:S(98,132),e:S(122,54),w:S(132,46),e2:S(102,56),w2:S(96,70)}),
  ar:[],
  st:['Pás ve sklonu 6–10 %, rychlost 5–6 km/h; nebo lehký běh.','Tempo, při kterém se dá mluvit.','25–35 min.'],w:''},
cablelat:{n:'Upažování na spodní kladce jednoruč',view:'zepředu',
  eq:`<line class="eq" x1="170" y1="18" x2="170" y2="141"/>`+cableTo(164,134,116,88)+floor,
  A:front({h:FH,n:FN,p:FP,legs:standLegs,arms:[[S(97,46),S(104,68),S(116,88)],[S(123,46),S(144,56),S(164,56)]]}),
  B:front({h:FH,n:FN,p:FP,legs:standLegs,arms:[[S(97,46),S(78,50),S(60,54)],[S(123,46),S(144,56),S(164,56)]]}),
  ar:[[104,98,64,96,58,66]],
  st:['Stát bokem ke kladce, druhou rukou se přidržet stroje.','Rukojeť začíná před tělem; zvedat do strany do výšky ramen.','Spouštět pomalu, kladka drží napětí i dole.'],
  w:'Ramena: ruka mírně před tělem, palec mírně nahoru, ne výš než ramena.'},
machcrunch:{n:'Zkracovačky na stroji',view:'z boku',
  eq:ln(82,108,120,108)+ln(100,108,100,141)+ln(84,108,80,40)+floor,
  A:side({h:S(92,46),n:S(93,58),p:S(96,104),k:S(124,102),a:S(126,130),t:S(135,132),e:S(106,70),w:S(100,52)}),
  B:side({torso:[S(122,72),S(110,84),S(96,104)],h:S(130,66),n:S(122,72),p:S(96,104),k:S(124,102),a:S(126,130),t:S(135,132),e:S(134,86),w:S(130,68)}),
  ar:[[108,40,130,40,140,56]],
  st:['Sednout, rukojeti u ramen, nohy pod opěrkou.','Stočit páteř: žebra k pánvi, nepředklánět se v kyčlích.','Vrátit pomalu.'],w:''},
benchcrunch:{n:'Zkracovačky na šikmé lavici se zátěží',view:'z boku',
  eq:ln(52,124,142,100)+ln(140,100,154,92)+ln(66,124,66,141)+ln(130,104,130,141)+floor,
  A:side({h:S(60,113),n:S(72,113),p:S(118,100),k:S(136,82),a:S(150,98),t:S(156,92),e:S(86,100),w:S(90,104),extra:[`<rect class="CLS" x="84" y="98" width="14" height="10" rx="2"/>`]}),
  B:side({torso:[S(100,76),S(108,90),S(118,100)],h:S(96,64),n:S(100,76),p:S(118,100),k:S(136,82),a:S(150,98),t:S(156,92),e:S(110,82),w:S(112,74),extra:[`<rect class="CLS" x="106" y="68" width="14" height="10" rx="2"/>`]}),
  ar:[[70,96,72,74,90,62]],
  st:['Chodidla zaháknutá, kotouč (10 kg) držet na hrudníku.','Stočit trup nahoru: nejdřív hlava a ramena, pak hrudník.','Vrátit pomalu, nepadat dolů.'],
  w:'Záda: nezvedat se švihem; jen do bodu, kde se páteř stáčí.'},
pallof:{n:'Pallof press',view:'shora',
  eq:`<line class="eq" x1="180" y1="20" x2="180" y2="120"/>`+cableTo(172,70,110,82),
  A:{h:S(110,64),L:[[S(88,64),S(132,64)],[S(88,64),S(98,82),S(110,82)],[S(132,64),S(122,82),S(110,82)]],B:[],db:[],extra:[]},
  B:{h:S(110,64),L:[[S(88,64),S(132,64)],[S(88,64),S(108,118)],[S(132,64),S(112,118)]],B:[],db:[],extra:[]},
  ar:[[140,88,144,104,128,118]],
  st:['Stát bokem ke kladce ve výšce hrudníku, mírný podřep.','Vytlačit rukojeť přímo před sebe, 2 s výdrž.','Trup se nesmí otočit ke kladce; vrátit k hrudníku.'],w:''},
sideplank:{n:'Boční plank',view:'zepředu',
  eq:floor,
  A:null,
  B:{h:S(64,90),L:[[S(74,98),S(120,116),S(172,136)],[S(74,98),S(72,124),S(92,138)],[S(76,98),S(98,96),S(116,112)]],B:[],db:[],extra:[]},
  ar:[[124,132,124,124,124,110]],
  st:['Opřít se o předloktí, loket pod ramenem.','Zvednout boky do rovné linie hlava–pánev–kotníky.','Držet 30 s, dýchat. Pak druhá strana.'],
  w:'Ramena: loket přesně pod ramenem.'},
rdl:{n:'Rumunský mrtvý tah',view:'z boku',
  eq:floor,
  A:side({h:S(110,28),n:S(110,40),p:S(110,82),k:S(112,110),a:S(110,136),t:S(121,138),e:S(112,60),w:S(114,80),db:1}),
  B:side({h:S(144,56),n:S(134,62),p:S(92,80),k:S(102,108),a:S(104,136),t:S(115,138),e:S(134,84),w:S(132,104),db:1}),
  ar:[[86,52,72,62,78,82]],
  st:['Jednoručky nebo osa u stehen, kolena lehce pokrčená.','Posouvat pánev dozadu, záda rovná, činka těsně u nohou.','Až ucítíte tah v zadní straně stehen, zpět nahoru zatnutím hýždí. Začít lehce.'],
  w:'Záda: rovná záda, nejít hlouběji, než dovolí zadní strana stehen.'},
bulgarian:{n:'Bulharské výpady',view:'z boku',
  eq:`<rect class="eqf" x="40" y="96" width="44" height="8" rx="2"/>`+ln(48,104,48,141)+ln(76,104,76,141)+floor,
  A:side({h:S(104,24),n:S(104,36),p:S(104,78),k:S(116,106),a:S(118,136),t:S(128,138),k2:S(92,104),a2:S(74,98),t2:S(66,96),e:S(106,58),w:S(107,78),db:1}),
  B:side({h:S(100,44),n:S(100,56),p:S(100,98),k:S(124,110),a:S(118,136),t:S(128,138),k2:S(90,126),a2:S(74,100),t2:S(66,96),e:S(102,78),w:S(103,98),db:1}),
  ar:[[86,42,82,60,88,80]],
  st:['Zadní noha nártem na lavici, přední chodidlo asi krok před lavicí.','Klesat svisle dolů, přední koleno nad chodidlem.','Vytlačit přes patu přední nohy. Nejdřív bez zátěže.'],
  w:'Kyčel: při bolesti v třísle nahradit leg pressem na jednu nohu.'},
lyingcurl:{n:'Zakopávání vleže',view:'z boku',
  eq:ln(36,106,132,106)+ln(56,106,56,141)+ln(116,106,116,141)+floor,
  A:side({h:S(40,92),n:S(52,98),p:S(96,98),k:S(124,98),a:S(152,98),t:S(158,104),e:S(56,110),w:S(44,114),extra:[`<circle class="eq" cx="152" cy="92" r="5"/>`]}),
  B:side({h:S(40,92),n:S(52,98),p:S(96,98),k:S(124,98),a:S(112,72),t:S(104,68),e:S(56,110),w:S(44,114),extra:[`<circle class="eq" cx="118" cy="70" r="5"/>`]}),
  ar:[[162,90,158,62,128,62]],
  st:['Lehnout, kolena těsně za hranou lavice, opěrka nad patami.','Pánev přitisknutá k lavici, paty přitáhnout k hýždím.','Spouštět pomalu 3 s.'],
  w:'Záda: neprohýbat se v bedrech.'},
landmine:{n:'Landmine press',view:'z boku',
  eq:`<circle class="eqf" cx="36" cy="138" r="4"/>`+floor,
  A:side({h:S(112,30),n:S(112,42),p:S(108,84),k:S(116,110),a:S(118,136),t:S(128,138),k2:S(102,110),a2:S(94,136),t2:S(104,138),e:S(118,64),w:S(124,46),extra:[`<line x1="36" y1="138" x2="128" y2="44" style="stroke:var(--ghost);stroke-width:4;stroke-linecap:round"/>`]}),
  B:side({h:S(114,30),n:S(114,42),p:S(108,84),k:S(116,110),a:S(118,136),t:S(128,138),k2:S(102,110),a2:S(94,136),t2:S(104,138),e:S(130,34),w:S(148,24),extra:[`<line x1="36" y1="138" x2="152" y2="22" style="stroke:var(--ink);stroke-width:4;stroke-linecap:round"/>`]}),
  ar:[[140,58,152,46,152,34]],
  st:['Konec osy ukotvený v rohu nebo v landmine držáku, druhý konec u ramene.','Mírný výpadový postoj, trup zpevněný.','Vytlačit osu šikmo nahoru a dopředu, spouštět pomalu.'],
  w:'Ramena: nejšetrnější tlak pro operovaná ramena. Alternativa: tlaky na stroji neutrálním úchopem.'},
bench:{n:'Bench press',view:'z boku',
  eq:ln(58,106,138,106)+ln(74,106,74,141)+ln(126,106,126,141)+floor,
  A:side({h:S(64,95),n:S(76,99),p:S(120,99),k:S(144,98),a:S(148,136),t:S(157,138),e:S(84,112),w:S(88,90),extra:[`<circle class="CLS" cx="88" cy="88" r="9"/>`]}),
  B:side({h:S(64,95),n:S(76,99),p:S(120,99),k:S(144,98),a:S(148,136),t:S(157,138),e:S(82,76),w:S(84,54),extra:[`<circle class="CLS" cx="84" cy="52" r="9"/>`]}),
  ar:[[104,86,108,68,98,54]],
  st:['Lopatky stažené, chodidla pevně na zemi, střední šíře úchopu.','Spouštět pod kontrolou ke spodní části hrudníku, lokty asi 45° od těla.','Vytlačit nahoru. 3 série stačí na udržení síly.'],
  w:'Ramena: lokty nespouštět hluboko pod úroveň těla; při potížích jednoručky neutrálním úchopem.'},
fly:{n:'Rozpažování (butterfly)',view:'zepředu',
  eq:ln(86,96,134,96)+ln(110,96,110,141)+floor,
  A:front({h:S(110,34),n:S(110,46),p:S(110,92),legs:[[S(104,94),S(98,104),S(98,134)],[S(116,94),S(122,104),S(122,134)]],arms:[[S(97,50),S(76,54),S(66,40)],[S(123,50),S(144,54),S(154,40)]]}),
  B:front({h:S(110,34),n:S(110,46),p:S(110,92),legs:[[S(104,94),S(98,104),S(98,134)],[S(116,94),S(122,104),S(122,134)]],arms:[[S(97,50),S(90,62),S(106,52)],[S(123,50),S(130,62),S(114,52)]]}),
  ar:[[62,62,74,78,94,70],[158,62,146,78,126,70]],
  st:['Sedadlo tak, aby rukojeti byly ve výšce hrudníku.','Spojit ruce před tělem, lokty mírně pokrčené.','Vracet pomalu jen do linie těla, ne za ni.'],
  w:'Ramena: nerozpažovat za linii těla.'},
revfly:{n:'Zadní ramena na stroji',view:'zezadu',
  eq:ln(86,96,134,96)+ln(110,96,110,141)+floor,
  A:front({h:S(110,34),n:S(110,46),p:S(110,92),legs:[[S(104,94),S(98,104),S(98,134)],[S(116,94),S(122,104),S(122,134)]],arms:[[S(97,50),S(96,58),S(106,52)],[S(123,50),S(124,58),S(114,52)]]}),
  B:front({h:S(110,34),n:S(110,46),p:S(110,92),legs:[[S(104,94),S(98,104),S(98,134)],[S(116,94),S(122,104),S(122,134)]],arms:[[S(97,50),S(76,52),S(56,54)],[S(123,50),S(144,52),S(164,54)]]}),
  ar:[[92,70,72,74,58,64],[128,70,148,74,162,64]],
  st:['Sednout čelem ke stroji, hrudník na opěrce.','Roztáhnout paže dozadu do stran, lokty mírně pokrčené.','Stlačit lopatky, vracet pomalu.'],w:''},
bike:{n:'Kolo',view:'z boku',
  eq:`<circle class="eq" cx="70" cy="118" r="20"/><circle class="eq" cx="150" cy="118" r="20"/>`+ln(70,118,100,84)+ln(100,84,132,84)+ln(132,84,150,118)+ln(100,84,104,118)+ln(104,118,70,118)+ln(132,84,138,62),
  A:null,
  B:side({h:S(116,30),n:S(114,42),p:S(98,78),k:S(116,96),a:S(108,122),t:S(116,126),k2:S(112,90),a2:S(100,108),t2:S(108,112),e:S(126,54),w:S(138,62)}),
  ar:[],
  st:['Lehce 30–45 minut, tempo, při kterém se dá mluvit.','Venku nebo na rotopedu.','Pak znovu od Dne 1.'],w:''},
// --- elbow rehab ---
iso:{n:'Izometrická výdrž zápěstí',view:'z boku, detail',
  eq:`<rect class="eqf" x="30" y="92" width="100" height="18" rx="3"/>`,
  A:null,
  B:{h:null,L:[[S(40,86),S(118,86)],[S(118,86),S(134,86)]],B:[],db:[S(140,86)],extra:[label(42,128,'předloktí na stehně, dlaň nahoru')]},
  ar:[],
  st:['Předloktí na stehně nebo stole, zápěstí přesahuje okraj, dlaň nahoru.','Držet jednoručku se zápěstím v rovině, nehýbat.','5 × 30–45 s. Hodí se ve dnech, kdy loket bolí víc.'],
  w:'Bolest během výdrže do 3 z 10 je v pořádku.'},
ecc:{n:'Pomalé spouštění zápěstí (excentrická flexe)',view:'z boku, detail',
  eq:`<rect class="eqf" x="30" y="92" width="100" height="18" rx="3"/>`,
  A:{h:null,L:[[S(40,86),S(118,86)],[S(118,86),S(130,72)]],B:[],db:[S(133,68)],extra:[]},
  B:{h:null,L:[[S(40,86),S(118,86)],[S(118,86),S(128,102)]],B:[],db:[S(131,106)],extra:[label(30,128,'dolů pomalu 3–4 s, nahoru s pomocí')]},
  ar:[[150,64,160,84,146,104]],
  st:['Předloktí na stehně, dlaň nahoru, jednoručka 2–4 kg.','Nahoru zvednout s pomocí druhé ruky.','Spouštět jen pracující rukou pomalu 3–4 s. 3 × 15.'],
  w:'Když 3 × 15 půjde bez bolesti, přidat 0,5–1 kg. Druhý den ráno nesmí loket bolet víc.'},
pron:{n:'Pronace s kladivem',view:'zepředu, detail',
  eq:`<rect class="eqf" x="30" y="92" width="100" height="18" rx="3"/>`,
  A:{h:null,L:[[S(40,86),S(112,86)],[S(118,86),S(118,48)]],B:[],db:[],extra:[`<rect class="CLS" x="110" y="40" width="16" height="9" rx="2"/>`,`<circle class="CLS" cx="118" cy="86" r="6"/>`]},
  B:{h:null,L:[[S(40,86),S(112,86)],[S(118,86),S(154,86)]],B:[],db:[],extra:[`<rect class="CLS" x="152" y="78" width="9" height="16" rx="2"/>`,`<circle class="CLS" cx="118" cy="86" r="6"/>`]},
  ar:[[130,46,152,52,154,72]],
  st:['Předloktí na stehně, kladivo (nebo jednoručka držená za jeden konec) svisle nahoru.','Pomalu otáčet dlaní dolů, až je kladivo vodorovně.','Vrátit pomalu. 3 × 12–15.'],w:''},
stretch:{n:'Protažení flexorů zápěstí',view:'z boku',
  eq:floor,
  A:null,
  B:side({h:S(90,30),n:S(90,42),p:S(90,84),k:S(91,110),a:S(90,136),t:S(101,138),e:S(118,46),w:S(146,46),e2:S(112,64),w2:S(146,36),extra:[`<polyline class="body" points="146,46 148,30"/>`,label(118,22,'prsty tahat k sobě')]}),
  ar:[[162,24,166,32,156,36]],
  st:['Paži natáhnout před sebe, loket propnutý, dlaň od sebe, prsty nahoru.','Druhou rukou jemně táhnout prsty k sobě.','3 × 30 s po tréninku. Jen mírný tah, žádná bolest.'],
  w:'Protahování je doplněk; hlavní léčbou je postupné zatěžování (cviky výše).'}
};

function svgFor(ex){
  let s=`<svg viewBox="0 0 220 150" role="img" aria-label="${ex.n}: schematický obrázek pohybu">`;
  s+=ex.eq||'';
  if(ex.A) s+=drawPose(ex.A,true);
  if(ex.B) s+=drawPose(ex.B,false);
  (ex.ar||[]).forEach(a=>s+=drawArrow(a));
  return s+'</svg>';
}
// remove head where h is null
const _drawPose=drawPose;
drawPose=function(p,g){ if(p.h) return _drawPose(p,g); const c=g?'ghost':'body'; let s='';
  p.L.forEach(l=>s+=`<polyline class="${c}" points="${pl(l)}"/>`);
  p.db.forEach(w=>s+=drawDb(w,g?'wtg':'wt')); p.extra.forEach(e=>s+=e.replace(/CLS/g,g?'wtg':'wt')); return s; };

const DAYS=[
 {id:'den-1',tab:'Nohy A',t:'Den 1 – Nohy A',d:'Přední strana stehen, těžce. Rozehřátí: 8 min chůze + 4 min lehkého běhu.',
  x:[['hack','3 × 6–10'],['legpress','4 × 8–12'],['legext','3 × 10–15'],['curlseat','2 × 10–12'],['abduct','2 × 15'],['calf','4 × 10–15']]},
 {id:'den-2',tab:'Ramena A',t:'Den 2 – Ramena A',d:'Síla a přední ramena. Začít rotací ven na obou stranách.',
  x:[['extrot','2 × 15 / ruka'],['dbpress','4 × 6–10'],['incline','3 × 8–10'],['lateral','4 × 12–15'],['frontcable','3 × 10–12'],['reardb','3 × 12–15']]},
 {id:'den-3',tab:'Záda + paže',t:'Den 3 – Záda a paže',d:'Udržovací den. Při tazích trhačky a neutrální úchop. Na konci rehabilitace lokte.',
  x:[['pulldown','3 × 8–12'],['row','3 × 8–12'],['facepull','3 × 12–15'],['hammer','3 × 10'],['pushdown','3 × 10'],['captain','3 × 10–15'],['ecc','3 × 15'],['pron','3 × 12–15']]},
 {id:'den-4',tab:'Kondice',t:'Den 4 – Kondice a břicho',d:'Lehký den bez těžkých vah.',
  x:[['tread','25–35 min'],['cablelat','3 × 15'],['machcrunch','3 × 10–12'],['benchcrunch','2 × 10–12'],['pallof','3 × 10 / strana'],['sideplank','2 × 30 s / strana']]},
 {id:'den-5',tab:'Nohy B',t:'Den 5 – Nohy B',d:'Hýždě, zadní strana stehen a objem.',
  x:[['rdl','3 × 8–10'],['bulgarian','3 × 8–12 / noha'],['lyingcurl','3 × 10–12'],['legpress','3 × 12–15 lehčí'],['abduct','2 × 15'],['calf','3 × 12–15']]},
 {id:'den-6',tab:'Ramena B',t:'Den 6 – Ramena B a hrudník',d:'Objem pro ramena, hrudník jen na udržení. Na konci rehabilitace lokte.',
  x:[['extrot','2 × 15 / ruka'],['landmine','3 × 8–12'],['cablelat','4 × 12–15'],['bench','3 × 6–8'],['fly','2 × 10–12'],['revfly','3 × 12–15'],['ecc','3 × 15'],['pron','3 × 12–15']]},
 {id:'den-7',tab:'Kolo',t:'Den 7 – Kolo nebo volno',d:'Regenerace. Podle únavy lehké kolo, nebo úplné volno.',
  x:[['bike','30–45 min']]},
 {id:'loket',tab:'Loket',t:'Rehabilitace pravého lokte',d:'Bolest na vnitřní straně lokte při tahu. Základem je postupné zatěžování šlachy; protažení je doplněk. Ve Dni 3 a 6, případně i doma. Bolest během cvičení do 3 z 10 je v pořádku, druhý den ráno nesmí být horší. Když se do 8–12 týdnů nezlepší nebo začnou brnět prsty, k ortopedovi nebo fyzioterapeutovi.',
  x:[['iso','5 × 30–45 s'],['ecc','3 × 15'],['pron','3 × 12–15'],['stretch','3 × 30 s']]}
];