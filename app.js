/* Расписание пар — © 2025 */
'use strict';

const DAYS = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
const DS   = {Понедельник:'Пн',Вторник:'Вт',Среда:'Ср',Четверг:'Чт',Пятница:'Пт',Суббота:'Сб'};
const DAY_JS = {0:'Воскресенье',1:'Понедельник',2:'Вторник',3:'Среда',4:'Четверг',5:'Пятница',6:'Суббота'};

// Типы занятий — добавлен КРП
const TTAG = {лек:'tt-l', пр:'tt-p', лаб:'tt-b', крп:'tt-k'};
const TWRD = {лек:'Лекция', пр:'Практика', лаб:'Лаб', крп:'КРП'};

// Времена пар
const PARA_TIMES = [
  null,
  {s:'08:30', e:'09:50'},
  {s:'10:00', e:'11:20'},
  {s:'11:30', e:'12:50'},
  {s:'13:00', e:'14:20'},
  {s:'14:30', e:'15:50'},
  {s:'16:00', e:'17:20'},
];

const ACCENTS = [
  {r:0,  g:122,b:255, name:'Синий'},
  {r:88, g:86, b:214, name:'Фиолет'},
  {r:255,g:45, b:85,  name:'Розовый'},
  {r:52, g:199,b:89,  name:'Зелёный'},
  {r:255,g:149,b:0,   name:'Оранж'},
  {r:50, g:173,b:230, name:'Голубой'},
];

let selGroup=null, selWeek='odd', selDay=null, dark=false, cpOpen=false;
let selInstitute=null, selCourse=null;

const $=id=>document.getElementById(id);
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function ls(k,v){try{localStorage.setItem('sp4_'+k,v)}catch(e){}}
function lg(k){try{return localStorage.getItem('sp4_'+k)}catch(e){return null}}
function bounce(el){if(!el)return;el.style.transform='scale(.82)';setTimeout(()=>{el.style.transform=''},200)}

// ── Определение недели ────────────────────────────
// Нечётная/чётная считается от начала учебного года (первый понедельник сентября)
function getCurrentWeek(){
  const now = new Date();
  // Первый понедельник сентября текущего учебного года
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const sep1 = new Date(year, 8, 1); // 1 сентября
  const day = sep1.getDay();
  const firstMon = new Date(sep1);
  firstMon.setDate(sep1.getDate() + (day === 1 ? 0 : day === 0 ? 1 : 8 - day));
  const diffMs = now - firstMon;
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  return diffWeeks % 2 === 0 ? 'odd' : 'even'; // 0-я неделя = нечётная
}

// ── Текущая пара ──────────────────────────────────
function getCurrentParaIndex(){
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const total = h * 60 + m;
  for(let i=1; i<PARA_TIMES.length; i++){
    const pt = PARA_TIMES[i];
    if(!pt) continue;
    const [sh,sm] = pt.s.split(':').map(Number);
    const [eh,em] = pt.e.split(':').map(Number);
    if(total >= sh*60+sm && total <= eh*60+em) return i;
  }
  return -1;
}

function getTodayName(){
  return DAY_JS[new Date().getDay()] || null;
}

// ── Theme ─────────────────────────────────────────
function setDark(v){
  dark=v;
  document.body.toggleAttribute('data-dark',dark);
  document.documentElement.style.background = dark ? '#06060b' : '#eef0f6';
  $('btn-theme').querySelector('i').className=dark?'fa-solid fa-sun':'fa-solid fa-moon';
  ls('dark',dark?'1':'0');
}
$('btn-theme').onclick=function(){setDark(!dark);bounce(this)};

