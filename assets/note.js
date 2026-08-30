/* ══════════════════════════════════════════════════════════
   메모 & 스크랩.

   일정이 아닌 것을 담는 자리입니다.
   떠오른 생각, 브라우저에서 복사해 온 링크, 이따 볼 임시 메모.
   날짜를 정하라고 묻지 않습니다. 묻는 순간 적기가 귀찮아지고,
   귀찮으면 안 적게 되어서 결국 잊습니다.

   담아둔 것 중 정말 해야 할 일이 되면 '업무로'를 눌러
   오늘 날짜의 업무로 옮깁니다. 그때부터는 리마인더가 챙깁니다.
   ══════════════════════════════════════════════════════════ */
const NOTE = (function(){
  const form = document.getElementById('noteForm');
  const text = document.getElementById('noteText');
  const list = document.getElementById('noteList');
  const msg  = document.getElementById('noteMsg');
  if(!form || !text || !list) return { load(){} };

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

  let rows = [];

  /* ── 링크 ──
     글 속의 주소를 눌러서 열 수 있게 바꿉니다. 주소를 그대로 두면
     한 줄을 다 잡아먹으므로 http:// 를 떼고 길면 줄여 보여줍니다.
     주소 바깥은 escape 하고, 주소는 href 와 글자를 따로 escape 합니다.
     통째로 escape 하면 주소 안의 & 가 &amp; 로 바뀌어 링크가 깨집니다. */
  const URL_RE = /https?:\/\/[^\s<>"']+/g;

  function shortUrl(u){
    const s = u.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return s.length > 44 ? s.slice(0, 41) + '…' : s;
  }

  function linkify(s){
    let out = '', last = 0, m;
    URL_RE.lastIndex = 0;
    while((m = URL_RE.exec(s)) !== null){
      out += esc(s.slice(last, m.index));
      out += '<a class="note-link" href="' + esc(m[0]) + '"'
           + ' target="_blank" rel="noopener noreferrer">' + esc(shortUrl(m[0])) + '</a>';
      last = m.index + m[0].length;
    }
    return (out + esc(s.slice(last))).replace(/\n/g, '<br>');
  }

  /* 언제 적었는지. 오늘 적은 것은 시각까지, 그 앞은 날짜만. */
  function when(iso){
    if(!iso) return '';
    const d = new Date(iso);
    if(isNaN(d)) return '';
    const t = WHEN.midnight();
    const days = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - t) / 86400000);
    const hhmm = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    if(days === 0)  return '오늘 ' + hhmm;
    if(days === -1) return '어제 ' + hhmm;
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
  }

  /* 잠깐 뜨는 한 줄. 옮긴 업무가 화면 밖에 있을 수도 있어서 둡니다. */
  let msgTimer = 0;
  function say(t){
    if(!msg) return;
    msg.textContent = t;
    msg.hidden = !t;
    clearTimeout(msgTimer);
    if(t) msgTimer = setTimeout(() => { msg.hidden = true; }, 4000);
  }

  function card(n){
    return '<article class="note" data-id="' + esc(n.id) + '">'
      +   '<p class="note-b">' + linkify(n.body) + '</p>'
      +   '<div class="note-foot">'
      +     '<time>' + esc(when(n.created_at)) + '</time>'
      +     '<span class="note-acts">'
      +       '<button type="button" class="tk-btn" data-note="task">업무로</button>'
      +       '<button type="button" class="tk-btn" data-note="del">지우기</button>'
      +     '</span>'
      +   '</div>'
      + '</article>';
  }

  function draw(){
    list.innerHTML = rows.length
      ? rows.map(card).join('')
      : '<p class="card-empty">떠오른 것을 여기에 적어두세요.<br>링크를 붙여 넣어도 돼요.</p>';
  }

  async function load(){
    list.innerHTML = '<p class="card-empty">불러오는 중이에요…</p>';
    try{
      rows = await DB.q('notes', 'select=*&order=created_at.desc&limit=100') || [];
    }catch(err){
      /* 표를 아직 만들지 않았을 때가 대부분입니다 */
      const miss = /not exist|not find|schema cache|404/i.test(err.message);
      list.innerHTML = '<p class="card-empty bad">' + esc(miss
        ? 'notes 표가 아직 없어요. supabase/schema.sql 을 대시보드 SQL Editor에서 실행해 주세요.'
        : '불러오지 못했어요. ' + err.message) + '</p>';
      return;
    }
    draw();
  }

  /* ── 담기 ── */
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const body = text.value.trim();
    if(!body) { text.focus(); return; }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try{
      const made = await DB.insert('notes', { body: body.slice(0, 2000) });
      rows.unshift((made && made[0]) || { id:'', body:body, created_at:new Date().toISOString() });
      text.value = '';
      fit();
      draw();
      say('');
    }catch(err){
      say('담지 못했어요. ' + err.message);
    }
    btn.disabled = false;
    text.focus();
  });

  /* Ctrl(⌘)+Enter 로도 담깁니다. 줄바꿈이 필요한 메모가 있어서
     Enter 하나로 보내지는 않습니다. */
  text.addEventListener('keydown', e => {
    if(e.key === 'Enter' && (e.ctrlKey || e.metaKey)){
      e.preventDefault();
      form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', {cancelable:true}));
    }
  });

  /* 적는 만큼 칸이 늘어납니다. 두 줄에서 시작해 다섯 줄까지. */
  function fit(){
    text.style.height = 'auto';
    text.style.height = Math.min(text.scrollHeight, 132) + 'px';
  }
  text.addEventListener('input', fit);

  /* ── 업무로 옮기기 · 지우기 ── */
  list.addEventListener('click', async e => {
    const btn = e.target.closest('[data-note]');
    if(!btn) return;
    const el = btn.closest('.note');
    const id = el.dataset.id;
    const row = rows.find(r => String(r.id) === id);
    if(!row) return;

    if(btn.dataset.note === 'del'){
      if(!confirm('해당 항목을 삭제하시겠습니까? 삭제된 데이터는 복구되지 않습니다.')) return;
      el.classList.add('busy');
      try{
        await DB.remove('notes', 'id=eq.' + id);
        rows = rows.filter(r => String(r.id) !== id);
        draw();
      }catch(err){
        el.classList.remove('busy');
        say('지우지 못했어요. ' + err.message);
      }
      return;
    }

    /* 업무로. 오늘 날짜로 넣습니다. 언제까지인지는 나중에 고치면 됩니다. */
    el.classList.add('busy');
    try{
      await DB.insert('tasks', {
        title: row.body.slice(0, 300),
        due_on: WHEN.ymd(WHEN.midnight())
      });
      await DB.remove('notes', 'id=eq.' + id);
      rows = rows.filter(r => String(r.id) !== id);
      draw();
      say('\'지금 해야 할 일\'로 옮겼어요.');
      document.dispatchEvent(new CustomEvent('tasks:changed'));
    }catch(err){
      el.classList.remove('busy');
      say('옮기지 못했어요. ' + err.message);
    }
  });

  return { load };
})();
