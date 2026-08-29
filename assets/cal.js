/* ══════════════════════════════════════════════════════════
   홈의 달력.

   담아둔 업무를 달력 위에 얹습니다.
   점을 찍고 옆에 목록을 따로 두는 대신, 날짜 칸 안에 제목을 바로 적습니다.
   무엇이 있는지 달력만 보고 알 수 있어야 하기 때문입니다.
   업무를 불러온 뒤 CAL.setTasks(rows) 를 부르면 다시 그립니다.
   ══════════════════════════════════════════════════════════ */
const CAL = (function(){
  const host = document.getElementById('homeCal');
  if(!host) return { setTasks(){} };

  const NOW = new Date();
  const TY = NOW.getFullYear(), TM = NOW.getMonth() + 1, TD = NOW.getDate();
  const DOW = ['일','월','화','수','목','금','토'];
  const SHOW_MAX = 2;                  // 한 칸에 적어 넣을 최대 건수. 넘으면 +N
  let show = SHOW_MAX;                 // 칸 높이에 맞춰 실제로 적는 줄 수

  let y = TY, m = TM;
  let mine = [];                       // 직접 담은 업무 (로그인 뒤 채워집니다)

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

  /* 그 날짜에 걸린 업무 제목 모으기 */
  const pad = n => String(n).padStart(2,'0');
  function titlesOn(year, month, day){
    const key = year + '-' + pad(month) + '-' + pad(day);
    return mine.filter(t => t.due_on === key).map(t => t.title);
  }

  function draw(){
    const lead = new Date(y, m - 1, 1).getDay();
    const last = new Date(y, m, 0).getDate();

    let cells = '';
    for(let i = 0; i < lead; i++) cells += '<div class="cal-day off"></div>';

    for(let d = 1; d <= last; d++){
      const list = titlesOn(y, m, d);
      let cls = 'cal-day';
      if(list.length) cls += ' has';
      if(y === TY && m === TM && d === TD) cls += ' today';

      /* 넘치는 건수는 줄을 하나 더 쓰지 않도록 날짜 숫자 옆에 적습니다 */
      const more = list.length > show
        ? '<em class="cal-more">+' + (list.length - show) + '</em>' : '';
      const evs = list.slice(0, show).map(t =>
        '<span class="cal-ev" title="' + esc(t) + '">' + esc(t) + '</span>').join('');

      /* 칸이 좁은 화면에서는 제목이 서너 글자만 보여 쓸모가 없습니다.
         그때는 CSS가 제목을 감추고 이 건수만 남깁니다. */
      const count = list.length
        ? '<em class="cal-count">' + list.length + '</em>' : '';

      cells += '<div class="' + cls + '">'
             +   '<div class="cal-top">'
             +     '<i class="cal-n">' + d + '</i>' + more + count
             +   '</div>'
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
    const avail = cell.clientHeight
                - parseFloat(st.paddingTop) - parseFloat(st.paddingBottom)
                - (top ? top.offsetHeight : 0) - gap;
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

  host.addEventListener('click', e => {
    if(e.target.closest('[data-today]')){
      y = TY; m = TM; render();
      return;
    }
    const nav = e.target.closest('.cal-nav');
    if(!nav) return;
    m += Number(nav.dataset.go);
    if(m < 1){ m = 12; y--; }
    if(m > 12){ m = 1; y++; }
    render();
  });

  render();

  return {
    setTasks(rows){ mine = rows || []; render(); }
  };
})();