// ── Accent ────────────────────────────────────────
function applyAccent(c){
  document.documentElement.style.setProperty('--acc',`${c.r},${c.g},${c.b}`);
}
const swBox=$('swatches');
ACCENTS.forEach((c,i)=>{
  const el=document.createElement('button');
  el.className='sw g';
  el.style.cssText=`background:rgb(${c.r},${c.g},${c.b});box-shadow:0 3px 10px rgba(${c.r},${c.g},${c.b},.5)`;
  el.title=c.name;
  el.onclick=()=>{
    swBox.querySelectorAll('.sw').forEach(s=>s.classList.remove('on'));
    el.classList.add('on');applyAccent(c);ls('acc',String(i));bounce(el);
    // обновляем day-slider цвет
    document.querySelectorAll('.day-slider').forEach(ds=>{
      ds.style.background=`rgba(${c.r},${c.g},${c.b},1)`;
    });
  };
  swBox.appendChild(el);
});
$('btn-color').onclick=function(e){
  e.stopPropagation();cpOpen=!cpOpen;$('cpanel').classList.toggle('open',cpOpen);bounce(this);
};
document.addEventListener('click',()=>{cpOpen=false;$('cpanel').classList.remove('open')});
$('cpanel').addEventListener('click',e=>e.stopPropagation());

// ── Nav ───────────────────────────────────────────
function showView(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('on'));
  document.querySelectorAll('.db').forEach(b=>b.classList.remove('on'));
  $(id).classList.add('on');
  const db=document.querySelector(`.db[data-v="${id}"]`);
  if(db)db.classList.add('on');
  $('page').scrollTop=0;
  ls('view',id);
  const showBack=(id==='view-sched'&&selGroup);
  $('btn-back').style.display=showBack?'flex':'none';
  // nav title: при расписании показываем группу текстом
  const titleEl=$('nav-title');
  if(id==='view-sched'&&selGroup){
    titleEl.style.cssText='font-size:15px;font-weight:800;color:var(--t1);letter-spacing:-.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    titleEl.textContent=getGroupLabel();
  } else {
    titleEl.style.cssText='';
    titleEl.textContent='Xoras';
  }
  requestAnimationFrame(()=>requestAnimationFrame(updateSlider));
}
function getGroupLabel(){
  const g=D.groups.find(x=>x.id===selGroup);
  return g?`${g.num} · ${g.dept}`:'Xoras';
}
function goHome(){ showView('view-home'); }
document.querySelectorAll('.db').forEach(b=>{
  b.onclick=()=>{showView(b.dataset.v);bounce(b)};
});

// ── Онбординг: институты ──────────────────────────
function buildGroups(){
  // если институт и курс уже выбраны — показываем группы
  if(selInstitute && selCourse){
    buildGroupsFiltered();
    return;
  }
  // иначе показываем выбор института
  buildInstitutes();
}

function buildInstitutes(){
  const wrap=$('groups-wrap');wrap.innerHTML='';
  const institutes=[...new Set(D.groups.map(g=>g.institute))].sort();
  const sec=document.createElement('div');
  sec.className='dept-sec';
  sec.innerHTML=`<div class="dept-lbl">Выберите институт</div><div class="group-row" style="flex-direction:column;gap:10px"></div>`;
  const row=sec.querySelector('.group-row');
  institutes.forEach(inst=>{
    const btn=document.createElement('button');
    btn.className='gcard g';
    btn.style.cssText='width:100%;text-align:left;padding:14px 20px;border-radius:16px;font-size:15px';
    btn.textContent=inst;
    btn.onclick=()=>{
      selInstitute=inst;ls('institute',inst);
      bounce(btn);
      buildCourses();
    };
    row.appendChild(btn);
  });
  wrap.appendChild(sec);
  $('hero-sub').textContent='Выберите институт';
}

function buildCourses(){
  const wrap=$('groups-wrap');wrap.innerHTML='';
  const courses=[...new Set(D.groups.filter(g=>g.institute===selInstitute).map(g=>g.course))].sort();
  const sec=document.createElement('div');
  sec.className='dept-sec';
  sec.innerHTML=`<div class="dept-lbl">Выберите курс</div><div class="group-row"></div>`;
  const row=sec.querySelector('.group-row');
  courses.forEach(course=>{
    const btn=document.createElement('button');
    btn.className='gcard g';
    btn.textContent=course+' курс';
    btn.onclick=()=>{
      selCourse=course;ls('course',course);
      bounce(btn);
      buildGroupsFiltered();
    };
    row.appendChild(btn);
  });
  // кнопка назад
  const back=document.createElement('button');
  back.className='gcard g';back.style.cssText='margin-top:10px;width:100%;text-align:center';
  back.innerHTML='← Назад';
  back.onclick=()=>{selInstitute=null;ls('institute','');buildInstitutes();};
  wrap.appendChild(sec);
  wrap.appendChild(back);
  $('hero-sub').textContent=selInstitute+' · Выберите курс';
}

