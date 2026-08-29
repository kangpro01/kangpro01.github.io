/* ══════════════════════════════════════════════════════════
   메인 화면.

   위쪽 다섯 칸 — 지금 무엇을 해야 하는지
     캘린더 · 지금 해야 할 일 · 일간 · 주간 · 월간

   아래쪽 블록 — 놓친 것이 없는지
     후속 조치 · 오래 안 본 업무 · 지난주에 끝낸 일
   ══════════════════════════════════════════════════════════ */
(function(){
  const nowEl   = document.getElementById('nowList');
  const board   = document.getElementById('board');
  if(!nowEl && !board) return;

  const STALE = 14;                 // 며칠 넘게 안 보면 '묻힌' 것으로 봅니다
  const T = WHEN.midnight();
  const ymd = WHEN.ymd;
  const shift = (d,n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };

  const today    = ymd(T);
  const weekEnd  = ymd(shift(T, 7));
  const staleAt  = new Date(Date.now() - STALE*86400000).toISOString();
  const lastWeek = new Date(Date.now() - 7*86400000).toISOString();

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  const daysSince = iso => Math.floor((Date.now() - new Date(iso)) / 86400000);

  /* ── 한 줄 ── */
  function row(t, opt){
    opt = opt || {};
    const u = WHEN.untilLabel(t.due_on);
    const meta = [];
    if(t.owner) meta.push(esc(t.owner));
    if(t.category) meta.push(esc(t.category));
    if(!opt.hideRepeat && t.repeat_rule) meta.push(WHEN.repeatLabel(t.repeat_rule));

    return '<div class="tk" data-id="' + t.id + '">'
      + (opt.done
          ? '<span class="tk-check done" aria-hidden="true">✓</span>'
          : '<button type="button" class="tk-check" data-do="done" aria-label="완료"><span></span></button>')
      + '<div class="tk-body">'
      +   '<b>' + esc(t.title) + '</b>'
      +   (opt.slim || !t.note ? '' : '<p>' + esc(t.note) + '</p>')
      +   '<span class="tk-meta">'
      +     (opt.seen ? '<i class="tk-when late">' + opt.seen + '</i>'
                      : '<i class="tk-when ' + u.tone + '">' + u.text + '</i>')
      +     (meta.length ? '<em>' + meta.join(' · ') + '</em>' : '')
      +   '</span>'
      + '</div>'
      + (opt.done || opt.slim ? '' :
          '<div class="tk-acts">'
          + '<button type="button" class="tk-btn" data-do="snooze" data-n="3">3일 뒤</button>'
          + '<button type="button" class="tk-btn" data-do="snooze" data-n="7">다음 주</button>'
          + '</div>')
      + '</div>';
  }

  function fill(el, rows, emptyText, opt){
    if(!el) return;
    el.innerHTML = rows.length
      ? '<div class="tks">' + rows.map(t => row(t, opt)).join('') + '</div>'
      : '<p class="card-empty">' + emptyText + '</p>';
  }

  function block(id, tag, title, hint, rows, opt){
    if(!rows.length) return '';
    return '<section class="blk' + (opt && opt.warn ? ' warn' : '') + '" id="' + id + '">'
      + '<div class="blk-head"><span class="tag">' + tag + '</span>'
      +   '<h2>' + title + '</h2><p>' + hint + '</p></div>'
      + '<div class="tks">' + rows.join('') + '</div>'
      + '</section>';
  }

  /* ── 불러오기 ── */
  async function load(){
    if(board) board.innerHTML = '';
    if(nowEl) nowEl.innerHTML = '<p class="card-empty">불러오는 중이에요…</p>';

    let all;
    try{
      all = await DB.q('tasks', 'select=*&status=eq.open&order=due_on.asc&limit=400');
    }catch(err){
      const m = '<p class="card-empty bad">불러오지 못했어요. ' + esc(err.message) + '</p>';
      if(nowEl) nowEl.innerHTML = m;
      return;
    }

    CAL.setTasks(all);
    if(typeof NOTIFY !== 'undefined') NOTIFY.setTasks(all);

    /* 위쪽 네 칸 */
    const now = all.filter(t => t.due_on && t.due_on <= today);
    fill(nowEl, now, '오늘까지인 일이 없어요.');
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

    /* 아래쪽 블록 */
    if(!board) return;
    let follow, stale, done;
    try{
      [follow, stale, done] = await Promise.all([
        DB.q('tasks', 'select=*&status=eq.open&follow_up_of=not.is.null&order=due_on.asc&limit=30'),
        DB.q('tasks', 'select=*&status=eq.open&last_seen_at=lt.' + staleAt + '&order=last_seen_at.asc&limit=30'),
        DB.q('tasks', 'select=*&status=eq.done&done_at=gte.' + lastWeek + '&order=done_at.desc&limit=30')
      ]);
    }catch(err){ return; }

    const shown = new Set(now.map(t => t.id));
    follow = follow.filter(t => !shown.has(t.id));
    follow.forEach(t => shown.add(t.id));
    stale = stale.filter(t => !shown.has(t.id));

    board.innerHTML =
        block('follow', 'FOLLOW UP', '후속 조치가 남았어요', '전에 한 일에서 이어진 것',
              follow.map(t => row(t)))
      + block('stale',  'FORGOTTEN', '오래 들여다보지 않았어요', STALE + '일 넘게 손대지 않은 업무',
              stale.map(t => row(t, { seen: daysSince(t.last_seen_at) + '일째 안 봄' })))
      + block('done',   'LAST WEEK', '지난 7일 동안 끝낸 일', '주간 보고에 그대로 쓰세요',
              done.map(t => row(t, { done:true })));

    if(stale.length) markSeen(stale.map(t => t.id));
  }

  function markSeen(ids){
    if(!ids.length) return;
    DB.update('tasks', 'id=in.(' + ids.join(',') + ')',
              { last_seen_at: new Date().toISOString() }).catch(()=>{});
  }

  /* ── 완료 · 미루기 ── */
  document.addEventListener('click', async e => {
    const btn = e.target.closest('.tk [data-do]');
    if(!btn) return;
    const card = btn.closest('.tk');
    const id = card.dataset.id;
    card.classList.add('busy');

    try{
      if(btn.dataset.do === 'snooze'){
        await DB.update('tasks', 'id=eq.' + id, {
          due_on: ymd(shift(T, Number(btn.dataset.n))),
          last_seen_at: new Date().toISOString()
        });
      }else{
        const cur = (await DB.q('tasks', 'select=*&id=eq.' + id))[0];
        const next = cur && WHEN.nextDue(cur.repeat_rule, cur.due_on);
        if(next){
          // 반복 업무는 사라지지 않고 다음 차례로 넘어갑니다
          await DB.update('tasks', 'id=eq.' + id,
                          { due_on: next, last_seen_at: new Date().toISOString() });
        }else{
          await DB.update('tasks', 'id=eq.' + id,
                          { status:'done', done_at: new Date().toISOString() });
          askFollowUp(cur);
        }
      }
      load();
    }catch(err){
      card.classList.remove('busy');
      alert('처리하지 못했어요. ' + err.message);
    }
  });

  /* 끝낼 때 한 번 묻습니다 — 이래야 후속 조치가 쌓입니다 */
  function askFollowUp(t){
    if(!t) return;
    const el = document.createElement('div');
    el.className = 'toast-wrap';
    el.innerHTML =
      '<div class="toast">'
      + '<button type="button" class="toast-x" aria-label="닫기">×</button>'
      + '<b>' + esc(t.title) + ' — 끝냈어요</b>'
      + '<ul><li>이어서 확인할 일이 있나요?</li></ul>'
      + '<button type="button" class="toast-go">후속 업무 담기</button>'
      + '</div>';
    document.body.appendChild(el);
    const kill = () => el.remove();
    el.querySelector('.toast-x').addEventListener('click', kill);
    el.querySelector('.toast-go').addEventListener('click', () => {
      kill();
      TaskForm.open({ follow_up_of: t.id, when: '다음 주' });
    });
    setTimeout(kill, 10000);
  }

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
