/* ══════════════════════════════════════════════════════════
   메인 화면.

   다섯 칸 — 지금 무엇을 해야 하는지
     캘린더 · 지금 해야 할 일 · 일간 · 주간 · 월간
   ══════════════════════════════════════════════════════════ */
(function(){
  const nowEl = document.getElementById('nowList');
  if(!nowEl) return;

  const T = WHEN.midnight();
  const ymd = WHEN.ymd;
  const shift = (d,n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };

  const today = ymd(T);

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

  /* 마감까지 며칠 — 오른쪽 끝에 붙이는 작은 칩 */
  function dday(due){
    if(!due) return '';
    const left = Math.round((new Date(due + 'T00:00:00') - T) / 86400000);
    const tone = left < 0 ? 'over' : left === 0 ? 'today' : 'far';
    const text = left < 0 ? 'D+' + (-left) : left === 0 ? 'D-DAY' : 'D-' + left;
    return '<span class="dday ' + tone + '">' + text + '</span>';
  }

  /* 반복 업무를 오늘 눌렀는지. 눌렀으면 이번 차례는 끝난 것으로 봅니다.
     due_on 만으로는 알 수 없습니다. 매주 금요일 업무를 월요일에 보면
     due_on 이 미래라서 끝낸 것처럼 보이기 때문입니다. */
  const doneToday = t => !!t.done_at && ymd(new Date(t.done_at)) === today;

  /* ── 한 줄 ── */
  function row(t, opt){
    opt = opt || {};
    const u = WHEN.untilLabel(t.due_on);
    const cycled = opt.slim && doneToday(t);      // 오늘 끝낸 반복 업무
    const meta = [];
    if(t.owner) meta.push(esc(t.owner));
    if(t.category) meta.push(esc(t.category));
    if(!opt.hideRepeat && t.repeat_rule) meta.push(WHEN.repeatLabel(t.repeat_rule));

    return '<div class="tk' + (cycled ? ' cycled' : '') + '" data-id="' + t.id + '">'
      + '<button type="button" class="tk-check" data-do="' + (cycled ? 'undo' : 'done') + '"'
      +   ' aria-pressed="' + (cycled ? 'true' : 'false') + '"'
      +   ' aria-label="' + (cycled ? '완료 취소' : '완료') + '"><span></span></button>'
      + '<div class="tk-body">'
      +   '<button type="button" class="tk-title" data-do="edit">' + esc(t.title) + '</button>'
      +   (opt.slim || !t.note ? '' : '<p>' + esc(t.note) + '</p>')
      +   '<span class="tk-meta">'
      +     '<i class="tk-when ' + u.tone + '">' + u.text + '</i>'
      +     (meta.length ? '<em>' + meta.join(' · ') + '</em>' : '')
      +   '</span>'
      + '</div>'
      + (opt.slim ? '' :
          '<div class="tk-acts">'
          + '<button type="button" class="tk-btn" data-do="snooze" data-n="3">3일 뒤</button>'
          + '<button type="button" class="tk-btn" data-do="snooze" data-n="7">다음 주</button>'
          + '</div>')
      + (opt.dday ? dday(t.due_on) : '')
      + '</div>';
  }

  function fill(el, rows, emptyText, opt){
    if(!el) return;
    el.innerHTML = rows.length
      ? '<div class="tks">' + rows.map(t => row(t, opt)).join('') + '</div>'
      : '<p class="card-empty">' + emptyText + '</p>';
  }

  /* ── 불러오기 ── */
  async function load(){
    nowEl.innerHTML = '<p class="card-empty">불러오는 중이에요…</p>';

    let all;
    try{
      all = await DB.q('tasks', 'select=*&status=eq.open&order=due_on.asc&limit=400');
    }catch(err){
      nowEl.innerHTML = '<p class="card-empty bad">불러오지 못했어요. ' + esc(err.message) + '</p>';
      return;
    }

    CAL.setTasks(all);
    if(typeof NOTIFY !== 'undefined') NOTIFY.setTasks(all);

    const now = all.filter(t => t.due_on && t.due_on <= today);
    fill(nowEl, now, '오늘까지인 일이 없어요.', { dday:true });
    const cnt = document.getElementById('nowCount');
    if(cnt) cnt.textContent = now.length ? now.length + '건' : '';

    const rep = (pre) => all.filter(t => t.repeat_rule &&
      (pre === 'daily' ? t.repeat_rule === 'daily' : t.repeat_rule.startsWith(pre)))
      .sort((a,b) => (a.due_on||'').localeCompare(b.due_on||''));

    fill(document.getElementById('dailyList'),   rep('daily'),
         '+ 버튼을 눌러 일간 업무를 등록하세요.', { slim:true, hideRepeat:true });
    fill(document.getElementById('weeklyList'),  rep('weekly'),
         '+ 버튼을 눌러 주간 업무를 등록하세요.', { slim:true });
    fill(document.getElementById('monthlyList'), rep('monthly').concat(rep('yearly')),
         '+ 버튼을 눌러 월간 업무를 등록하세요.', { slim:true });
  }

  /* ── 완료 · 미루기 ── */
  document.addEventListener('click', async e => {
    const btn = e.target.closest('.tk [data-do]');
    if(!btn) return;
    const card = btn.closest('.tk');
    const id = card.dataset.id;

    /* 제목을 누르면 고치는 창을 엽니다 */
    if(btn.dataset.do === 'edit'){
      try{
        const cur = (await DB.q('tasks', 'select=*&id=eq.' + id))[0];
        if(cur) TaskForm.open({ task: cur });
      }catch(err){ alert('불러오지 못했어요. ' + err.message); }
      return;
    }

    card.classList.add('busy');

    try{
      if(btn.dataset.do === 'undo'){
        /* 잘못 눌렀을 때. 다시 오늘 할 일로 되돌립니다. */
        await DB.update('tasks', 'id=eq.' + id, {
          due_on: today, done_at: null,
          last_seen_at: new Date().toISOString()
        });
      }else if(btn.dataset.do === 'snooze'){
        await DB.update('tasks', 'id=eq.' + id, {
          due_on: ymd(shift(T, Number(btn.dataset.n))),
          last_seen_at: new Date().toISOString()
        });
      }else{
        const cur = (await DB.q('tasks', 'select=*&id=eq.' + id))[0];
        const next = cur && WHEN.nextDue(cur.repeat_rule, cur.due_on);
        if(next){
          /* 반복 업무는 사라지지 않고 다음 차례로 넘어갑니다.
             done_at 을 남겨야 오늘 끝냈다는 표시를 할 수 있습니다. */
          const nowIso = new Date().toISOString();
          await DB.update('tasks', 'id=eq.' + id,
                          { due_on: next, done_at: nowIso, last_seen_at: nowIso });
        }else{
          await DB.update('tasks', 'id=eq.' + id,
                          { status:'done', done_at: new Date().toISOString() });
        }
      }
      load();
    }catch(err){
      card.classList.remove('busy');
      alert('처리하지 못했어요. ' + err.message);
    }
  });

  /* ── '지금 해야 할 일' 접기 ──
     접으면 달력이 화면 폭을 다 씁니다. 급한 것이 없는 날에는
     달력을 크게 보는 편이 낫다는 뜻입니다. 고른 상태는 남겨둡니다. */
  (function(){
    const board = document.querySelector('.hub');
    const card  = document.querySelector('.card-now');
    const btn   = document.getElementById('nowFold');
    if(!board || !card || !btn) return;

    const KEY = 'kp.nowFold';
    const read = () => { try{ return localStorage.getItem(KEY) === '1'; }catch(e){ return false; } };
    const write = v => { try{ localStorage.setItem(KEY, v ? '1' : '0'); }catch(e){} };

    function paint(folded){
      card.classList.toggle('folded', folded);
      board.classList.toggle('now-off', folded);
      btn.setAttribute('aria-expanded', folded ? 'false' : 'true');
      btn.setAttribute('aria-label', folded ? '펴기' : '접기');
      /* 칸 크기가 바뀌었으니 달력이 몇 줄까지 적을지 다시 잽니다 */
      if(typeof CAL !== 'undefined') dispatchEvent(new Event('resize'));
    }

    paint(read());
    btn.addEventListener('click', () => {
      const next = !card.classList.contains('folded');
      write(next);
      paint(next);
    });
  })();

  /* ── 한 칸만 펼쳐 보기 ──
     메뉴에서 '일간 업무'를 고르면 #daily 로 옵니다.
     그 칸의 높이 제한을 풀어 담아둔 것을 끝까지 보여줍니다.
     칸 안에서만 스크롤하는 평소 배치로는 서너 줄밖에 안 보이기 때문입니다. */
  const hub = document.querySelector('.hub');

  function focusFromHash(){
    if(!hub) return;
    hub.querySelectorAll('.card.focused').forEach(c => c.classList.remove('focused'));

    const id = (location.hash || '').slice(1);
    const el = id ? document.getElementById(id) : null;
    if(!el || !hub.contains(el)){ hub.classList.remove('has-focus'); return; }

    el.classList.add('focused');
    hub.classList.add('has-focus');
    el.scrollIntoView({ block:'start', behavior:'smooth' });
  }

  addEventListener('hashchange', focusFromHash);
  focusFromHash();

  document.addEventListener('tasks:changed', load);
  DB.gate(() => {
    load();
    /* 다른 페이지에서 '＋ 업무추가'를 누르고 넘어온 경우.
       로그인을 지난 뒤에 엽니다. */
    if(location.hash === '#new'){
      history.replaceState(null, '', location.pathname + location.search);
      TaskForm.open();
    }
  });
})();
