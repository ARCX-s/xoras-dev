// ▼▼▼ Листы Google Sheets — добавляй новые сюда ▼▼▼
// Формат: { institute, course, url }
// url — ссылка на конкретный лист: pub?output=csv&gid=XXXXXXX
const SHEETS = [
  {
    institute: 'ИИЭСМ',
    course: '1',
    url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTxPkqUYwT0fiQH-gHaq3_DKcBMN3qevqHr6yGEY0jUBS172h7f0rTYIJqO8SlF66T0jYmlxT80Ybur/pub?gid=1696662954&single=true&output=csv'
  },
  {
    institute: 'ИИЭСМ',
    course: '2',
    url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTxPkqUYwT0fiQH-gHaq3_DKcBMN3qevqHr6yGEY0jUBS172h7f0rTYIJqO8SlF66T0jYmlxT80Ybur/pub?gid=1199650785&single=true&output=csv'
  },
  {
    institute: 'ИИЭСМ',
    course: '3',
    url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTxPkqUYwT0fiQH-gHaq3_DKcBMN3qevqHr6yGEY0jUBS172h7f0rTYIJqO8SlF66T0jYmlxT80Ybur/pub?gid=165363221&single=true&output=csv'
  },
  // Примеры для будущих листов — раскомментируй и вставь свой gid:
  // { institute: 'ИИЭСМ', course: '2', url: '...pub?output=csv&gid=XXXXXXX' },
  // { institute: 'ИИЭСМ', course: '4', url: '...pub?output=csv&gid=XXXXXXX' },
  // { institute: 'ИЦТМС', course: '3', url: '...pub?output=csv&gid=XXXXXXX' },
];

let D = { groups: [], schedule: {}, days: ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'] };

function parseCSV(text) {
  const rows = [];
  let row = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQ && text[i+1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      row.push(cur); cur = '';
    } else if (c === '\n' && !inQ) {
      row.push(cur);
      if (row.some(v => v !== '')) rows.push(row);
      row = []; cur = '';
    } else if (c !== '\r') {
      cur += c;
    }
  }
  if (cur || row.length) { row.push(cur); if (row.some(v => v !== '')) rows.push(row); }
  return rows;
}

function parseLesson(cell) {
  if (!cell) return null;
  const typeMatch = cell.match(/^(лек|пр|лаб)\./i);
  const type = typeMatch ? typeMatch[1].toLowerCase() : 'лек';
  const rest = typeMatch ? cell.slice(typeMatch[0].length).trim() : cell;
  const parts = rest.split(/\s{2,}|\n/).map(s => s.trim()).filter(Boolean);
  return {
    subject: parts[0] || '',
    teacher: parts[1] || '',
    room:    parts[2] || '',
    note:    parts.slice(3).join(' '),
    type
  };
}

function parseSchedule(rows, institute, course) {
  const DAYS_MAP = {
    'ПОНЕДЕЛЬНИК':'Понедельник','ВТОРНИК':'Вторник','СРЕДА':'Среда',
    'ЧЕТВЕРГ':'Четверг','ПЯТНИЦА':'Пятница','СУББОТА':'Суббота'
  };

  const headerRow = rows[0];
  const groupCols = [];
  for (let c = 3; c < headerRow.length; c++) {
    const h = headerRow[c].trim();
    if (h) groupCols.push({ col: c, id: h });
  }

  const groups = groupCols.map(g => {
    const parts = g.id.split('_');
    const dept = parts[parts.length - 1] || '';
    const numMatch = g.id.match(/(\d)-(\d+)/);
    const num = numMatch ? numMatch[0] : g.id;
    return { id: g.id, num, dept, course, institute };
  });

  const schedule = {};
  groups.forEach(g => { schedule[g.id] = {}; });

  let currentDay = '';
  let currentPara = 0;
  let currentTime = '';

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const dayCell  = (row[0] || '').replace(/\s+/g, '').toUpperCase();
    const timeCell = (row[1] || '').trim();
    const paraCell = (row[2] || '').trim();
    const weekCell = (row[3] || '').trim();

    for (const key in DAYS_MAP) {
      if (dayCell.includes(key)) { currentDay = DAYS_MAP[key]; break; }
    }

    if (paraCell && !isNaN(paraCell)) {
      currentPara = parseInt(paraCell);
      const timeClean = timeCell.replace(/\s/g,'');
      const tMatch = timeClean.match(/(\d{2}[.:]\d{2})-?(\d{2}[.:]\d{2})?/);
      if (tMatch) {
        const t1 = tMatch[1].replace('.',':');
        const t2 = tMatch[2] ? tMatch[2].replace('.',':') : '';
        currentTime = t2 ? t1 + '–' + t2 : t1;
      }
    }

    if (!currentDay || !currentPara) continue;

    const wLow = weekCell.toLowerCase();
    const isOdd  = wLow.includes('нечет');
    const isEven = wLow.includes('чет') && !isOdd;
    if (!isOdd && !isEven) continue;

    for (const g of groupCols) {
      const cell = (row[g.col] || '').trim();
      if (!cell) continue;
      const lesson = parseLesson(cell);
      if (!lesson) continue;

      if (!schedule[g.id][currentDay]) schedule[g.id][currentDay] = [];
      let slot = schedule[g.id][currentDay].find(s => s.para === currentPara);
      if (!slot) {
        slot = { para: currentPara, time: currentTime, odd: [], even: [] };
        schedule[g.id][currentDay].push(slot);
      }
      if (isOdd)  slot.odd.push(lesson);
      if (isEven) slot.even.push(lesson);
    }
  }

  for (const gid in schedule) {
    for (const day in schedule[gid]) {
      schedule[gid][day].sort((a,b) => a.para - b.para);
    }
  }

  return { groups, schedule };
}

async function loadScheduleFromSheets() {
  const allGroups = [];
  const allSchedule = {};

  const results = await Promise.allSettled(
    SHEETS.map(sheet =>
      fetch(sheet.url)
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(text => {
          const rows = parseCSV(text);
          return parseSchedule(rows, sheet.institute, sheet.course);
        })
        .then(parsed => ({ parsed, sheet }))
    )
  );

  let loaded = 0;
  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { parsed, sheet } = result.value;
      allGroups.push(...parsed.groups);
      Object.assign(allSchedule, parsed.schedule);
      loaded++;
      console.log('✅ ' + sheet.institute + ' ' + sheet.course + ' курс — ' + parsed.groups.length + ' групп');
    } else {
      console.error('❌ Ошибка загрузки листа:', result.reason?.message);
    }
  }

  if (allGroups.length > 0) {
    D = {
      groups: allGroups,
      schedule: allSchedule,
      days: ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота']
    };
    if (typeof window !== 'undefined' && window._scheduleLoaded) window._scheduleLoaded();
    console.log('✅ Итого загружено: ' + allGroups.length + ' групп из ' + loaded + ' листов');
  } else {
    console.error('❌ Ни одна группа не загружена — проверь ссылки в SHEETS');
  }
}

if (typeof window !== 'undefined') loadScheduleFromSheets();
