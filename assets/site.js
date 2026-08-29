/* ══════════════════════════════════════════════════════════
   메뉴는 여기 한 곳에서만 고치면 모든 페이지에 반영됩니다.
   file  : 연결할 파일 이름
   name  : 화면에 보이는 이름
   sub   : 하위 메뉴 (없으면 생략)
   ══════════════════════════════════════════════════════════ */
const SITE = {
  logo: 'ㄱㅍㄹ',
  title: '일 잘하는 강프로',
  /* 오른쪽 위 버튼 — 링크가 아니라 업무 등록 창을 엽니다 */
  cta: { name: '＋ 업무추가', newtask: true },
  menu: [
    { file:'index.html', name:'업무 리마인더', sub:[
      { file:'index.html#follow', name:'후속 조치' },
      { file:'index.html#stale',  name:'오래 안 본 업무' },
      { file:'index.html#done',   name:'지난주에 한 일' }
    ]},
    { file:'issues.html', name:'문제 & 개선', sub:[
      { file:'issues.html#write', name:'불편한 점' },
      { file:'issues.html#list',  name:'개선 아이디어' },
      { file:'issues.html#ref',   name:'레퍼런스' }
    ]},
    { file:'tools.html', name:'업무 Tools', sub:[
      { file:'tools.html#lounge', name:'라운지 운영 체크리스트' }
    ]},
    { file:'reminder.html', name:'반복 업무', sub:[
      { file:'reminder.html#alert',   name:'알림 받기' },
      { file:'reminder.html#month',   name:'월별 할 일' },
      { file:'reminder.html#always',  name:'매달 반복' }
    ]},
    { file:'files.html',  name:'자료실', sub:[
      { file:'files.html#form',     name:'리포트 서식' },
      { file:'files.html#reply',    name:'응대 문구 모음' },
      { file:'files.html#template', name:'QR 안내물 템플릿' }
    ]},
    { file:'attic.html',  name:'딴짓 창고', sub:[
      { file:'game.html', name:'피지컬 120s' },
      { file:'attic.html#wip', name:'만들다 만 것들' }
    ]}
  ]
};

(function(){
  const here = (location.pathname.split('/').pop() || 'index.html');
  const isOn = f => f.split('#')[0] === here;
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

  /* 오른쪽 위 버튼. newtask면 업무 등록 창을 열고, 아니면 링크로 갑니다. */
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
      + ctaHtml()
      + '<button class="burger" id="burger" aria-label="메뉴 열기" aria-expanded="false"><span></span><span></span></button>'
      + '</div></div></nav>';

  /* ── 모바일 서랍 ── */
  let drawer = '<div class="drawer" id="drawer" hidden><div class="drawer-in">';
  for(const m of SITE.menu){
    drawer += '<p>' + esc(m.name) + '</p>'
           + '<a class="' + (isOn(m.file)?'on':'') + '" href="' + m.file + '">' + esc(m.name) + ' 전체보기</a>';
    if(m.sub) drawer += m.sub.map(x => '<a href="' + x.file + '">' + esc(x.name) + '</a>').join('');
  }
  drawer += '</div></div>';

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
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', ()=> setOpen(dw.hidden));
    dw.addEventListener('click', e=>{ if(e.target.tagName==='A') setOpen(false); });
    addEventListener('keydown', e=>{ if(e.key==='Escape' && !dw.hidden) setOpen(false); });
    addEventListener('resize', ()=>{ if(innerWidth>760 && !dw.hidden) setOpen(false); });
  }
})();