function buildGroupsFiltered(){
  const wrap=$('groups-wrap');wrap.innerHTML='';
  const filtered=D.groups.filter(g=>g.institute===selInstitute&&g.course===selCourse);
  const byDept={};
  filtered.forEach(g=>{(byDept[g.dept]||(byDept[g.dept]=[])).push(g)});
  Object.entries(byDept).forEach(([dept,gs])=>{
    const sec=document.createElement('div');
    sec.className='dept-sec';
    sec.innerHTML=`<div class="dept-lbl">${esc(dept)}</div><div class="group-row"></div>`;
    const row=sec.querySelector('.group-row');
    gs.forEach(g=>{
      const btn=document.createElement('button');
      btn.className='gcard g';btn.textContent=g.num;btn.dataset.id=g.id;
      btn.onclick=()=>{selectGroup(g.id,btn);bounce(btn)};
      row.appendChild(btn);
    });
    wrap.appendChild(sec);
  });
  // кнопка назад
  const back=document.createElement('button');
  back.className='gcard g';back.style.cssText='margin-top:10px;width:100%;text-align:center';
  back.innerHTML='← Назад';
  back.onclick=()=>{selCourse=null;ls('course','');buildCourses();};
  wrap.appendChild(back);
  $('hero-sub').textContent=selInstitute+' · '+selCourse+' курс';
}

// ── Сброс фильтров ────────────────────────────────
function resetSelection(){
  selGroup=null;selInstitute=null;selCourse=null;selDay=null;
  ls('group','');ls('institute','');ls('course','');ls('day','');
  showView('view-home');
  buildGroups();
  showToast('Выбор сброшен');
}

function selectGroup(id,btnEl){
  document.querySelectorAll('.gcard').forEach(c=>c.classList.remove('on'));
  btnEl.classList.add('on');selGroup=id;ls('group',id);
  const gSched=D.schedule[id]||{};
  const avail=DAYS.filter(d=>(gSched[d]||[]).some(s=>s[selWeek]?.length));
  // выбираем сегодняшний день если есть пары, иначе первый доступный
  const today=getTodayName();
  selDay=(today&&avail.includes(today))?today:(avail[0]||null);
  ls('day',selDay||'');
  buildDayTabs();renderSchedule();
  showView('view-sched');
}

// ── Week toggle ───────────────────────────────────
function updateWeekSlider(){
  const bar=document.querySelector('.week-bar');
  const slider=bar&&bar.querySelector('.week-slider');
  const active=bar&&bar.querySelector('.wt.on');
  if(!bar||!slider||!active)return;
  const br=bar.getBoundingClientRect();
  const ar=active.getBoundingClientRect();
  slider.style.transform=`translateX(${ar.left-br.left}px)`;
  slider.style.width=`${ar.width}px`;
}

document.querySelectorAll('.wt').forEach(b=>{
  b.onclick=()=>{
    document.querySelectorAll('.wt').forEach(x=>x.classList.remove('on'));
    b.classList.add('on');selWeek=b.dataset.w;ls('week',selWeek);
    if(selGroup){
      const gSched=D.schedule[selGroup]||{};
      const avail=DAYS.filter(d=>(gSched[d]||[]).some(s=>s[selWeek]?.length));
      if(!avail.includes(selDay))selDay=avail[0]||null;
      buildDayTabs();renderSchedule();
    }
    bounce(b);
    requestAnimationFrame(()=>requestAnimationFrame(updateWeekSlider));
  };
});

// ── Day tabs ──────────────────────────────────────
window._updateDaySlider=function(){
  const bar=document.querySelector('.day-tabs');
  const active=bar&&bar.querySelector('.daytab.on');
  if(!bar||!active)return;
  const slider=bar.querySelector('.day-slider');
  if(!slider)return;
  const br=bar.getBoundingClientRect();
  const ar=active.getBoundingClientRect();
  slider.style.transform=`translateX(${ar.left-br.left}px)`;
  slider.style.width=`${ar.width}px`;
  // scroll активной кнопки в видимую зону
  active.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});
};

