/* ══════════════════════════════════════════════════════════
   로그인과 데이터 읽기·쓰기.

   ★ 2026-11-21 부터 암호 없이 씁니다. 주소를 아는 누구나 읽고 씁니다.

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
    let res;
    try{
      res = await fetch(AUTH + '/token?grant_type=password', {
        method:'POST',
        headers:{ 'apikey':KEY, 'Content-Type':'application/json' },
        body: JSON.stringify({ email: SUPABASE.teamEmail, password: password })
      });
    }catch(e){
      /* 서버가 응답조차 안 한 경우. 인터넷이 끊겼거나, Supabase 프로젝트가
         멈춘 것입니다. 무료 요금제는 한동안 안 쓰면 일시정지되고, 지우면
         주소 자체가 사라집니다. 암호 문제가 아닌데 암호 탓을 하게 되므로
         무엇을 봐야 하는지 알려줍니다. */
      throw new Error(navigator.onLine === false
        ? '인터넷이 끊겨 있어요. 연결을 확인해 주세요.'
        : 'Supabase에 닿지 않아요. 프로젝트가 일시정지됐거나 지워졌을 수 있어요. '
          + '대시보드(supabase.com)에서 프로젝트 상태를 확인해 주세요.');
    }
    if(!res.ok){
      const e = await res.json().catch(()=>({}));
      const raw = (e.error_description || e.msg || e.message || '').toLowerCase();
      throw new Error(
        raw.includes('invalid login')   ? '암호가 맞지 않아요.'
      : raw.includes('email not confirmed') ? '계정이 아직 확인되지 않았어요. 대시보드에서 Auto Confirm을 켜주세요.'
      : raw.includes('too many')       ? '시도가 너무 잦아요. 잠시 뒤 다시 해주세요.'
      : '들어가지 못했어요. 잠시 뒤 다시 해주세요.'
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
     예전에 로그인해 둔 토큰이 있으면 붙이고, 없으면 공개 키만으로 부릅니다.
     (2026-11-21 부터 암호 없이 씁니다. 표 정책이 anon 에게도 열려 있습니다) */
  async function call(path, opts, retried){
    const t = await token();
    const auth = t ? { 'Authorization': 'Bearer ' + t } : {};

    const res = await fetch(REST + path, Object.assign({}, opts, {
      headers: Object.assign({
        'apikey': KEY,
        'Content-Type': 'application/json'
      }, auth, (opts && opts.headers) || {})
    }));

    if(res.ok) return res.status === 204 ? null : res.json().catch(()=>null);

    const e = await res.json().catch(()=>({}));
    const raw = (e.message || e.msg || '').toLowerCase();

    /* 토큰이 거절되는 경우가 있습니다. 흔한 것이 'JWT issued at future' 로,
       발급 시각이 서버 기준으로 미래라 생깁니다(시계 어긋남).
       한 번은 새 토큰을 받아 조용히 다시 시도합니다. */
    const badToken = res.status === 401 || res.status === 403
      || raw.includes('jwt') || raw.includes('token');
    if(badToken && !retried && t){
      if(await refresh()) return call(path, opts, true);
      keep(null);                                  // 옛 토큰을 버리고 공개 키로 다시 부릅니다
      return call(path, opts, true);
    }

    throw new Error(
      raw.includes('jwt') ? '인증이 거절됐어요. 새로고침해 주세요.'
                          : (e.message || '요청 실패 (' + res.status + ')')
    );
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

  /* ── 들어가기 ──
     예전에는 여기서 팀 암호를 물었습니다. 지금은 암호 없이 바로 엽니다.
     부르는 쪽(home.js, issues.js)을 그대로 두려고 이름만 남겨둡니다.
     암호를 되살리려면 git log 에서 '암호를 없앤다' 커밋 바로 앞의 gate() 를 가져오고,
     supabase/schema.sql 의 정책을 'to authenticated' 로 되돌리십시오. */
  function gate(done){ done(); }

  return { login, logout, isIn, q, insert, update, remove, gate };
})();
