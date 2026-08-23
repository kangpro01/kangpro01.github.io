/* ══════════════════════════════════════════════════════════
   홈의 달력.

   assets/tasks.js의 목록을 달력 위에 얹습니다.
   할 일이 있는 날에는 점이 찍히고, 누르면 아래에 내용이 나옵니다.
   목록을 고치면 달력도 따라 바뀝니다. 여기를 손댈 일은 없습니다.
   ══════════════════════════════════════════════════════════ */
(function(){
  const host = document.getElementById('homeCal');
  if(!host || typeof TASKS === 'undefined' || typeof MONTHLY === 'undefined') return;

  const NOW = new Date();
  const TY = NOW.getFullYear(), TM = NOW.getMonth() + 1, TD = NOW.getDate();
  const DOW = ['일','월','화','수','목','금','토'];

  let y = TY, m = TM, sel = TD;

  /* 그 날짜에 걸린 일 — 이 달만 하는 일 + 매달 반복되는 일 */
  function itemsOn(month, day){
    return TASKS.filter(t => t.m === month && t.d === day)
                .map(t => ({ t:t.t, tag:month + '월 ' + day + '일', to:'#month' }))
      .concat(MONTHLY.filter(t => t.d === day)
                .map(t => ({ t:t.t, tag:'매달 ' + day + '일', to:'#always' })));
  }

  function render(){
    const lead = new Date(y, m - 1, 1).getDay();   // 1일의 요일
    const last = new Date(y, m, 0).getDate();      // 이 달의 마지막 날

    let cells = '';
    for(let i = 0; i < lead; i++) cells += '<span class="cal-day off"></span>';

    for(let d = 1; d <= last; d++){
      const n = itemsOn(m, d).length;
      const isToday = (y === TY && m === TM && d === TD);
      let cls = 'cal-day';
      if(n) cls += ' has';
      if(isToday) cls += ' today';
      if(d === sel) cls += ' sel';

      cells += n
        ? '<button type="button" class="' + cls + '" data-d="' + d + '"'
          + ' aria-label="' + m + '월 ' + d + '일, 할 일 ' + n + '건">' + d + '</button>'
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
    const list = sel ? itemsOn(m, sel) : [];

    if(!list.length){
      el.innerHTML = '<p class="cal-none">'
        + (sel ? m + '월 ' + sel + '일에는 예정된 일이 없습니다.' : '점이 찍힌 날을 눌러보십시오.')
        + '</p>';
      return;
    }
    el.innerHTML = list.map(x =>
      '<a class="cal-item" href="reminder.html' + x.to + '">'
      + '<b>' + x.t + '</b><span>' + x.tag + '</span>'
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
    if(day){
      sel = Number(day.dataset.d);
      render();
    }
  });

  render();
})();
