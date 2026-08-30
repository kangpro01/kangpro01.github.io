/* ══════════════════════════════════════════════════════════
   홈의 달력.

   담아둔 업무를 달력 위에 얹습니다.
   점을 찍고 옆에 목록을 따로 두는 대신, 날짜 칸 안에 제목을 바로 적습니다.
   무엇이 있는지 달력만 보고 알 수 있어야 하기 때문입니다.

   제목을 누르면 고치는 창이 열립니다. 이것이 없으면 오늘 이후로 잡힌
   한 번짜리 업무는 마감일이 올 때까지 손댈 방법이 없습니다.
   칸에 다 못 담은 것은 +N 을 눌러 펼칩니다.

   업무를 불러온 뒤 CAL.setTasks(rows) 를 부르면 다시 그립니다.
   ══════════════════════════════════════════════════════════ */
const CAL = (function(){
  const host = document.getElementById('homeCal');
  if(!host) return { setTasks(){} };

  const NOW = new Date();
  const TY = NOW.getFullYear(), TM = NOW.getMonth() + 1, TD = NOW.getDate();
  const DOW = ['일','월','화','수','목','금','토'];
  const SHOW_MAX = 3;                  // 한 칸에 적어 넣을 최대 건수. 넘으면 +N
  let show = SHOW_MAX;                 // 칸 높이에 맞춰 실제로 적는 줄 수

  let y = TY, m = TM;
  let mine = [];                       // 직접 담은 업무 (로그인 뒤 채워집니다)
  let openDay = null;                  // +N 을 눌러 펼쳐둔 날 (YYYY-MM-DD)

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

  /* 그 날짜에 걸린 업무 모으기 */
  const pad = n => String(n).padStart(2,'0');
  const keyOf = (year, month, day) => year + '-' + pad(month) + '-' + pad(day);
  function itemsOn(key){
    return mine.filter(t => t.due_on === key);
  }

  function draw(){
    const lead = new Date(y, m - 1, 1).getDay();
    const last = new Date(y, m, 0).getDate();

    let cells = '';
    for(let i = 0; i < lead; i++) cells += '<div class="cal-day off"></div>';

    for(let d = 1; d <= last; d++){
      const key = keyOf(y, m, d);
      const list = itemsOn(key);
      const wide = openDay === key;                 // 펼쳐둔 날은 전부 보여줍니다
      const wd = (lead + d - 1) % 7;                // 0=일 … 6=토
      const holi = (typeof HOLIDAY !== 'undefined') ? HOLIDAY.on(key) : null;

      let cls = 'cal-day';
      if(list.length) cls += ' has';
      if(y === TY && m === TM && d === TD) cls += ' today';
      if(wide) cls += ' open';

      /* 일요일과 공휴일은 빨강, 토요일은 파랑 */
      const nCls = 'cal-n' + (wd === 0 || holi ? ' sun' : wd === 6 ? ' sat' : '');

      /* 넘치는 건수는 줄을 하나 더 쓰지 않도록 날짜 숫자 옆에 적습니다 */
      const hidden = list.length - show;
      const more = (!wide && hidden > 0)
        ? '<button type="button" class="cal-more" data-more="' + key + '"'
          + ' aria-label="이 날 업무 모두 보기">+' + hidden + '</button>'
        : (wide && hidden > 0
            ? '<button type="button" class="cal-more" data-more="" aria-label="접기">접기</button>'
            : '');

      const evs = (wide ? list : list.slice(0, show)).map(t =>
        '<button type="button" class="cal-ev" data-task="' + t.id + '"'
        + ' title="' + esc(t.title) + '">' + esc(t.title) + '</button>').join('');

      /* 칸이 좁은 화면에서는 제목이 서너 글자만 보여 쓸모가 없습니다.
         그때는 CSS가 제목을 감추고 이 건수만 남깁니다. */
      const count = list.length
        ? '<em class="cal-count">' + list.length + '</em>' : '';

      cells += '<div class="' + cls + '">'
             +   '<div class="cal-top">'
             +     '<i class="' + nCls + '">' + d + '</i>' + more + count
             +   '</div>'
             +   (holi ? '<em class="cal-holi">' + esc(holi) + '</em>' : '')
             +   evs
             + '</div>';
    }

    const onToday = (y === TY && m === TM);

    /* 뒤쪽도 빈 칸으로 채워야 마지막 줄이 이가 빠지지 않습니다 */
    const tail = (7 - (lead + last) % 7) % 7;
    for(let i = 0; i < tail; i++) cells += '<div class="cal-day off"></div>';

    host.innerHTML =
      '<div class="cal-head">'
      + '<button type="button" class="cal-nav" data-go="-1" aria-label="이전 달">‹</button>'
      + '<span class="cal-title">'
      +   '<b>' + y + '년 ' + m + '월</b>'
      +   '<button type="button" class="cal-today" data-today'
      +     (onToday ? ' disabled' : '') + '>오늘</button>'
      + '</span>'
      + '<button type="button" class="cal-nav" data-go="1" aria-label="다음 달">›</button>'
      + '</div>'
      + '<div class="cal-grid">'
      + DOW.map((d, i) =>
          '<span class="cal-dow' + (i === 0 ? ' sun' : i === 6 ? ' sat' : '') + '">'
          + d + '</span>').join('')
      + cells
      + '</div>';
  }

  /* 칸 높이에 맞춰 몇 줄까지 적을지 정합니다.
     화면이 낮으면 한 줄만 적고 나머지는 +N 으로 넘깁니다.
     이래야 칸이 넘쳐 달력에 스크롤 막대가 생기지 않습니다. */
  function fitShow(){
    const ev = host.querySelector('.cal-day.has .cal-ev');
    if(!ev || !ev.offsetHeight) return show;      // 잴 것이 없으면 그대로
    const cell = ev.closest('.cal-day');          // 줄 높이는 어느 칸이든 같습니다
    const st = getComputedStyle(cell);
    const gap = parseFloat(st.rowGap) || 2;
    const top = cell.querySelector('.cal-top');
    /* 공휴일 이름이 한 줄을 차지합니다. 그 달에 공휴일이 하나라도 있으면
       모든 칸을 같은 기준으로 줄여야 어느 칸도 잘리지 않습니다. */
    const holi = host.querySelector('.cal-holi');
    const holiH = holi ? holi.offsetHeight + gap : 0;
    const avail = cell.clientHeight
                - parseFloat(st.paddingTop) - parseFloat(st.paddingBottom)
                - (top ? top.offsetHeight : 0) - gap - holiH;
    const unit = ev.offsetHeight + gap;
    return Math.max(1, Math.min(SHOW_MAX, Math.floor(avail / unit)));
  }

  function render(){
    draw();
    const n = fitShow();
    if(n !== show){ show = n; draw(); }          // 한 번만 다시 그립니다
  }

  /* 창 크기가 바뀌면 칸 높이도 바뀝니다 */
  let tid = null;
  addEventListener('resize', () => {
    clearTimeout(tid);
    tid = setTimeout(render, 150);
  });

  host.addEventListener('click', async e => {
    /* 일정을 누르면 고치는 창 */
    const ev = e.target.closest('[data-task]');
    if(ev){
      try{
        const cur = (await DB.q('tasks', 'select=*&id=eq.' + ev.dataset.task))[0];
        if(cur) TaskForm.open({ task: cur });
      }catch(err){ alert('불러오지 못했어요. ' + err.message); }
      return;
    }

    /* +N / 접기 */
    const more = e.target.closest('[data-more]');
    if(more){
      openDay = more.dataset.more || null;
      render();
      return;
    }

    if(e.target.closest('[data-today]')){
      y = TY; m = TM; openDay = null; render();
      return;
    }
    const nav = e.target.closest('.cal-nav');
    if(!nav) return;
    m += Number(nav.dataset.go);
    if(m < 1){ m = 12; y--; }
    if(m > 12){ m = 1; y++; }
    openDay = null;
    render();
  });

  render();

  return {
    setTasks(rows){ mine = rows || []; render(); }
  };
})();
