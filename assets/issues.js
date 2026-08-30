/* ══════════════════════════════════════════════════════════
   불편사항 & 개선.

   왼쪽에 안쪽 메뉴, 오른쪽에 피드입니다.
   상태에 따라 카드가 옮겨 다닙니다.

     불편한 점(new) → 개선 아이디어(doing) → 개선한 것(done·dropped)

   왼쪽 메뉴의 숫자로 어디에 얼마나 쌓였는지 먼저 보이고,
   오른쪽에서 실제 내용을 봅니다. 지금 보고 있는 자리는
   화면에 들어온 칸을 따라 저절로 표시됩니다.

   적는 칸은 기본으로 접혀 있습니다. 대개는 쌓인 것을 보러 오지
   새로 적으러 오는 것이 아니라서, 펴 두면 목록이 아래로 밀립니다.

   같은 분류에 여러 건이 몰리면 '반복'이라고 표시합니다.
   무엇을 먼저 고쳐야 하는지는 대개 그 숫자가 알려줍니다.
   ══════════════════════════════════════════════════════════ */
(function(){
  const writeHost = document.getElementById('issueForm');
  const newHost   = document.getElementById('issueNew');
  const listHost  = document.getElementById('issueList');
  const doneHost  = document.getElementById('issueDone');
  if(!listHost) return;

  /* 비어 있는 칸 — 점선 상자 대신 흰 판에 안내만 둡니다.
     넣을 데가 있는 칸에만 작은 등록 단추를 답니다. */
  function empty(text, action){
    return '<div class="feed-empty">'
      + '<p>' + text + '</p>'
      + (action
          ? '<button type="button" class="feed-mini" data-empty="' + action + '">+ 등록</button>'
          : '')
      + '</div>';
  }

  /* 왼쪽 메뉴와 카드 머리에 같은 숫자가 붙습니다 */
  const count = (key, n) => {
    document.querySelectorAll('[data-cnt="' + key + '"]')
      .forEach(el => { el.textContent = n; });
  };

  const CATS = ['자료 찾기','반복 입력','승인·결재','연락·응대','시설','비품','일정','기타'];
  const PRIO = { high:'긴급 업무', normal:'일반 업무', low:'보류/여유 업무' };
  const STEP = { new:'접수', doing:'개선 중', done:'개선함', dropped:'접음' };

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  const day = iso => { const d = new Date(iso); return (d.getMonth()+1) + '월 ' + d.getDate() + '일'; };

  /* ── 적는 칸 ── */
  if(writeHost){
    writeHost.innerHTML =
      '<form class="isu-form" id="isuForm">'
      + '<label><span>불편한 점 작성란</span>'
      +   '<textarea name="body" rows="3" maxlength="2000" required '
      +   'placeholder="예: 매번 같은 자료를 찾느라 시간이 걸려요. 어디에 뒀는지 매번 헷갈려요."></textarea></label>'
      + '<div class="modal-row">'
      +   '<label><span>분류 <em>나중에 반복 여부를 보려면 골라두세요</em></span>'
      +     '<input name="category" maxlength="40" list="isuCats" autocomplete="off" placeholder="고르거나 직접 입력"></label>'
      +   '<label><span>작성자</span>'
      +     '<input name="writer" maxlength="60" autocomplete="off" placeholder="이름"></label>'
      + '</div>'
      + '<datalist id="isuCats">' + CATS.map(c => '<option value="'+c+'">').join('') + '</datalist>'
      + '<label><span>우선순위</span>'
      +   '<select name="priority">'
      +     '<option value="normal">일반 업무</option>'
      +     '<option value="high">긴급 업무</option>'
      +     '<option value="low">보류/여유 업무</option>'
      +   '</select></label>'
      + '<button class="btn lg" type="submit">기록</button>'
      + '<p class="modal-msg" role="status" aria-live="polite"></p>'
      + '</form>';

    /* 접고 펴기 */
    const toggle = document.getElementById('isuToggle');
    function setOpen(open){
      writeHost.hidden = !open;
      if(toggle){
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.textContent = open ? '접기' : '+ 등록';
      }
      if(open) writeHost.querySelector('textarea').focus();
    }
    if(toggle) toggle.addEventListener('click', () => setOpen(writeHost.hidden));

    /* 빈 칸의 점선 상자를 눌러도 적는 칸이 열립니다 */
    document.addEventListener('click', e => {
      if(e.target.closest('[data-empty="write"]')) setOpen(true);
    });

    const form = writeHost.querySelector('form');
    const msg  = writeHost.querySelector('.modal-msg');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const body = form.body.value.trim();
      if(body.length < 2){ form.body.focus(); return; }
      const btn = form.querySelector('button');
      btn.disabled = true;
      msg.className = 'modal-msg';
      msg.textContent = '담는 중이에요…';
      try{
        await DB.insert('improvements', {
          body: body,
          category: form.category.value.trim() || null,
          writer: form.writer.value.trim() || null,
          priority: form.priority.value
        });
        form.reset();
        msg.textContent = '';
        setOpen(false);
        load();
      }catch(err){
        msg.textContent = err.message;
        msg.classList.add('bad');
      }finally{ btn.disabled = false; }
    });
  }

  /* ── 한 건 그리기 ──
     칩은 [분류] [우선순위] [작성자] 순서로 왼쪽에, [작성일]은 오른쪽 끝에 둡니다. */
  const chip = (text, cls) =>
    '<span class="isu-chip' + (cls ? ' ' + cls : '') + '">' + esc(text) + '</span>';

  function card(x, repeat){
    const shut = x.status === 'done' || x.status === 'dropped';

    const acts = shut
      ? '<button type="button" class="tk-btn" data-do="reopen">다시 열기</button>'
      : '<button type="button" class="tk-btn" data-do="idea">'
        +   (x.idea ? '아이디어 고치기' : '아이디어 제안') + '</button>'
        + '<button type="button" class="tk-btn" data-do="task">업무로 만들기</button>'
        + '<button type="button" class="tk-btn on" data-do="done">개선 완료</button>';

    const prioCls = x.priority === 'high' ? 'hi' : x.priority === 'low' ? 'lo' : '';

    return '<div class="isu" data-id="' + x.id + '">'
      + '<div class="isu-top">'
      +   '<span class="isu-step s-' + x.status + '">' + STEP[x.status] + '</span>'
      +   (x.category ? chip(x.category) : '')
      +   chip(PRIO[x.priority] || PRIO.normal, prioCls)
      +   (x.writer ? chip(x.writer) : '')
      +   (repeat > 1 ? '<span class="isu-rep">비슷한 것 ' + repeat + '건</span>' : '')
      +   '<span class="isu-date">' + day(x.created_at) + '</span>'
      + '</div>'
      + '<p class="isu-body">' + esc(x.body) + '</p>'
      + (x.idea ? '<p class="isu-idea"><b>개선 아이디어</b>' + esc(x.idea) + '</p>' : '')

      /* 아이디어는 카드 안에서 바로 적습니다. 창을 띄우면 흐름이 끊깁니다.
         끝난 카드에는 적을 일이 없으니 아예 만들지 않습니다. */
      + (shut ? '' :
          '<div class="isu-write" hidden>'
          + '<textarea rows="2" maxlength="2000" '
          +   'placeholder="이 불편을 어떻게 없앨 수 있을까요?">' + esc(x.idea) + '</textarea>'
          + '<div class="isu-write-acts">'
          +   '<button type="button" class="tk-btn" data-do="idea-cancel">취소</button>'
          +   '<button type="button" class="tk-btn on" data-do="idea-save">저장</button>'
          + '</div>'
          + '</div>')

      /* 지우는 것은 되돌릴 수 없으니 다른 단추와 떼어 왼쪽에 둡니다 */
      + '<div class="isu-acts">'
      +   '<button type="button" class="tk-btn quiet" data-do="del">지우기</button>'
      +   '<span class="isu-acts-main">' + acts + '</span>'
      + '</div>'
      + '</div>';
  }

  /* ── 불러오기 ── */
  async function load(){
    listHost.innerHTML = '<p class="kan-load">불러오는 중이에요…</p>';
    let rows;
    try{
      rows = await DB.q('improvements', 'select=*&order=created_at.desc&limit=200');
    }catch(err){
      listHost.innerHTML = '<p class="kan-load bad">불러오지 못했어요. ' + esc(err.message) + '</p>';
      return;
    }

    // 같은 분류가 몇 건이나 되는지 — 반복되는 불편을 드러냅니다
    const seen = {};
    rows.forEach(r => { if(r.category) seen[r.category] = (seen[r.category]||0) + 1; });

    const fresh = rows.filter(r => r.status === 'new');
    const doing = rows.filter(r => r.status === 'doing');
    const shut  = rows.filter(r => r.status === 'done' || r.status === 'dropped');

    const draw = (host, list, emptyText, action) => {
      if(!host) return;
      host.innerHTML = list.length
        ? list.map(x => card(x, seen[x.category] || 1)).join('')
        : empty(emptyText, action);
    };

    draw(newHost,  fresh, '아직 기록된 불편함이 없어요.<br>눌러서 한 줄 적어보세요.', 'write');
    draw(listHost, doing, '아이디어를 적으면 여기로 옮겨져요.');
    draw(doneHost, shut,  '개선을 마친 업무나 아이디어가<br>여기에 하나씩 쌓여요.');

    count('new', fresh.length);
    count('doing', doing.length);
    count('done', shut.length);
  }

  /* ── 손보기 ── */
  document.addEventListener('click', async e => {
    const btn = e.target.closest('.isu [data-do]');
    if(!btn) return;
    const card = btn.closest('.isu');
    const id = card.dataset.id;
    const act = btn.dataset.do;

    try{
      if(act === 'idea' || act === 'idea-cancel'){
        /* 카드 안 적는 칸을 열고 닫습니다. 다시 그리지 않습니다. */
        const w = card.querySelector('.isu-write');
        const open = act === 'idea';
        w.hidden = !open;
        card.querySelector('.isu-acts').hidden = open;
        if(open) w.querySelector('textarea').focus();
        return;
      }
      else if(act === 'idea-save'){
        const v = card.querySelector('.isu-write textarea').value.trim();
        /* 아이디어를 적으면 '개선 중'으로 넘어갑니다. 따로 누를 것을 만들지 않습니다. */
        const patch = { idea: v || null };
        if(v && card.querySelector('.isu-step').classList.contains('s-new')) patch.status = 'doing';
        await DB.update('improvements', 'id=eq.' + id, patch);
      }
      else if(act === 'task'){
        const cur = (await DB.q('improvements', 'select=*&id=eq.' + id))[0];
        /* 마감을 일주일 뒤로 잡으면 이번 달 달력 밖으로 나가 아무 데도 안 보입니다.
           오늘로 잡아야 '지금 해야 할 일'과 달력 오늘 칸에 바로 뜹니다. */
        const t = await DB.insert('tasks', {
          title: (cur.idea || cur.body).slice(0,300),
          note: cur.idea ? ('불편사항: ' + cur.body) : null,
          category: cur.category || null,
          due_on: WHEN.ymd(WHEN.midnight())
        });
        await DB.update('improvements', 'id=eq.' + id,
                        { status:'doing', task_id: t[0].id });
        alert('업무로 담았어요. 메인 화면 \'지금 해야 할 일\'에 오늘 날짜로 들어갔어요.');
      }
      else if(act === 'reopen'){
        await DB.update('improvements', 'id=eq.' + id, { status:'new' });
      }
      else if(act === 'del'){
        if(!confirm('해당 항목을 삭제하시겠습니까? 삭제된 데이터는 복구되지 않습니다.')) return;
        await DB.remove('improvements', 'id=eq.' + id);
      }
      else {
        await DB.update('improvements', 'id=eq.' + id, { status: act });
      }
      load();
    }catch(err){
      alert('처리하지 못했어요. ' + err.message);
    }
  });

  /* ── 레퍼런스 ── */
  const refHost = document.getElementById('refList');
  const refBtn  = document.getElementById('refAdd');

  async function loadRefs(){
    if(!refHost) return;
    let rows;
    try{
      rows = await DB.q('refs', 'select=*&order=created_at.desc&limit=200');
    }catch(err){
      refHost.innerHTML = '<p class="kan-load bad">불러오지 못했어요. ' + esc(err.message) + '</p>';
      return;
    }
    refHost.innerHTML = rows.length
      ? rows.map(r =>
          '<div class="ref" data-id="' + r.id + '">'
          + '<div class="ref-top">'
          +   (r.tag ? '<span class="isu-cat">' + esc(r.tag) + '</span>' : '')
          +   '<span class="isu-date">' + day(r.created_at) + '</span>'
          + '</div>'
          + (r.url
              ? '<a class="ref-t" href="' + esc(r.url) + '" target="_blank" rel="noopener">'
                + esc(r.title) + ' ↗</a>'
              : '<b class="ref-t">' + esc(r.title) + '</b>')
          + (r.note ? '<p class="ref-n">' + esc(r.note) + '</p>' : '')
          + '<div class="isu-acts"><button type="button" class="tk-btn" data-ref="del">지우기</button></div>'
          + '</div>').join('')
      : empty('아직 담아둔 자료가 없어요.<br>참고할 글이나 아이디어를 담아두세요.', 'ref');
    count('ref', rows.length);
  }

  if(refBtn){
    document.addEventListener('click', e => {
      if(e.target.closest('[data-empty="ref"]')) refBtn.click();
    });
    refBtn.addEventListener('click', () => {
      if(document.getElementById('refForm')) return;
      const box = document.createElement('form');
      box.id = 'refForm';
      box.className = 'isu-form ref-form';
      box.innerHTML =
        '<label><span>제목</span><input name="title" maxlength="300" required placeholder="무엇을 참고했나요"></label>'
        + '<div class="modal-row">'
        +   '<label><span>링크 <em>선택</em></span><input name="url" maxlength="600" placeholder="https://"></label>'
        +   '<label><span>꼬리표 <em>선택</em></span><input name="tag" maxlength="40" placeholder="예: 응대, 서식"></label>'
        + '</div>'
        + '<label><span>메모 <em>선택</em></span><textarea name="note" rows="2" maxlength="1000" '
        +   'placeholder="왜 참고할 만한지 한 줄"></textarea></label>'
        + '<button class="btn lg" type="submit">담기</button>'
        + '<p class="modal-msg" role="status" aria-live="polite"></p>';
      refHost.parentNode.insertBefore(box, refHost);
      box.title.focus();

      box.addEventListener('submit', async e => {
        e.preventDefault();
        const t = box.title.value.trim();
        if(!t) return;
        const msg = box.querySelector('.modal-msg');
        msg.textContent = '담는 중이에요…';
        try{
          await DB.insert('refs', {
            title: t,
            url:  box.url.value.trim()  || null,
            tag:  box.tag.value.trim()  || null,
            note: box.note.value.trim() || null
          });
          box.remove();
          loadRefs();
        }catch(err){
          msg.textContent = err.message;
          msg.classList.add('bad');
        }
      });
    });
  }

  document.addEventListener('click', async e => {
    const b = e.target.closest('.ref [data-ref="del"]');
    if(!b) return;
    const card = b.closest('.ref');
    if(!confirm('해당 항목을 삭제하시겠습니까? 삭제된 데이터는 복구되지 않습니다.')) return;
    try{ await DB.remove('refs', 'id=eq.' + card.dataset.id); loadRefs(); }
    catch(err){ alert('지우지 못했어요. ' + err.message); }
  });

  /* ── 왼쪽 메뉴의 '지금 보는 곳' ──
     누르면 그 칸으로 가고, 굴려서 다른 칸이 들어오면 저절로 옮겨갑니다. */
  (function(){
    const items = [...document.querySelectorAll('.side-item')];
    if(!items.length) return;

    const mark = id => items.forEach(a =>
      a.classList.toggle('on', a.getAttribute('href') === '#' + id));

    items.forEach(a => a.addEventListener('click', () => {
      mark(a.getAttribute('href').slice(1));
    }));

    if(!('IntersectionObserver' in window)) return;
    const seen = new Map();
    const io = new IntersectionObserver(es => {
      es.forEach(e => seen.set(e.target.id, e.intersectionRatio));
      let best = null, top = 0;
      seen.forEach((v, k) => { if(v > top){ top = v; best = k; } });
      if(best) mark(best);
    }, { rootMargin: '-30% 0px -55% 0px', threshold: [0, .25, .5, 1] });

    items.forEach(a => {
      const el = document.getElementById(a.getAttribute('href').slice(1));
      if(el) io.observe(el);
    });
  })();

  DB.gate(() => { load(); loadRefs(); });
})();
