/* ══════════════════════════════════════════════════════════
   '업무추가' 창. 담아둔 업무를 고치고 지우는 창이기도 합니다.

   [data-newtask] 를 누르면 새로 담는 창이,
   open({ task: 행 }) 으로 열면 고치는 창이 됩니다.

   날짜는 "3일 뒤", "매주 금요일"처럼 사람 말로 적으면
   아래에 해석 결과가 바로 보입니다.
   ══════════════════════════════════════════════════════════ */
const TaskForm = (function(){
  const CATS = ['시설','총무','인사','예산','계약','안전','비품','보고','기타'];
  let box = null;

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

  function close(){
    box?.remove();
    box = null;
    document.body.style.overflow = '';
  }

  /* 고칠 때 '언제' 칸에 미리 넣어둘 말 */
  function whenOf(t){
    if(t.repeat_rule) return WHEN.repeatLabel(t.repeat_rule);
    if(t.due_on){
      const d = new Date(t.due_on + 'T00:00:00');
      return (d.getMonth()+1) + '/' + d.getDate();
    }
    return '';
  }

  function open(preset){
    if(box) return;
    preset = preset || {};

    const task = preset.task || null;          // 있으면 고치는 창
    const initWhen = task ? whenOf(task) : (preset.when || '');

    box = document.createElement('div');
    box.className = 'modal';
    box.innerHTML =
      '<div class="modal-bg" data-close></div>'
      + '<form class="modal-box" role="dialog" aria-modal="true" aria-label="업무추가">'
      + '<div class="modal-head"><b>' + (task ? '업무 고치기' : '업무추가') + '</b>'
      +   '<button type="button" class="modal-x" data-close aria-label="닫기">×</button></div>'

      + '<label><span>업무 내용 입력</span>'
      +   '<textarea name="title" rows="2" maxlength="300" required '
      +   'placeholder="예: 소화기 유효기간 확인하고 대장에 기록">'
      +   (task ? esc(task.title) : '') + '</textarea></label>'

      + '<label><span>일정</span>'
      +   '<input name="when" maxlength="60" autocomplete="off" '
      +   'placeholder="3일 뒤 · 다음 주 금요일 · 매주 금요일 · 매달 25일 · 9/15" '
      +   'value="' + esc(initWhen) + '"></label>'
      + '<p class="when-read" id="whenRead"></p>'

      + '<div class="modal-row">'
      +   '<label><span>담당자</span>'
      +     '<input name="owner" maxlength="60" list="ownerList" autocomplete="off" placeholder="이름" '
      +     'value="' + esc(task && task.owner) + '"></label>'
      +   '<label><span>분류</span>'
      +     '<input name="category" maxlength="40" list="catList" autocomplete="off" placeholder="고르거나 직접 입력" '
      +     'value="' + esc(task && task.category) + '"></label>'
      + '</div>'
      + '<datalist id="catList">' + CATS.map(c => '<option value="'+c+'">').join('') + '</datalist>'
      + '<datalist id="ownerList"></datalist>'

      + '<label><span>메모</span>'
      +   '<textarea name="note" rows="2" maxlength="2000" '
      +   'placeholder="다음에 볼 때 도움이 될 내용">'
      +   (task ? esc(task.note) : '') + '</textarea></label>'

      + '<div class="modal-foot">'
      +   (task ? '<button type="button" class="modal-del" id="taskDel">지우기</button>' : '')
      +   '<button class="btn lg" type="submit">' + (task ? '저장' : '등록') + '</button>'
      + '</div>'
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
      if(!v){ read.textContent = '비워두면 날짜 없는 업무로 담겨요.'; read.className = 'when-read'; return null; }
      const r = WHEN.parseWhen(v);
      if(!r){
        read.textContent = '이 말은 아직 못 알아들어요. 9/15 처럼 날짜로 적어주세요.';
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

    /* 지우기 — 되돌릴 수 없으니 한 번 물어봅니다 */
    const del = box.querySelector('#taskDel');
    if(del) del.addEventListener('click', async () => {
      if(!confirm('해당 항목을 삭제하시겠습니까? 삭제된 데이터는 복구되지 않습니다.')) return;
      del.disabled = true;
      msg.className = 'modal-msg';
      msg.textContent = '지우는 중이에요…';
      try{
        await DB.remove('tasks', 'id=eq.' + task.id);
        close();
        document.dispatchEvent(new CustomEvent('tasks:changed'));
      }catch(err){
        msg.textContent = err.message;
        msg.classList.add('bad');
        del.disabled = false;
      }
    });

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
        msg.textContent = '언제인지 알아듣지 못했어요. 9/15 처럼 적어주세요.';
        msg.classList.add('bad');
        when.focus();
        return;
      }

      btn.disabled = true;
      msg.className = 'modal-msg';
      msg.textContent = task ? '저장하는 중이에요…' : '담는 중이에요…';

      const common = {
        title: title,
        note: form.note.value.trim() || null,
        owner: form.owner.value.trim() || null,
        category: form.category.value.trim() || null
      };

      try{
        if(task){
          /* '언제' 칸을 건드리지 않았으면 날짜는 그대로 둡니다.
             다시 해석하면 '매주 금요일'이 다음 금요일로 밀려버립니다. */
          if(when.value.trim() !== initWhen){
            common.due_on = w ? w.due_on : null;
            common.repeat_rule = w ? w.repeat : null;
          }
          await DB.update('tasks', 'id=eq.' + task.id, common);
        }else{
          common.due_on = w ? w.due_on : null;
          common.repeat_rule = w ? w.repeat : null;
          common.follow_up_of = preset.follow_up_of || null;
          await DB.insert('tasks', common);
        }
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
    if(b){
      e.preventDefault();
      open({ follow_up_of: b.dataset.followup || null, when: b.dataset.when || '' });
    }
  });

  return { open, close };
})();
