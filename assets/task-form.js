/* ══════════════════════════════════════════════════════════
   '잊지 말 업무 등록' 창.

   오른쪽 위 버튼이나 [data-newtask] 를 누르면 열립니다.
   날짜는 "3일 뒤", "매주 금요일"처럼 사람 말로 적으면
   아래에 해석 결과가 바로 보입니다.
   ══════════════════════════════════════════════════════════ */
const TaskForm = (function(){
  const CATS = ['시설','총무','인사','예산','계약','안전','비품','보고','기타'];
  let box = null;

  function close(){
    box?.remove();
    box = null;
    document.body.style.overflow = '';
  }

  function open(preset){
    if(box) return;
    preset = preset || {};

    box = document.createElement('div');
    box.className = 'modal';
    box.innerHTML =
      '<div class="modal-bg" data-close></div>'
      + '<form class="modal-box" role="dialog" aria-modal="true" aria-label="잊지 말 업무 등록">'
      + '<div class="modal-head"><b>잊지 말 업무</b>'
      +   '<button type="button" class="modal-x" data-close aria-label="닫기">×</button></div>'

      + '<label><span>무슨 일입니까</span>'
      +   '<textarea name="title" rows="2" maxlength="300" required '
      +   'placeholder="예: 소화기 유효기간 확인하고 대장에 기록"></textarea></label>'

      + '<label><span>언제 <em>사람 말로 적으셔도 됩니다</em></span>'
      +   '<input name="when" maxlength="60" autocomplete="off" '
      +   'placeholder="3일 뒤 · 다음 주 금요일 · 매주 금요일 · 매달 25일 · 9/15" '
      +   'value="' + (preset.when || '') + '"></label>'
      + '<p class="when-read" id="whenRead"></p>'

      + '<div class="modal-row">'
      +   '<label><span>담당자</span>'
      +     '<input name="owner" maxlength="60" list="ownerList" autocomplete="off" placeholder="이름"></label>'
      +   '<label><span>분류</span>'
      +     '<input name="category" maxlength="40" list="catList" autocomplete="off" placeholder="고르거나 직접 입력"></label>'
      + '</div>'
      + '<datalist id="catList">' + CATS.map(c => '<option value="'+c+'">').join('') + '</datalist>'
      + '<datalist id="ownerList"></datalist>'

      + '<label><span>메모 <em>선택</em></span>'
      +   '<textarea name="note" rows="2" maxlength="2000" '
      +   'placeholder="다음에 볼 때 도움이 될 내용"></textarea></label>'

      + '<button class="btn lg" type="submit">등록</button>'
      + '<p class="modal-msg" role="status" aria-live="polite"></p>'
      + '</form>';

    document.body.appendChild(box);
    document.body.style.overflow = 'hidden';

    const form = box.querySelector('form');
    const when = form.when;
    const read = box.querySelector('#whenRead');
    const msg  = box.querySelector('.modal-msg');
    const btn  = form.querySelector('button[type=submit]');

    /* 이미 쓴 담당자 이름을 골라 쓸 수 있게 */
    DB.q('tasks', 'select=owner&owner=not.is.null&limit=200').then(rows => {
      const names = [...new Set((rows||[]).map(r => r.owner).filter(Boolean))];
      box && (box.querySelector('#ownerList').innerHTML =
        names.map(n => '<option value="'+n.replace(/"/g,'&quot;')+'">').join(''));
    }).catch(()=>{});

    /* 적는 대로 해석 결과 보여주기 */
    function readWhen(){
      const v = when.value.trim();
      if(!v){ read.textContent = '비워두면 날짜 없는 업무로 담깁니다.'; read.className = 'when-read'; return null; }
      const r = WHEN.parseWhen(v);
      if(!r){
        read.textContent = '이 말은 아직 못 알아듣습니다. 9/15 처럼 날짜로 적어주십시오.';
        read.className = 'when-read bad';
        return null;
      }
      const d = new Date(r.due_on + 'T00:00:00');
      read.textContent = '→ ' + (d.getMonth()+1) + '월 ' + d.getDate() + '일'
        + ' (' + ['일','월','화','수','목','금','토'][d.getDay()] + ')'
        + (r.repeat ? ' 부터, ' + WHEN.repeatLabel(r.repeat) : '');
      read.className = 'when-read ok';
      return r;
    }
    when.addEventListener('input', readWhen);
    readWhen();

    box.addEventListener('click', e => { if(e.target.closest('[data-close]')) close(); });
    addEventListener('keydown', function esc(e){
      if(e.key === 'Escape'){ close(); removeEventListener('keydown', esc); }
    });
    form.title.focus();

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const title = form.title.value.trim();
      if(!title){ form.title.focus(); return; }

      const w = when.value.trim() ? WHEN.parseWhen(when.value.trim()) : null;
      if(when.value.trim() && !w){
        msg.textContent = '언제인지 알아듣지 못했습니다. 9/15 처럼 적어주십시오.';
        msg.classList.add('bad');
        when.focus();
        return;
      }

      btn.disabled = true;
      msg.className = 'modal-msg';
      msg.textContent = '담는 중입니다…';

      try{
        await DB.insert('tasks', {
          title: title,
          note: form.note.value.trim() || null,
          owner: form.owner.value.trim() || null,
          category: form.category.value.trim() || null,
          due_on: w ? w.due_on : null,
          repeat_rule: w ? w.repeat : null,
          follow_up_of: preset.follow_up_of || null
        });
        close();
        document.dispatchEvent(new CustomEvent('tasks:changed'));
      }catch(err){
        msg.textContent = err.message;
        msg.classList.add('bad');
        btn.disabled = false;
      }
    });
  }

  /* 버튼 연결 — 페이지 어디든 [data-newtask]면 열립니다 */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-newtask]');
    if(b){ e.preventDefault(); open({ follow_up_of: b.dataset.followup || null }); }
  });

  return { open, close };
})();
