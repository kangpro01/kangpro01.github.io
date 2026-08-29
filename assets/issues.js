/* ══════════════════════════════════════════════════════════
   불편사항 & 개선.

   흐름 — 불편한 점 기록 → 개선 아이디어 → 업무로 옮김 → 쌓임

   같은 분류에 여러 건이 몰리면 '반복'이라고 표시합니다.
   무엇을 먼저 고쳐야 하는지는 대개 그 숫자가 알려줍니다.
   ══════════════════════════════════════════════════════════ */
(function(){
  const writeHost = document.getElementById('issueForm');
  const listHost  = document.getElementById('issueList');
  const doneHost  = document.getElementById('issueDone');
  if(!listHost) return;

  const CATS = ['자료 찾기','반복 입력','승인·결재','연락·응대','시설','비품','일정','기타'];
  const PRIO = { high:'급함', normal:'보통', low:'천천히' };
  const STEP = { new:'접수', doing:'개선 중', done:'개선함', dropped:'접음' };

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  const day = iso => { const d = new Date(iso); return (d.getMonth()+1) + '월 ' + d.getDate() + '일'; };

  /* ── 적는 칸 ── */
  if(writeHost){
    writeHost.innerHTML =
      '<form class="isu-form" id="isuForm">'
      + '<label><span>무엇이 불편하십니까</span>'
      +   '<textarea name="body" rows="3" maxlength="2000" required '
      +   'placeholder="예: 매번 같은 자료를 찾느라 시간이 걸립니다. 어디에 뒀는지 매번 헷갈립니다."></textarea></label>'
      + '<div class="modal-row">'
      +   '<label><span>분류 <em>나중에 반복 여부를 보려면 골라두십시오</em></span>'
      +     '<input name="category" maxlength="40" list="isuCats" autocomplete="off" placeholder="고르거나 직접 입력"></label>'
      +   '<label><span>적은 사람</span>'
      +     '<input name="writer" maxlength="60" autocomplete="off" placeholder="이름"></label>'
      + '</div>'
      + '<datalist id="isuCats">' + CATS.map(c => '<option value="'+c+'">').join('') + '</datalist>'
      + '<label><span>얼마나 급합니까</span>'
      +   '<select name="priority">'
      +     '<option value="normal">보통</option>'
      +     '<option value="high">급함</option>'
      +     '<option value="low">천천히</option>'
      +   '</select></label>'
      + '<button class="btn lg" type="submit">기록</button>'
      + '<p class="modal-msg" role="status" aria-live="polite"></p>'
      + '</form>';

    const form = writeHost.querySelector('form');
    const msg  = writeHost.querySelector('.modal-msg');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const body = form.body.value.trim();
      if(body.length < 2){ form.body.focus(); return; }
      const btn = form.querySelector('button');
      btn.disabled = true;
      msg.className = 'modal-msg';
      msg.textContent = '담는 중입니다…';
      try{
        await DB.insert('improvements', {
          body: body,
          category: form.category.value.trim() || null,
          writer: form.writer.value.trim() || null,
          priority: form.priority.value
        });
        form.reset();
        msg.textContent = '기록했습니다.';
        load();
      }catch(err){
        msg.textContent = err.message;
        msg.classList.add('bad');
      }finally{ btn.disabled = false; }
    });
  }

  /* ── 한 건 그리기 ── */
  function card(x, repeat){
    const acts = x.status === 'done' || x.status === 'dropped'
      ? '<button type="button" class="tk-btn" data-do="reopen">다시 열기</button>'
      : '<button type="button" class="tk-btn" data-do="idea">개선 아이디어</button>'
        + '<button type="button" class="tk-btn" data-do="task">업무로 만들기</button>'
        + (x.status === 'new' ? '<button type="button" class="tk-btn" data-do="doing">개선 시작</button>' : '')
        + '<button type="button" class="tk-btn" data-do="done">개선 완료</button>';

    return '<div class="isu" data-id="' + x.id + '">'
      + '<div class="isu-top">'
      +   '<span class="isu-step s-' + x.status + '">' + STEP[x.status] + '</span>'
      +   (x.priority === 'high' ? '<span class="isu-prio">급함</span>' : '')
      +   (x.category ? '<span class="isu-cat">' + esc(x.category) + '</span>' : '')
      +   (repeat > 1 ? '<span class="isu-rep">비슷한 것 ' + repeat + '건</span>' : '')
      +   '<span class="isu-date">' + day(x.created_at) + (x.writer ? ' · ' + esc(x.writer) : '') + '</span>'
      + '</div>'
      + '<p class="isu-body">' + esc(x.body) + '</p>'
      + (x.idea ? '<p class="isu-idea"><b>개선 아이디어</b>' + esc(x.idea) + '</p>' : '')
      + '<div class="isu-acts">' + acts + '</div>'
      + '</div>';
  }

  /* ── 불러오기 ── */
  async function load(){
    listHost.innerHTML = '<p class="board-load">불러오는 중입니다…</p>';
    let rows;
    try{
      rows = await DB.q('improvements', 'select=*&order=created_at.desc&limit=200');
    }catch(err){
      listHost.innerHTML = '<p class="board-load bad">불러오지 못했습니다. ' + esc(err.message) + '</p>';
      return;
    }

    // 같은 분류가 몇 건이나 되는지 — 반복되는 불편을 드러냅니다
    const count = {};
    rows.forEach(r => { if(r.category) count[r.category] = (count[r.category]||0) + 1; });

    const open = rows.filter(r => r.status === 'new' || r.status === 'doing');
    const shut = rows.filter(r => r.status === 'done' || r.status === 'dropped');

    listHost.innerHTML = open.length
      ? open.map(x => card(x, count[x.category] || 1)).join('')
      : '<p class="board-load">아직 기록된 불편이 없습니다. 위에 한 줄 적어보십시오.</p>';

    if(doneHost){
      doneHost.innerHTML = shut.length
        ? shut.map(x => card(x, count[x.category] || 1)).join('')
        : '<p class="board-load">개선을 마친 것이 여기에 쌓입니다.</p>';
    }
  }

  /* ── 손보기 ── */
  document.addEventListener('click', async e => {
    const btn = e.target.closest('.isu [data-do]');
    if(!btn) return;
    const card = btn.closest('.isu');
    const id = card.dataset.id;
    const act = btn.dataset.do;

    try{
      if(act === 'idea'){
        const cur = (await DB.q('improvements', 'select=idea&id=eq.' + id))[0];
        const v = prompt('이 불편을 어떻게 없앨 수 있겠습니까?', cur?.idea || '');
        if(v === null) return;
        await DB.update('improvements', 'id=eq.' + id, { idea: v.trim() || null });
      }
      else if(act === 'task'){
        const cur = (await DB.q('improvements', 'select=*&id=eq.' + id))[0];
        const t = await DB.insert('tasks', {
          title: (cur.idea || cur.body).slice(0,300),
          note: cur.idea ? ('불편사항: ' + cur.body) : null,
          category: cur.category || null,
          due_on: WHEN.ymd(new Date(Date.now() + 7*86400000))
        });
        await DB.update('improvements', 'id=eq.' + id,
                        { status:'doing', task_id: t[0].id });
        alert('업무로 담았습니다. 메인 화면에서 보실 수 있습니다.');
      }
      else if(act === 'reopen'){
        await DB.update('improvements', 'id=eq.' + id, { status:'new' });
      }
      else {
        await DB.update('improvements', 'id=eq.' + id, { status: act });
      }
      load();
    }catch(err){
      alert('처리하지 못했습니다. ' + err.message);
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
      refHost.innerHTML = '<p class="board-load bad">불러오지 못했습니다. ' + esc(err.message) + '</p>';
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
      : '<p class="board-load">아직 담아둔 레퍼런스가 없습니다. 참고할 글이나 사례를 담아두십시오.</p>';
  }

  if(refBtn){
    refBtn.addEventListener('click', () => {
      if(document.getElementById('refForm')) return;
      const box = document.createElement('form');
      box.id = 'refForm';
      box.className = 'isu-form ref-form';
      box.innerHTML =
        '<label><span>제목</span><input name="title" maxlength="300" required placeholder="무엇을 참고했습니까"></label>'
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
        msg.textContent = '담는 중입니다…';
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
    if(!confirm('이 레퍼런스를 지웁니까?')) return;
    try{ await DB.remove('refs', 'id=eq.' + card.dataset.id); loadRefs(); }
    catch(err){ alert('지우지 못했습니다. ' + err.message); }
  });

  DB.gate(() => { load(); loadRefs(); });
})();
