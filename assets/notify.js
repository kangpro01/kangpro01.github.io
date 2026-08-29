/* ══════════════════════════════════════════════════════════
   리마인더 알림.

   ★ 한계를 먼저 적어둡니다.
     이 사이트는 서버가 없는 정적 파일입니다. 그래서 사이트를 닫아둔 사이에
     폰 알람처럼 울리는 알림은 만들 수 없습니다. 그건 푸시 서버가 필요합니다.
     여기서 하는 일은 "사이트를 열었을 때 그때까지 할 일을 알려주는" 것입니다.
     진짜 알람이 필요하면 리마인더 페이지의 '담기'로 캘린더에 넣으십시오.

   동작
     일간 — 오늘 할 일이 있으면 하루 한 번
     주간 — 앞으로 7일 안의 할 일을 주 한 번
     월간 — 이 달 할 일을 달 한 번
     지연·임박 — 마감이 지났거나 이틀 안인 일을 하루 한 번

   시각
     '아침 09:00' 을 고르면 그 시각 전에는 알리지 않습니다.
     서버가 없으니 그 시각에 울리는 것이 아니라, 그 시각을 지나
     처음 들어왔을 때 알린다는 뜻입니다.

   알림 방식
     '브라우저 Push' 를 켜두고 권한이 있으면 시스템 알림으로,
     아니면 화면 위 쪽지로 띄웁니다.
     이메일은 보낼 서버가 없어 아직 고를 수 없습니다.
   ══════════════════════════════════════════════════════════ */
