/* ══════════════════════════════════════════════════════════
   포트폴리오 내용 불러오기 · 관리자 편집.

   - 누구에게나: Supabase 의 portfolio 표(1행)에서 저장된 글을 읽어
     data-k 가 붙은 자리에 덮어씁니다. 못 읽으면 HTML 에 적힌 처음 값이 그대로 보입니다.
   - 관리자(index.html?admin, admin.html 이 이리로 보냄):
     팀 암호로 로그인하면 글을 그 자리에서 고치고 사진을 올려 저장할 수 있습니다.

   ★ 보안
     읽기는 누구나(anon), 쓰기는 로그인한 사람만 — supabase/schema.sql 의 정책이 정합니다.
     글은 늘 textContent 로만 넣습니다. innerHTML 을 쓰지 마세요(남의 코드가 끼어들 수 있음).
   ══════════════════════════════════════════════════════════ */
(function(){
  const BASE = SUPABASE.url.replace(/\/rest\/v1\/?$/, '');
  const ROW  = BASE + '/rest/v1/portfolio?id=eq.1&select=data';
  const ADMIN = /[?&]admin(=|&|$)/.test(location.search);
  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];

  let data = {};          // 지금 화면에 반영된 저장 값
  let dirty = false;

  /* ── 화면에 넣기 ── */
  const PHOTO_OK = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
  function setLink(el){
    const t = el.textContent.trim(), kind = el.dataset.link;
    if(!kind || !t){ el.removeAttribute('href'); return; }
    const href = kind === 'mailto' ? 'mailto:' + t
               : kind === 'tel'    ? 'tel:' + t.replace(/[^\d+]/g, '')
               : (/^https?:\/\//.test(t) ? t : 'https://' + t);
    el.setAttribute('href', href);
    if(kind === 'https'){ el.target = '_blank'; el.rel = 'noopener'; }
  }
  function setPhoto(src){
    const fig = $('#photo'); if(!fig) return;
    fig.textContent = '';
    if(src && PHOTO_OK.test(src)){
      const img = document.createElement('img');
      img.src = src; img.alt = '프로필 사진';
      fig.appendChild(img);
    }
  }
  function apply(d){
    $$('[data-k]').forEach(el => {
      const v = d[el.dataset.k];
      if(typeof v === 'string') el.textContent = v;
      setLink(el);
    });
    setPhoto(d.photo);
  }

  async function load(){
    try{
      const res = await fetch(ROW, { headers:{ apikey: SUPABASE.key }, cache:'no-store' });
      if(!res.ok) return;
      const rows = await res.json();
      if(rows && rows[0] && rows[0].data && typeof rows[0].data === 'object'){
        data = rows[0].data; apply(data);
      }
    }catch(e){ /* 못 읽으면 처음 값 그대로 둡니다 */ }
  }

  if(!ADMIN){ $$('[data-link]').forEach(setLink); load(); return; }

  /* ══════════════ 여기부터 관리자 ══════════════ */
  document.documentElement.classList.add('is-admin');
  const meta = document.createElement('meta'); meta.name = 'robots'; meta.content = 'noindex, nofollow';
  document.head.appendChild(meta);

  function loadScript(src){
    return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.body.appendChild(s); });
  }

  /* ── 로그인 창 ── */
  function loginBox(){
    return new Promise(resolve => {
      const wrap = document.createElement('div');
      wrap.className = 'pf-login';
      wrap.innerHTML =
          '<form class="pf-login-box">'
        +   '<b>관리자 로그인</b>'
        +   '<p>팀 암호를 입력해 주세요. 업무 공간과 같은 암호예요.</p>'
        +   '<input type="password" autocomplete="current-password" placeholder="암호" aria-label="팀 암호" required>'
        +   '<button type="submit">들어가기</button>'
        +   '<span class="msg" role="status" aria-live="polite"></span>'
        +   '<a href="index.html">← 포트폴리오로 돌아가기</a>'
        + '</form>';
      document.body.appendChild(wrap);
      const form = $('form', wrap), pw = $('input', wrap), msg = $('.msg', wrap), btn = $('button', wrap);
      pw.focus();
      form.addEventListener('submit', async e => {
        e.preventDefault();
        btn.disabled = true; msg.textContent = '확인 중이에요…'; msg.classList.remove('bad');
        try{ await DB.login(pw.value); wrap.remove(); resolve(); }
        catch(err){ msg.textContent = err.message; msg.classList.add('bad'); pw.select(); }
        finally{ btn.disabled = false; }
      });
    });
  }

  /* ── 아래 편집 막대 ── */
  let bar, state;
  function buildBar(){
    bar = document.createElement('div');
    bar.className = 'pf-bar';
    bar.innerHTML =
        '<span class="pf-state">관리자 모드 · 글을 눌러 바로 고치세요</span>'
      + '<label class="pf-b">사진 바꾸기<input type="file" accept="image/*" hidden></label>'
      + '<button class="pf-b" type="button" data-act="nophoto">사진 지우기</button>'
      + '<a class="pf-b" href="index.html" target="_blank" rel="noopener">공개 화면 ↗</a>'
      + '<button class="pf-b" type="button" data-act="logout">로그아웃</button>'
      + '<button class="pf-b pri" type="button" data-act="save">저장</button>';
    document.body.appendChild(bar);
    state = $('.pf-state', bar);
    $('input[type=file]', bar).addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if(f) pickPhoto(f); });
    bar.addEventListener('click', e => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if(act === 'save') save();
      if(act === 'nophoto'){ data.photo = ''; setPhoto(''); markDirty(); }
      if(act === 'logout'){ if(dirty && !confirm('저장하지 않은 변경이 있어요. 그래도 나갈까요?')) return; dirty = false; DB.logout(); location.href = 'index.html'; }
    });
  }
  function say(t, bad){ state.textContent = t; state.classList.toggle('bad', !!bad); }
  function markDirty(){ dirty = true; say('저장하지 않은 변경이 있어요'); bar.classList.add('dirty'); }

  /* ── 글 고치기 ── */
  function enableEdit(){
    $$('[data-k]').forEach(el => {
      el.setAttribute('contenteditable', 'plaintext-only');
      if(el.contentEditable !== 'plaintext-only') el.setAttribute('contenteditable', 'true');   // 지원 안 하는 브라우저
      el.spellcheck = false;
      el.addEventListener('input', markDirty);
      /* 붙여넣기는 글자만 받습니다 (서식·그림이 섞여 들어오지 않게) */
      el.addEventListener('paste', e => { e.preventDefault(); const t = (e.clipboardData || window.clipboardData).getData('text'); document.execCommand('insertText', false, t); });
      /* 한 줄짜리 자리에서는 Enter 로 줄을 바꾸지 않습니다 */
      if(!el.matches('p, span[data-k^="s"], [data-k="about"], [data-k="about2"]'))
        el.addEventListener('keydown', e => { if(e.key === 'Enter' && !e.isComposing){ e.preventDefault(); el.blur(); } });
    });
    /* 카드·연락처가 링크라서 누르면 이동해 버립니다. 관리자 화면에서는 막습니다 */
    document.addEventListener('click', e => { if(e.target.closest('a[href]') && !e.target.closest('.pf-bar')) e.preventDefault(); }, true);
    $('#photo').addEventListener('click', () => $('input[type=file]', bar).click());
    addEventListener('beforeunload', e => { if(dirty){ e.preventDefault(); e.returnValue = ''; } });
  }

  /* ── 사진: 브라우저에서 줄여서 글자(data URL)로 저장 ── */
  function pickPhoto(file){
    if(!/^image\//.test(file.type)){ say('그림 파일만 올릴 수 있어요', true); return; }
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 900, k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      data.photo = c.toDataURL('image/jpeg', 0.85);
      setPhoto(data.photo); markDirty();
    };
    img.onerror = () => { URL.revokeObjectURL(url); say('사진을 읽지 못했어요', true); };
    img.src = url;
  }

  /* ── 저장 ── */
  async function save(){
    const next = { photo: data.photo || '' };
    $$('[data-k]').forEach(el => { next[el.dataset.k] = el.innerText.replace(/ /g, ' ').replace(/\n{3,}/g, '\n\n').trim(); });
    say('저장 중이에요…');
    try{
      const rows = await DB.update('portfolio', 'id=eq.1', { data: next, updated_at: new Date().toISOString() });
      if(!rows || !rows.length) await DB.insert('portfolio', { id: 1, data: next });
      data = next; dirty = false; bar.classList.remove('dirty');
      $$('[data-link]').forEach(setLink);
      say('저장했어요 · ' + new Date().toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit' }));
    }catch(err){
      say(/로그인/.test(err.message) ? '로그인이 풀렸어요. 새로고침한 뒤 다시 들어와 주세요.' : '저장하지 못했어요: ' + err.message, true);
    }
  }

  (async function start(){
    await load();
    try{ await loadScript('assets/db.js?v=20261121d'); }
    catch(e){ alert('로그인 기능을 불러오지 못했어요. 새로고침해 주세요.'); return; }
    if(!DB.isIn()) await loginBox();
    buildBar(); enableEdit();
  })();
})();
