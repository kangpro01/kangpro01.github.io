/* ══════════════════════════════════════════════════════════
   홈의 달력.

   두 가지를 함께 얹습니다.
     · assets/tasks.js 의 일반적인 총무 반복 업무
     · 로그인해서 불러온, 직접 담아둔 업무

   할 일이 있는 날에 점이 찍히고, 누르면 아래에 내용이 나옵니다.
   업무를 불러온 뒤 CAL.setTasks(rows) 를 부르면 다시 그립니다.
   ══════════════════════════════════════════════════════════ */
const CAL = (function(){
  const host = document.getElementById('homeCal');
  if(!host) return { setTasks(){} };

  const NOW = new Date();
  const TY = NOW.getFullYear(), TM = NOW.getMonth() + 1, TD = NOW.getDate();
  const DOW = ['일','월','화','수','목','금','토'];
  const has = n => typeof n !== 'undefined';

  let y = TY, m = TM, sel = TD;
  let mine = [];                       // 직접 담은 업무 (로그인 뒤 채워집니다)

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

  /* 그 날짜에 걸린 것 모으기 */
  function itemsOn(year, month, day){
    const out = [];

    // 직접 담은 업무 — 마감일이 그 날인 것
    const pad = n => String(n).padStart(2,'0');
    const key = year + '-' + pad(month) + '-' + pad(day);
    mine.forEach(t => {
      if(t.due_on === key) out.push({ t:t.title, tag:'내 업무', mine:true, to:'#board' });
    });

    // 일반 총무 업무
    if(has(window.TASKS) || typeof TASKS !== 'undefined'){
      TASKS.filter(t => t.m === month && t.d === day)
           .forEach(t => out.push({ t:t.t, tag:month + '월 ' + day + '일', to:'#month' }));
      MONTHLY.filter(t => t.d === day)
             .forEach(t => out.push({ t:t.t, tag:'매달 ' + day + '일', to:'#always' }));
    }
    return out;
  }

  function render(){
    const lead = new Date(y, m - 1, 1).getDay();
    const last = new Date(y, m, 0).getDate();

    let cells = '';
    for(let i = 0; i < lead; i++) cells += '<span class="cal-day off"></span>';

    for(let d = 1; d <= last; d++){
      const list = itemsOn(y, m, d);
      const isToday = (y === TY && m === TM && d === TD);
      let cls = 'cal-day';
      if(list.length) cls += ' has';
      if(list.some(x => x.mine)) cls += ' mine';
      if(isToday) cls += ' today';
      if(d === sel) cls += ' sel';

      cells += list.length
        ? '<button type="button" class="' + cls + '" data-d="' + d + '"'
          + ' aria-label="' + m + '월 ' + d + '일, 할 일 ' + list.length + '건">' + d + '</button>'
        : '<span class="' + cls + '">' + d + '</span>';
    }

    host.innerHTML =
      '<div class="cal-head">'
      + '<button type="button" class="cal-nav" data-go="-1" aria-label="이전 달">‹</button>'
      + '<b>' + y + '년 ' + m + '월</b>'
      + '<button type="button" class="cal-nav" data-go="1" aria-label="다음 달">›</button>'
      + '</div>'
      + '<div class="cal-grid">'
      + DOW.map(d => '<span class="cal-dow">' + d + '</span>').join('')
      + cells
      + '</div>'
      + '<div class="cal-list" id="calList"></div>';

    paintList();
  }

  function paintList(){
    const el = host.querySelector('#calList');
    if(!el) return;
    const list = sel ? itemsOn(y, m, sel) : [];

    if(!list.length){
      el.innerHTML = '<p class="cal-none">'
        + (sel ? m + '월 ' + sel + '일에는 예정된 일이 없습니다.' : '점이 찍힌 날을 눌러보십시오.')
        + '</p>';
      return;
    }
    el.innerHTML = list.map(x =>
      '<a class="cal-item' + (x.mine ? ' is-mine' : '') + '" href="'
      + (x.mine ? '#board' : 'reminder.html' + x.to) + '">'
      + '<b>' + esc(x.t) + '</b><span>' + esc(x.tag) + '</span>'
      + '</a>'
    ).join('');
  }

  host.addEventListener('click', e => {
    const nav = e.target.closest('.cal-nav');
    if(nav){
      m += Number(nav.dataset.go);
      if(m < 1){ m = 12; y--; }
      if(m > 12){ m = 1; y++; }
      sel = (y === TY && m === TM) ? TD : null;
      render();
      return;
    }
    const day = e.target.closest('.cal-day[data-d]');
    if(day){ sel = Number(day.dataset.d); render(); }
  });

  render();

  return {
    setTasks(rows){ mine = rows || []; render(); }
  };
})();