const NOTIFY = (function(){
  let tasks = [];        // 담아둔 업무. home.js가 불러온 뒤 넣어줍니다.

  const KINDS = [
    { k:'daily',   name:'일간', desc:'오늘까지인 일' },
    { k:'weekly',  name:'주간', desc:'앞으로 7일 안' },
    { k:'monthly', name:'월간', desc:'이 달 안' },
    { k:'soon',    name:'지연 및 마감 임박', desc:'지난 일과 이틀 안', sep:true }
  ];

  /* 알릴 시각 — 고른 시각 전에는 알리지 않습니다 */
  const HOURS = [
    ['',   '아무 때나'],
    ['8',  '아침 08:00'], ['9',  '아침 09:00'], ['10', '오전 10:00'],
    ['12', '점심 12:00'], ['14', '오후 14:00'], ['18', '저녁 18:00']
  ];

  /* ── 저장 (막힌 환경이면 메모리로) ── */
  const mem = {};
  const store = {
    get(k){ try{ const v = localStorage.getItem(k); return v === null ? (mem[k] ?? null) : v; }
            catch(e){ return mem[k] ?? null; } },
    set(k,v){ mem[k] = v; try{ localStorage.setItem(k,v); }catch(e){} }
  };
  const isOn  = k => store.get('notify.' + k) === '1';
  const setOn = (k,v) => store.set('notify.' + k, v ? '1' : '0');
  const atOf  = k => store.get('notify.at.' + k) ?? '9';
  const setAt = (k,v) => store.set('notify.at.' + k, v);
  /* 알림 수단. 지금 고를 수 있는 것은 브라우저 Push 뿐입니다. */
  const pushOn = () => store.get('notify.ch.push') !== '0';

  /* ── 날짜 ── */
  const NOW = new Date();
  const Y = NOW.getFullYear(), M = NOW.getMonth() + 1, D = NOW.getDate();
  const midnight = new Date(Y, NOW.getMonth(), D);
  const pad = n => String(n).padStart(2,'0');
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());

  /* 같은 기간에 두 번 알리지 않기 위한 열쇠 */
  function periodKey(kind){
    if(kind === 'daily' || kind === 'soon') return ymd(midnight);
    if(kind === 'monthly') return Y + '-' + pad(M);
    const mon = new Date(midnight);              // 그 주의 월요일
    mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
    return ymd(mon);
  }

  /* ── 무엇이 걸려 있나 ──
     마감일이 지난 것은 어느 쪽에서든 함께 알립니다. 놓친 것이 먼저이기 때문입니다. */
  function due(kind){
    const upto =
        kind === 'daily'  ? ymd(midnight)
      : kind === 'soon'   ? ymd(new Date(Y, NOW.getMonth(), D + 2))    // 지난 일 + 이틀 안
      : kind === 'weekly' ? ymd(new Date(Y, NOW.getMonth(), D + 7))
      :                     ymd(new Date(Y, NOW.getMonth() + 1, 0));   // 이 달 말일

    return tasks
      .filter(t => t.due_on && t.due_on <= upto)
      .sort((a,b) => a.due_on.localeCompare(b.due_on))
      .map(t => {
        const d = new Date(t.due_on + 'T00:00:00');
        return { t: t.title, d: d.getDate(), m: d.getMonth() + 1 };
      });
  }

  /* ── 화면 위 쪽지 (알림 권한이 없을 때) ──
     여러 개가 동시에 뜰 수 있으므로 덮어쓰지 않고 아래로 쌓습니다. */
  function toast(title, lines){
    let wrap = document.querySelector('.toast-wrap');
    if(!wrap){
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<button type="button" class="toast-x" aria-label="알림 닫기">×</button>'
      + '<b>' + title + '</b>'
      + '<ul>' + lines.map(l => '<li>' + l + '</li>').join('') + '</ul>';
    el.querySelector('.toast-x').addEventListener('click', () => el.remove());
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 12000);
  }

  function fire(kind, list){
    const label = KINDS.find(x => x.k === kind).name;
    const title = label + ' 리마인더 · ' + list.length + '건';
    const lines = list.slice(0,3).map(x => x.m + '월 ' + x.d + '일 · ' + x.t);
    if(list.length > 3) lines.push('그 밖에 ' + (list.length - 3) + '건');

    if(pushOn() && 'Notification' in window && Notification.permission === 'granted'){
      try{
        new Notification(title, { body: lines.join('\n'), icon: 'assets/favicon.svg' });
        return;
      }catch(e){ /* 실패하면 아래 쪽지로 */ }
    }
    toast(title, lines);
  }

  /* ── 켜져 있는 것만, 기간당 한 번 ──
     only를 주면 그 종류만 봅니다. 스위치 하나를 켰을 때
     켜져 있던 나머지까지 다시 뜨지 않게 하려는 것입니다. */
  function run(force, only){
    KINDS.forEach(({k}) => {
      if(only && k !== only) return;
      if(!isOn(k)) return;
      /* 고른 시각 전이면 넘어갑니다. 다음에 들어올 때 다시 봅니다. */
      const at = atOf(k);
      if(!force && at && NOW.getHours() < Number(at)) return;
      const key = periodKey(k);
      if(!force && store.get('notify.last.' + k) === key) return;
      const list = due(k);
      if(!list.length) return;
      store.set('notify.last.' + k, key);
      fire(k, list);
    });
  }

  /* ── 설정 화면 ── */
  const host = document.getElementById('notifySwitches');
  if(host){
    const hourOpts = k => HOURS.map(([v, t]) =>
      '<option value="' + v + '"' + (atOf(k) === v ? ' selected' : '') + '>' + t + '</option>'
    ).join('');

    host.innerHTML =
      /* 알림 수단 */
      '<div class="ntf-ch">'
      +   '<button type="button" class="ntf-chip' + (pushOn() ? ' on' : '') + '" data-ch="push"'
      +     ' aria-pressed="' + (pushOn() ? 'true' : 'false') + '">브라우저 Push</button>'
      +   '<button type="button" class="ntf-chip" data-ch="mail" disabled'
      +     ' title="보낼 서버가 없어 아직 못 씁니다">이메일</button>'
      + '</div>'

      + KINDS.map(({k, name, desc, sep}) =>
          (sep ? '<hr class="ntf-sep">' : '')
          + '<div class="ntf-row">'
          +   '<span class="ntf-name"><b>' + name + '</b><span>' + desc + '</span></span>'
          +   '<label class="tgl">'
          +     '<input type="checkbox" data-k="' + k + '"' + (isOn(k) ? ' checked' : '')
          +       ' aria-label="' + name + ' 알림"><i></i>'
          +   '</label>'
          + '</div>'
          + '<div class="ntf-when" data-for="' + k + '"' + (isOn(k) ? '' : ' hidden') + '>'
          +   '<select data-at="' + k + '" aria-label="' + name + ' 알릴 시각">'
          +     hourOpts(k)
          +   '</select>'
          + '</div>'
        ).join('')

      + '<button type="button" class="ics" id="notifyTest">지금 한 번 보기</button>'
      + '<p class="switch-state" id="notifyState"></p>';

    const state = host.querySelector('#notifyState');

    function paintState(){
      if(!('Notification' in window)){
        state.textContent = '이 브라우저는 시스템 알림을 지원하지 않아요. 화면 위 쪽지로 알려드려요.';
        return;
      }
      if(!pushOn()){
        state.textContent = '화면 위 쪽지로 알려드려요.';
        return;
      }
      const p = Notification.permission;
      state.textContent =
        p === 'granted' ? '시스템 알림으로 받아요.'
      : p === 'denied'  ? '알림이 차단돼 있어 화면 위 쪽지로 알려드려요. 주소창의 자물쇠에서 바꿀 수 있어요.'
                        : '켜면 알림 권한을 물어봐요. 거절해도 화면 위 쪽지로 알려드려요.';
    }
    paintState();

    /* 알림 수단 칩 */
    host.addEventListener('click', e => {
      const chip = e.target.closest('.ntf-chip[data-ch="push"]');
      if(!chip) return;
      const next = !pushOn();
      store.set('notify.ch.push', next ? '1' : '0');
      chip.classList.toggle('on', next);
      chip.setAttribute('aria-pressed', next ? 'true' : 'false');
      paintState();
    });

    /* 알릴 시각 */
    host.addEventListener('change', e => {
      const sel = e.target.closest('select[data-at]');
      if(!sel) return;
      setAt(sel.dataset.at, sel.value);
    });

    host.addEventListener('change', async e => {
      const box = e.target.closest('input[data-k]');
      if(!box) return;
      setOn(box.dataset.k, box.checked);

      const when = host.querySelector('.ntf-when[data-for="' + box.dataset.k + '"]');
      if(when) when.hidden = !box.checked;

      // 권한 요청은 사용자가 직접 켤 때만 (브라우저 규칙)
      if(box.checked && pushOn() && 'Notification' in window && Notification.permission === 'default'){
        try{ await Notification.requestPermission(); }catch(e){}
      }
      paintState();
      if(box.checked) run(true, box.dataset.k);
    });

    host.querySelector('#notifyTest').addEventListener('click', () => {
      const on = KINDS.filter(({k}) => isOn(k));
      if(!on.length){ toast('켜진 알림이 없어요', ['위에서 하나 이상 켜주세요.']); return; }
      let shown = false;
      on.forEach(({k}) => { const l = due(k); if(l.length){ fire(k, l); shown = true; } });
      if(!shown) toast('지금은 알릴 것이 없어요', ['켜두면 해당하는 날에 알려드려요.']);
    });
  }

  /* 업무를 불러온 뒤 넣어주면 그때 판단합니다.
     로그인 전에는 알릴 것이 없으므로 아무 일도 하지 않습니다. */
  return {
    setTasks(rows){ tasks = rows || []; run(false); }
  };
})();
