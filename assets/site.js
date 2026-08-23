/* ══════════════════════════════════════════════════════════
   메뉴는 여기 한 곳에서만 고치면 모든 페이지에 반영됩니다.
   file  : 연결할 파일 이름
   name  : 화면에 보이는 이름
   sub   : 하위 메뉴 (없으면 생략)
   ══════════════════════════════════════════════════════════ */
const SITE = {
  logo: 'ㄱㅍㄹ',
  title: '일 잘하는 강프로',
  cta: { name: '아이디어 제보', file: 'issues.html#send' },
  menu: [
    { file:'news.html',   name:'새로운 소식', sub:[
      { file:'news.html#this-week', name:'이번 주 도구' },
      { file:'news.html#archive',   name:'지난 도구 모음' }
    ]},
    { file:'issues.html', name:'불편사항', sub:[
      { file:'issues.html#list', name:'모아둔 불편' },
      { file:'issues.html#send', name:'불편사항 접수' }
    ]},
    { file:'ideas.html',  name:'개선 아이디어', sub:[
      { file:'ideas.html#rule',  name:'고르는 기준' },
      { file:'ideas.html#steps', name:'만드는 순서' }
    ]},
    { file:'reminder.html', name:'업무 리마인더', sub:[
      { file:'reminder.html#month',   name:'월별 할 일' },
      { file:'reminder.html#always',  name:'매달 반복' }
    ]},
    { file:'files.html',  name:'자료실', sub:[
      { file:'files.html#form',     name:'리포트 서식' },
      { file:'files.html#reply',    name:'응대 문구 모음' },
      { file:'files.html#template', name:'QR 안내물 템플릿' }
    ]},
    { file:'attic.html',  name:'딴짓 창고', sub:[
      { file:'game.html', name:'모눈 회피 게임' },
      { file:'attic.html#wip', name:'만들다 만 것들' }
    ]}
  ]
};

(function(){
  const here = (location.pathname.split('/').pop() || 'index.html');
  const isOn = f => f.split('#')[0] === here;
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

  /* ── 상단 바 ── */
  let nav = '<nav class="gnb"><div class="wrap">'
    + '<a class="logo" href="index.html" aria-label="' + esc(SITE.title) + ' — 홈으로">' + esc(SITE.logo) + '</a>'
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
      + '<a class="btn" href="' + SITE.cta.file + '">' + esc(SITE.cta.name) + '</a>'
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
      + '<span>이 페이지도 직접 만들었습니다</span>'
      + '</div></footer>'
      + '<div class="dock"><a class="btn" href="' + SITE.cta.file + '">' + esc(SITE.cta.name) + '</a></div>';
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
