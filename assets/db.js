/* ══════════════════════════════════════════════════════════
   로그인과 데이터 읽기·쓰기.

   팀이 공유하는 계정 하나로 로그인합니다.
   화면에서는 암호 한 칸만 물어보고, 계정 주소는 아래 설정에서 가져옵니다.

   ★ 왜 자바스크립트로 암호를 비교하지 않는가
     그렇게 하면 화면만 가릴 뿐 데이터는 못 지킵니다. 공개 키가 소스에
     들어 있어서, 사이트를 거치지 않고 데이터베이스에 직접 물어보면
     그대로 읽힙니다. 그래서 진짜 로그인을 씁니다. 암호가 틀리면
     서버가 토큰을 주지 않고, 토큰이 없으면 아무것도 읽히지 않습니다.

   외부 라이브러리를 쓰지 않습니다. Supabase의 REST 규격을 직접 부릅니다.
   ══════════════════════════════════════════════════════════ */
const DB = (function(){
  const BASE = SUPABASE.url.replace(/\/rest\/v1\/?$/, '');   // 프로젝트 루트
  const REST = BASE + '/rest/v1';
  const AUTH = BASE + '/auth/v1';
  const KEY  = SUPABASE.key;

  /* ── 저장 (막힌 환경이면 메모리로) ── */
  const mem = {};
  const store = {
    get(k){ try{ const v = localStorage.getItem(k); return v === null ? (mem[k] ?? null) : v; }
            catch(e){ return mem[k] ?? null; } },
    set(k,v){ mem[k] = v; try{ localStorage.setItem(k,v); }catch(e){} },
    del(k){ delete mem[k]; try{ localStorage.removeItem(k); }catch(e){} }
  };
  const SKEY = 'kp.session';

  let session = (function(){
    try{ return JSON.parse(store.get(SKEY) || 'null'); }catch(e){ return null; }
  })();

  function keep(s){
    session = s
      ? { access_token:s.access_token, refresh_token:s.refresh_token,
          expires_at: Date.now() + (s.expires_in || 3600) * 1000 - 60000 }
      : null;
    if(session) store.set(SKEY, JSON.stringify(session));
    else store.del(SKEY);
  }

  /* ── 로그인 ── */
  async function login(password){
    const res = await fetch(AUTH + '/token?grant_type=password', {
      method:'POST',
      headers:{ 'apikey':KEY, 'Content-Type':'application/json' },
      body: JSON.stringify({ email: SUPABASE.teamEmail, password: password })
    });
    if(!res.ok){
      const e = await res.json().catch(()=>({}));
      const raw = (e.error_description || e.msg || e.message || '').toLowerCase();
      throw new Error(
        raw.includes('invalid login')   ? '암호가 맞지 않습니다.'
      : raw.includes('email not confirmed') ? '계정이 아직 확인되지 않았습니다. 대시보드에서 Auto Confirm을 켜주십시오.'
      : raw.includes('too many')       ? '시도가 잦습니다. 잠시 뒤 다시 해주십시오.'
      : raw.includes('failed to fetch')? '연결하지 못했습니다. 인터넷을 확인해 주십시오.'
      : '들어가지 못했습니다. 잠시 뒤 다시 해주십시오.'
      );
    }
    keep(await res.json());
    return true;
  }

  function logout(){ keep(null); }

  /* ── 토큰 갱신 ── */
  async function refresh(){
    if(!session?.refresh_token) return false;
    const res = await fetch(AUTH + '/token?grant_type=refresh_token', {
      method:'POST',
      headers:{ 'apikey':KEY, 'Content-Type':'application/json' },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    if(!res.ok){ keep(null); return false; }
    keep(await res.json());
    return true;
  }

  async function token(){
    if(!session) return null;
    if(Date.now() >= session.expires_at && !(await refresh())) return null;
    return session.access_token;
  }

  const isIn = () => !!session;

  /* ── 표 다루기 ──
     q('tasks', {select, order, eq, ...})  읽기
     insert / update / remove              쓰기
     모두 로그인 토큰을 붙입니다. 없으면 서버가 거절합니다. */
  async function call(path, opts){
    const t = await token();
    if(!t) throw new Error('로그인이 필요합니다.');
    const res = await fetch(REST + path, Object.assign({}, opts, {
      headers: Object.assign({
        'apikey': KEY,
        'Authorization': 'Bearer ' + t,
        'Content-Type': 'application/json'
      }, (opts && opts.headers) || {})
    }));
    if(!res.ok){
      const e = await res.json().catch(()=>({}));
      throw new Error(e.message || ('요청 실패 (' + res.status + ')'));
    }
    return res.status === 204 ? null : res.json().catch(()=>null);
  }

  const q = (table, query) => call('/' + table + (query ? '?' + query : ''), { method:'GET' });

  const insert = (table, row) => call('/' + table, {
    method:'POST', headers:{ 'Prefer':'return=representation' },
    body: JSON.stringify(row)
  });

  const update = (table, query, patch) => call('/' + table + '?' + query, {
    method:'PATCH', headers:{ 'Prefer':'return=representation' },
    body: JSON.stringify(patch)
  });

  const remove = (table, query) => call('/' + table + '?' + query, { method:'DELETE' });

  /* ── 암호 물어보는 화면 ──
     로그인이 필요한 페이지에서 DB.gate()를 부르면
     로그인될 때까지 화면을 덮고, 끝나면 done()을 실행합니다. */
  function gate(done){
    if(isIn()){ done(); return; }

    const el = document.createElement('div');
    el.className = 'gate';
    el.innerHTML =
      '<form class="gate-box">'
      + '<b>일 잘하는 강프로</b>'
      + '<p>팀 암호를 입력하십시오.</p>'
      + '<input type="password" id="gatePw" autocomplete="current-password" '
      +   'placeholder="암호" aria-label="팀 암호" required>'
      + '<button class="btn lg" type="submit">들어가기</button>'
      + '<span class="gate-msg" role="status" aria-live="polite"></span>'
      + '</form>';
    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';

    const form = el.querySelector('form');
    const pw   = el.querySelector('#gatePw');
    const msg  = el.querySelector('.gate-msg');
    const btn  = el.querySelector('button');
    pw.focus();

    form.addEventListener('submit', async e => {
      e.preventDefault();
      btn.disabled = true;
      msg.textContent = '확인 중입니다…';
      msg.classList.remove('bad');
      try{
        await login(pw.value);
        el.remove();
        document.body.style.overflow = '';
        done();
      }catch(err){
        msg.textContent = err.message;
        msg.classList.add('bad');
        pw.select();
      }finally{
        btn.disabled = false;
      }
    });
  }

  return { login, logout, isIn, q, insert, update, remove, gate };
})();
