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
  const SHOW = 2;                      // 한 칸에 적어 넣을 최대 건수. 넘으면 +N

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

  function render(){
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
      const more = list.length > SHOW
        ? '<em class="cal-more">+' + (list.length - SHOW) + '</em>' : '';
      const evs = list.slice(0, SHOW).map(t =>
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

    host.innerHTML =
      '<div class="cal-head">'
      + '<button type="button" class="cal-nav" data-go="-1" aria-label="이전 달">‹</button>'
      + '<b>' + y + '년 ' + m + '월</b>'
      + '<button type="button" class="cal-nav" data-go="1" aria-label="다음 달">›</button>'
      + '</div>'
      + '<div class="cal-grid">'
      + DOW.map(d => '<span class="cal-dow">' + d + '</span>').join('')
      + cells
      + '</div>';
  }

  host.addEventListener('click', e => {
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