document.addEventListener('click',e=>{
  if(e.target.closest('.daytab')){
    requestAnimationFrame(()=>requestAnimationFrame(window._updateDaySlider));
  }
});

function getAvailDays(){
  if(!selGroup) return [];
  const gSched=D.schedule[selGroup]||{};
  return DAYS.filter(d=>(gSched[d]||[]).some(s=>s[selWeek]?.length));
}

function switchDay(day){
  if(!day||day===selDay)return;
  selDay=day;ls('day',day);
  document.querySelectorAll('.daytab').forEach(t=>t.classList.toggle('on',t.dataset.day===day));
  renderSchedule();
  $('page').scrollTop=0;
  requestAnimationFrame(()=>requestAnimationFrame(window._updateDaySlider));
}

function buildDayTabs(){
  const bar=$('day-tabs');
  bar.innerHTML='';
  const ds=document.createElement('div');
  ds.className='day-slider';
  bar.prepend(ds);
  if(!selGroup)return;
  const today=getTodayName();
  getAvailDays().forEach(day=>{
    const btn=document.createElement('button');
    const isToday=(day===today);
    btn.className='daytab'+(day===selDay?' on':'');
    btn.dataset.day=day;
    btn.title=day;
    btn.innerHTML=`${DS[day]||day}${isToday?'<span class="today-dot"></span>':''}`;
    btn.onclick=()=>{ switchDay(day); bounce(btn); };
    bar.appendChild(btn);
  });
  setTimeout(()=>{ if(window._updateDaySlider) window._updateDaySlider(); },50);
}

// ── Swipe между днями ─────────────────────────────
(function initSwipe(){
  const page=$('page');
  if(!page)return;
  let tx=0,ty=0,swiping=false;
  page.addEventListener('touchstart',e=>{
    // не свайпаем если касание внутри горизонтального скролла (day-tabs)
    if(e.target.closest('.day-scroll-wrap'))return;
    tx=e.touches[0].clientX;
    ty=e.touches[0].clientY;
    swiping=true;
  },{passive:true});
  page.addEventListener('touchend',e=>{
    if(!swiping)return;
    swiping=false;
    const dx=e.changedTouches[0].clientX-tx;
    const dy=e.changedTouches[0].clientY-ty;
    // свайп только на вкладке расписания и только горизонтальный
    const viewSched=$('view-sched');
    if(!viewSched||!viewSched.classList.contains('on'))return;
    if(Math.abs(dx)<50||Math.abs(dy)>Math.abs(dx))return;
    const avail=getAvailDays();
    const idx=avail.indexOf(selDay);
    if(dx<0&&idx<avail.length-1) switchDay(avail[idx+1]); // свайп влево → следующий день
    if(dx>0&&idx>0)               switchDay(avail[idx-1]); // свайп вправо → предыдущий день
  },{passive:true});
})();

