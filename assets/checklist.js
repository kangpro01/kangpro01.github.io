/* ══════════════════════════════════════════════════════════
   체크리스트 화면.

   목록은 assets/checklists.js 에 있습니다. 여기는 그리기와 저장만 합니다.

   체크는 이 브라우저에만 남습니다. 사람마다 따로 쓰는 점검표라
   굳이 공유하지 않습니다. 주기가 지나면 저절로 비워집니다.
   ══════════════════════════════════════════════════════════ */
(function(){
  const host = document.getElementById('checklists');
  if(!host || typeof CHECKLISTS === 'undefined') return;

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

  /* ── 저장 (막힌 환경이면 메모리로) ── */
  const mem = {};
  const store = {
    get(k){ try{ const v = localStorage.getItem(k); return v === null ? (mem[k] ?? null) : v; }
            catch(e){ return mem[k] ?? null; } },
    set(k,v){ mem[k] = v; try{ localStorage.setItem(k,v); }catch(e){} }
  };

  const pad = n => String(n).padStart(2,'0');
  const today = () => { const d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); };

  /* 주기가 바뀌면 체크를 비웁니다 */
  function periodKey(cycle){
    if(cycle === 'week'){
      const d = new Date(); d.setHours(0,0,0,0);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));      // 그 주 월요일
      return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
    }
    if(cycle === 'day') return today();
    return 'fixed';
  }

  function load(list){
    const key = 'check.' + list.id;
    let saved;
    try{ saved = JSON.parse(store.get(key) || '{}'); }catch(e){ saved = {}; }
    if(saved.p !== periodKey(list.cycle)) saved = { p: periodKey(list.cycle), v: {} };
    return saved;
  }
  const save = (list, state) => store.set('check.' + list.id, JSON.stringify(state));

  /* ── 그리기 ── */
  function render(){
    host.innerHTML = CHECKLISTS.map(list => {
      const state = load(list);
      const all = list.groups.reduce((n,g) => n + g.items.length, 0);
      const on  = Object.values(state.v).filter(Boolean).length;

      return '<section class="cl" id="' + esc(list.id) + '" data-list="' + esc(list.id) + '">'
        + '<div class="cl-head">'
        +   '<div><h2>' + esc(list.name) + '</h2>'
        +     (list.note ? '<p>' + esc(list.note) + '</p>' : '') + '</div>'
        +   '<div class="cl-right">'
        +     '<span class="cl-count"><b>' + on + '</b> / ' + all + '</span>'
        +     '<button type="button" class="ics" data-reset>모두 지우기</button>'
        +   '</div>'
        + '</div>'
        + '<div class="cl-bar"><i style="width:' + (all ? on/all*100 : 0) + '%"></i></div>'
        + list.groups.map((g, gi) =>
            '<div class="cl-grp">'
            + '<b>' + esc(g.t) + '</b>'
            + g.items.map((it, ii) => {
                const k = gi + '-' + ii;
                const done = !!state.v[k];
                return '<label class="cl-item' + (done ? ' done' : '') + '">'
                  + '<input type="checkbox" data-k="' + k + '"' + (done ? ' checked' : '') + '>'
                  + '<span>' + esc(it) + '</span></label>';
              }).join('')
            + '</div>').join('')
        + '</section>';
    }).join('');
  }

  /* 체크한 자리만 고칩니다. 통째로 다시 그리면 연속으로 체크할 때
     키보드 초점이 날아가고 화면이 깜빡입니다. */
  function refreshCount(sec, list){
    const all = list.groups.reduce((n,g) => n + g.items.length, 0);
    const on  = sec.querySelectorAll('input[data-k]:checked').length;
    sec.querySelector('.cl-count').innerHTML = '<b>' + on + '</b> / ' + all;
    sec.querySelector('.cl-bar i').style.width = (all ? on/all*100 : 0) + '%';
  }

  host.addEventListener('change', e => {
    const box = e.target.closest('input[data-k]');
    if(!box) return;
    const sec = box.closest('[data-list]');
    const list = CHECKLISTS.find(l => l.id === sec.dataset.list);
    const state = load(list);

    if(box.checked) state.v[box.dataset.k] = true;
    else delete state.v[box.dataset.k];
    save(list, state);

    box.closest('.cl-item').classList.toggle('done', box.checked);
    refreshCount(sec, list);
  });

  host.addEventListener('click', e => {
    if(!e.target.closest('[data-reset]')) return;
    const id = e.target.closest('[data-list]').dataset.list;
    const list = CHECKLISTS.find(l => l.id === id);
    save(list, { p: periodKey(list.cycle), v: {} });
    render();
  });

  render();
})();
