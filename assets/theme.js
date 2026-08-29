/* ══════════════════════════════════════════════════════════
   밝게 / 어둡게.

   이 파일만 <head> 안에서 먼저 실행됩니다. 화면이 그려지기 전에
   골라둔 값을 붙여야 어두운 화면에서 흰 화면이 한 번 번쩍이지 않습니다.
   그래서 site.js 와 달리 문서 맨 위에 둡니다.

   아무것도 고르지 않았으면 기기 설정을 따릅니다(CSS의 prefers-color-scheme).
   단추를 눌러 고르면 그 선택이 우선하고 다음에 와도 유지됩니다.

   단추를 만들고 누르는 동작은 assets/site.js 에 있습니다.
   ══════════════════════════════════════════════════════════ */
const THEME = (function(){
  const KEY = 'kp.theme';
  const root = document.documentElement;

  /* localStorage 가 막힌 환경이 있습니다. 죽지 않게 감쌉니다. */
  const read = () => { try{ return localStorage.getItem(KEY); }catch(e){ return null; } };
  const write = v => { try{ localStorage.setItem(KEY, v); }catch(e){} };

  /* 고른 값이 있으면 지금 바로 붙입니다 */
  const saved = read();
  if(saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved);

  /* 지금 어느 쪽인가 — 고른 값이 없으면 기기 설정을 봅니다 */
  function now(){
    const set = root.getAttribute('data-theme');
    if(set === 'dark' || set === 'light') return set;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function set(v){
    root.setAttribute('data-theme', v);
    write(v);
    document.dispatchEvent(new CustomEvent('theme:changed', { detail: v }));
  }

  const toggle = () => set(now() === 'dark' ? 'light' : 'dark');

  return { now, set, toggle };
})();