// ── Render schedule ───────────────────────────────
function renderSchedule(){
  const cont=$('sched-out');
  if(!selGroup||!selDay){
    cont.innerHTML=`<div class="empty"><div class="empty-ico">📅</div>Выбери группу в разделе «Группы»</div>`;
    return;
  }
  const gSched=D.schedule[selGroup];
  const slots=(gSched?.[selDay]||[]).filter(s=>s[selWeek]?.length);
  if(!slots.length){
    cont.innerHTML=`<div class="empty"><div class="empty-ico">🎉</div>В ${selDay} занятий нет</div>`;
    return;
  }

  const today=getTodayName();
  const isToday=(selDay===today);
  const currentPara=isToday?getCurrentParaIndex():-1;

  // Ближайшая пара (следующая после текущей или первая)
  let nextPara=-1;
  if(isToday){
    const now=new Date();
    const total=now.getHours()*60+now.getMinutes();
    for(const slot of slots){
      const pt=PARA_TIMES[slot.para];
      if(!pt)continue;
      const [sh,sm]=pt.s.split(':').map(Number);
      if(sh*60+sm>total){nextPara=slot.para;break;}
    }
  }

  let html='';
  slots.forEach((slot,si)=>{
    const t=slot.time||'';
    const [t1,t2]=(t.includes('–')?t.split('–'):[t,'']).map(x=>x.trim());
    const isCurrent=(slot.para===currentPara);
    const isNext=(slot.para===nextPara&&currentPara===-1||slot.para===nextPara);
    const cardClass=`lcard g${isCurrent?' lcard-current':''}${isNext&&!isCurrent?' lcard-next':''}`;

    html+=`<div class="${cardClass}" style="animation-delay:${si*35}ms">
      <div class="ltime">
        <div class="lnum">${slot.para}</div>
        <div class="ltm">${esc(t1)}<br>${esc(t2)}</div>
        ${isCurrent?'<div class="now-dot"></div>':''}
      </div>
      <div class="lbody">`;

    (slot[selWeek]||[]).forEach(l=>{
      // определяем тип — добавлен КРП
      let type=l.type||'лек';
      if(type==='крп'||String(l.subject).toLowerCase().startsWith('крп')||String(l.subject).includes('курсовой проект')) type='крп';
      html+=`<div class="li">
        <div class="ltags"><span class="tag ${TTAG[type]||'tt-l'}">${TWRD[type]||type}</span></div>
        <div class="lname">${esc(l.subject)}</div>
        ${l.teacher?`<div class="lmeta"><i class="fa-solid fa-user-tie lico"></i>${esc(l.teacher)}</div>`:''}
        ${l.room?`<div class="lmeta"><i class="fa-solid fa-door-open lico"></i>${esc(l.room)}</div>`:''}
        ${l.note?`<div class="lnote">${esc(l.note)}</div>`:''}
      </div>`;
    });
    html+=`</div></div>`;
  });
  cont.innerHTML=html;

  // скроллим к текущей паре
  if(isToday&&currentPara!==-1){
    setTimeout(()=>{
      const cur=cont.querySelector('.lcard-current');
      if(cur) cur.scrollIntoView({behavior:'smooth',block:'center'});
    },350);
  }
}

// ── Виджет «Сегодня» на главном экране ───────────
function buildTodayWidget(){
  const wrap=$('today-widget');
  if(!wrap||!selGroup)return;

  const today=getTodayName();
  const week=getCurrentWeek();
  const gSched=D.schedule[selGroup]||{};
  const slots=(gSched[today]||[]).filter(s=>s[week]?.length);
  const currentPara=getCurrentParaIndex();
  const now=new Date();
  const total=now.getHours()*60+now.getMinutes();

  // ближайшая пара сегодня
  let nextSlot=null;
  for(const slot of slots){
    const pt=PARA_TIMES[slot.para];
    if(!pt)continue;
    const [sh,sm]=pt.s.split(':').map(Number);
    if(sh*60+sm>=total){nextSlot=slot;break;}
  }

  if(!nextSlot&&currentPara===-1){
    wrap.innerHTML=`<div class="widget-empty">На сегодня пар больше нет 🎉</div>`;
    wrap.style.display='block';
    return;
  }

  const slot=nextSlot||slots.find(s=>s.para===currentPara);
  if(!slot){wrap.style.display='none';return;}

  const pt=PARA_TIMES[slot.para];
  const isCurrent=(slot.para===currentPara);
  const lessons=slot[week]||[];
  const l=lessons[0];
  if(!l){wrap.style.display='none';return;}

  let type=l.type||'лек';
  if(type==='крп'||String(l.subject).toLowerCase().startsWith('крп')) type='крп';

  wrap.innerHTML=`
    <div class="widget-card g" onclick="goToToday()">
      <div class="widget-top">
        <span class="widget-label">${isCurrent?'🔴 Сейчас идёт':'⏰ Следующая пара'}</span>
        <span class="widget-time">${pt?pt.s+' – '+pt.e:''}</span>
      </div>
      <div class="widget-name">${esc(l.subject)}</div>
      <div class="widget-meta">
        <span class="tag ${TTAG[type]||'tt-l'}">${TWRD[type]||type}</span>
        ${l.teacher?`<span class="widget-teacher">${esc(l.teacher)}</span>`:''}
        ${l.room?`<span class="widget-room"><i class="fa-solid fa-door-open" style="opacity:.5;font-size:11px"></i> ${esc(l.room)}</span>`:''}
      </div>
    </div>`;
  wrap.style.display='block';
}

