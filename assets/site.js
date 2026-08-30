/* ══════════════════════════════════════════════════════════
   메뉴는 여기 한 곳에서만 고치면 모든 페이지에 반영됩니다.
   file  : 연결할 파일 이름
   name  : 화면에 보이는 이름
   sub   : 하위 메뉴 (없으면 생략)
   ══════════════════════════════════════════════════════════ */
const SITE = {
  logo: 'ㄱㅍㄹ',
  title: '일 잘하는 강프로',
  /* 업무추가 단추. 상단 바에는 두지 않고, 삼선을 눌러 열리는
     서랍 맨 아래와 모바일 하단 고정 자리에 놓습니다. */
  cta: { name: '＋ 업무추가', newtask: true },
  menu: [
    { file:'index.html', name:'업무 리마인더', sub:[
      { file:'index.html#daily',   name:'일간 업무' },
      { file:'index.html#weekly',  name:'주간 업무' },
      { file:'index.html#monthly', name:'월간 업무' }
    ]},
    { file:'issues.html', name:'문제 & 개선', sub:[
      { file:'issues.html#write', name:'불편한 점' },
      { file:'issues.html#list',  name:'개선 아이디어' },
      { file:'issues.html#ref',   name:'레퍼런스' }
    ]},
    /* 도구를 늘리면 assets/tools.js 와 여기 두 곳에 적습니다 */
    { file:'tools.html', name:'업무Tools', sub:[
      { file:'tool-lounge.html',  name:'라운지 운영 체크리스트' },
      { file:'tool-receipt.html', name:'영수증 한번에 정리' },
      { file:'tool-qr.html',      name:'QR 코드 생성기' }
    ]},
    { file:'attic.html',  name:'딴짓창고', sub:[
      { file:'game.html', name:'피지컬 120s' }
    ]}
  ]
};

(function(){
  const here = (location.pathname.split('/').pop() || 'index.html');
  const isOn = f => f.split('#')[0] === here;
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

  /* newtask면 업무 등록 창을 열고, 아니면 링크로 갑니다. */
  const ctaHtml = () => SITE.cta.newtask
    ? '<button class="btn" type="button" data-newtask>' + esc(SITE.cta.name) + '</button>'
    : '<a class="btn" href="' + SITE.cta.file + '">' + esc(SITE.cta.name) + '</a>';

  /* ── 상단 바 ── */
  let nav = '<nav class="gnb"><div class="wrap">'
    + '<a class="logo" href="index.html" aria-label="' + esc(SITE.title) + ' — 홈으로">'
    +   '<span>' + esc(SITE.title) + '</span>'
    + '</a>'
    + '<ul class="menu">';

  for(const m of SITE.menu){
    const on = isOn(m.file) ? ' on' : '';
    if(m.sub && m.sub.length){
      nav += '<li class="has-sub"><a class="' + on.trim() + '" href="' + m.file + '">' + esc(m.name) + ' <em>▾</em></a>'
           + '<div class="sub"><ul>'
           + m.sub.map(x => '<li><a href="' + x.file + '">' + esc(x.name) + '</a></li>').join('')
           + '</ul></div></li>';
    }else{
      nav += '<li><a class="' + on.trim() + '" href="' + m.file + '">' + esc(m.name) + '</a></li>';
    }
  }

  nav += '</ul><div class="gnb-right">'
      + '<button class="theme" id="theme" type="button" aria-label="어둡게 보기">'
      +   '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
      +     'stroke-linecap="round" aria-hidden="true">'
      +     '<circle cx="12" cy="12" r="4.2"/>'
      +     '<path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M19.1 4.9l-1.5 1.5M6.4 17.6l-1.5 1.5"/>'
      +   '</svg>'
      +   '<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
      +     'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      +     '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>'
      +   '</svg>'
      + '</button>'
      + '<button class="burger" id="burger" aria-label="메뉴 열기" aria-expanded="false" aria-controls="drawer">'
      +   '<span></span><span></span>'
      + '</button>'
      + '</div></div></nav>';

  /* ── 서랍 ──
     삼선을 누르면 열립니다. 메뉴 전체가 한 화면에 보이게 칸으로 나눕니다.
     칸 제목이 곧 그 페이지로 가는 링크입니다. '전체 보기'를 따로 두면
     칸마다 같은 말이 네 번 반복될 뿐입니다. */
  let drawer = '<div class="drawer" id="drawer" hidden><div class="drawer-in">'
             + '<div class="drawer-grid">';
  for(const m of SITE.menu){
    drawer += '<div class="drawer-col">'
           +   '<a class="drawer-title' + (isOn(m.file) ? ' on' : '') + '" href="' + m.file + '">'
           +     esc(m.name) + '</a>'
           +   (m.sub ? m.sub.map(x =>
                 '<a class="drawer-sub" href="' + x.file + '">' + esc(x.name) + '</a>').join('') : '')
           + '</div>';
  }
  drawer += '</div></div></div>';

  const head = document.getElementById('site-header');
  if(head) head.outerHTML = nav + drawer;

  /* ── 아래 고정 버튼 + 푸터 ── */
  const foot = document.getElementById('site-footer');
  if(foot){
    foot.outerHTML =
      '<footer><div class="wrap">'
      + '<span>© 2026 강프로</span>'
      + '</div></footer>'
      + '<div class="dock">' + ctaHtml() + '</div>';
  }

  /* ── 햄버거 동작 ── */
  const burger = document.getElementById('burger');
  const dw = document.getElementById('drawer');
  if(burger && dw){
    const setOpen = open => {
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
      dw.hidden = !open;
      document.body.classList.toggle('drawer-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', ()=> setOpen(dw.hidden));
    /* 링크를 고르면 닫히고, 빈 곳을 눌러도 닫힙니다 */
    dw.addEventListener('click', e=>{
      if(e.target.tagName === 'A'
         || e.target.closest('[data-newtask]')
         || !e.target.closest('.drawer-grid')) setOpen(false);
    });
    addEventListener('keydown', e=>{ if(e.key==='Escape' && !dw.hidden) setOpen(false); });
  }

  /* ── 밝기 단추 ──
     실제 전환은 assets/theme.js 가 합니다. 여기서는 누르는 것만 잇습니다. */
  const themeBtn = document.getElementById('theme');
  if(themeBtn && typeof THEME !== 'undefined'){
    const label = () => {
      themeBtn.setAttribute('aria-label', THEME.now() === 'dark' ? '밝게 보기' : '어둡게 보기');
    };
    label();
    themeBtn.addEventListener('click', () => { THEME.toggle(); label(); });
  }

  /* 업무 등록 창은 메인과 '문제 & 개선'에만 실려 있습니다.
     도구 목록이나 딴짓창고에서 누르면 메인으로 보내 거기서 열리게 합니다. */
  document.addEventListener('click', e => {
    if(!e.target.closest('[data-newtask]')) return;
    if(typeof TaskForm !== 'undefined') return;
    e.preventDefault();
    location.href = 'index.html#new';
  });
})();