function goToToday(){
  const today=getTodayName();
  const week=getCurrentWeek();
  // переключаем неделю если нужно
  if(selWeek!==week){
    selWeek=week;
    document.querySelectorAll('.wt').forEach(b=>b.classList.toggle('on',b.dataset.w===week));
    requestAnimationFrame(()=>requestAnimationFrame(updateWeekSlider));
  }
  showView('view-sched');
  if(today&&selGroup){
    const gSched=D.schedule[selGroup]||{};
    const avail=DAYS.filter(d=>(gSched[d]||[]).some(s=>s[selWeek]?.length));
    if(avail.includes(today)){
      buildDayTabs();
      switchDay(today);
    }
  }
}

// ── Поделиться расписанием ────────────────────────
function shareSchedule(){
  const g=D.groups.find(x=>x.id===selGroup);
  if(!g||!selDay)return;
  const gSched=D.schedule[selGroup]||{};
  const slots=(gSched[selDay]||[]).filter(s=>s[selWeek]?.length);
  if(!slots.length)return;
  const weekWord=selWeek==='odd'?'нечётная':'чётная';
  let text=`📅 ${g.num} · ${g.dept} — ${selDay} (${weekWord})\n\n`;
  slots.forEach(slot=>{
    const pt=PARA_TIMES[slot.para];
    text+=`${slot.para}. ${pt?pt.s+' – '+pt.e:''}\n`;
    (slot[selWeek]||[]).forEach(l=>{
      text+=`   ${l.subject}`;
      if(l.teacher) text+=` · ${l.teacher}`;
      if(l.room)    text+=` · ${l.room}`;
      text+='\n';
    });
  });
  text+=`\nxoras.site`;
  if(navigator.share){
    navigator.share({title:`Расписание ${g.num}`,text}).catch(()=>{});
  } else {
    navigator.clipboard?.writeText(text).then(()=>{
      showToast('Скопировано в буфер обмена');
    }).catch(()=>{});
  }
}

// ── Toast ─────────────────────────────────────────
function showToast(msg){
  let t=document.querySelector('.toast');
  if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t);}
  t.textContent=msg;t.classList.add('on');
  setTimeout(()=>t.classList.remove('on'),2200);
}

// ── Search ────────────────────────────────────────
$('sinput').oninput=function(){
  const q=this.value.trim().toLowerCase();
  const res=$('search-out');
  if(q.length<2){
    res.innerHTML=`<div class="empty"><div class="empty-ico" style="font-size:38px">🔍</div>Начни вводить...</div>`;
    return;
  }
  const hits=[];
  for(const g of D.groups){
    const gs=D.schedule[g.id];if(!gs)continue;
    for(const day of DAYS){
      for(const slot of(gs[day]||[])){
        for(const wk of['odd','even']){
          for(const l of(slot[wk]||[])){
            if([l.subject,l.teacher,l.room].join(' ').toLowerCase().includes(q)){
              hits.push({g,day,slot,l,wk});
            }
          }
        }
      }
    }
  }
  if(!hits.length){res.innerHTML=`<div class="empty"><div class="empty-ico" style="font-size:38px">😔</div>Ничего не найдено</div>`;return;}
  let html=`<div class="res-lbl">${hits.length} результатов</div>`;
  hits.slice(0,80).forEach(h=>{
    let type=h.l.type||'лек';
    if(type==='крп'||String(h.l.subject).toLowerCase().startsWith('крп')) type='крп';
    html+=`<div class="lcard g" style="margin-bottom:8px">
      <div class="ltime">
        <div class="lnum">${h.slot.para}</div>
        <div class="ltm">${esc(h.g.num)}<br>${DS[h.day]||h.day}</div>
      </div>
      <div class="lbody"><div class="li">
        <div class="ltags">
          <span class="tag tw" style="background:rgba(var(--acc),.12);color:rgba(var(--acc),1)">${h.wk==='odd'?'Нечёт':'Чёт'}</span>
          <span class="tag ${TTAG[type]||'tt-l'}">${TWRD[type]||type}</span>
        </div>
        <div class="lname">${esc(h.l.subject)}</div>
        ${h.l.teacher?`<div class="lmeta"><i class="fa-solid fa-user-tie lico"></i>${esc(h.l.teacher)}</div>`:''}
        ${h.l.room?`<div class="lmeta"><i class="fa-solid fa-door-open lico"></i>${esc(h.l.room)}</div>`:''}
      </div></div></div>`;
  });
  res.innerHTML=html;
};

// ── Init ──────────────────────────────────────────
(function init(){
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }

  if(lg('dark')==='1')setDark(true);
  document.documentElement.style.background=dark?'#06060b':'#eef0f6';

  const ai=Math.min(parseInt(lg('acc')||'0'),ACCENTS.length-1);
  applyAccent(ACCENTS[isNaN(ai)?0:ai]);
  setTimeout(()=>{swBox.querySelectorAll('.sw').forEach((s,i)=>s.classList.toggle('on',i===ai));},0);

  // Автоопределение недели
  const autoWeek=getCurrentWeek();
  const savedWeek=lg('week');
  // если пользователь не менял вручную — ставим автоматически
  if(!savedWeek){
    selWeek=autoWeek;
    ls('week',selWeek);
  } else {
    selWeek=savedWeek;
  }
  document.querySelectorAll('.wt').forEach(b=>b.classList.toggle('on',b.dataset.w===selWeek));

  buildGroups();

  const savedInstitute=lg('institute');
  const savedCourse=lg('course');
  const savedGroup=lg('group');
  const savedDay=lg('day');

  if(savedInstitute) selInstitute=savedInstitute;
  if(savedCourse) selCourse=savedCourse;

  if(savedGroup){
    const btn=document.querySelector(`.gcard[data-id="${CSS.escape(savedGroup)}"]`);
    if(btn){
      document.querySelectorAll('.gcard').forEach(c=>c.classList.remove('on'));
      btn.classList.add('on');selGroup=savedGroup;
      buildDayTabs();
      if(savedDay&&document.querySelector(`.daytab[data-day="${savedDay}"]`)){
        selDay=savedDay;
        document.querySelectorAll('.daytab').forEach(t=>t.classList.toggle('on',t.dataset.day===savedDay));
      } else {
        const first=document.querySelector('.daytab');
        if(first){selDay=first.dataset.day;first.classList.add('on');}
      }
      renderSchedule();
      buildTodayWidget();
      showView('view-sched');
      setTimeout(updateSlider,100);
      setTimeout(updateWeekSlider,120);
      setTimeout(window._updateDaySlider,150);
      return;
    }
  }

  showView('view-home');
  setTimeout(updateSlider,100);
  setTimeout(updateWeekSlider,120);
})();

// ── Google Sheets live update ─────────────────────
window._scheduleLoaded=function(){
  buildGroups();
  if(selGroup&&D.schedule[selGroup]){
    buildDayTabs();
    if(selDay)renderSchedule();
    buildTodayWidget();
  }
};

// ── Dock slider ───────────────────────────────────
function updateSlider(){
  const dock=document.querySelector('.dock');
  const slider=document.querySelector('.dock-slider');
  const active=dock&&dock.querySelector('.db.on');
  if(!dock||!slider||!active)return;
  const dr=dock.getBoundingClientRect();
  const ar=active.getBoundingClientRect();
  slider.style.transform=`translateX(${ar.left-dr.left}px)`;
  slider.style.width=`${ar.width}px`;
}
(function(){
  const dock=document.querySelector('.dock');
  if(!dock)return;
  const slider=document.createElement('div');
  slider.className='dock-slider';
  Object.assign(slider.style,{
    position:'absolute',top:'6px',bottom:'6px',left:'0',width:'0',
    borderRadius:'22px',
    transition:'transform .28s cubic-bezier(.34,1.56,.64,1), width .28s cubic-bezier(.34,1.56,.64,1)',
    zIndex:'1',pointerEvents:'none',
  });
  dock.prepend(slider);
  window.addEventListener('resize',updateSlider);
})();

// ── Week slider ───────────────────────────────────
(function(){
  const bar=document.querySelector('.week-bar');
  if(!bar)return;
  const slider=document.createElement('div');
  slider.className='week-slider';
  bar.prepend(slider);
  setTimeout(updateWeekSlider,120);
})();
