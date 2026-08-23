# 일 잘하는 강프로 — 개인 사이트

반복되는 총무 업무를 자동화 도구로 바꾸는 과정을 기록하는 개인 사이트.
빌드 도구 없이 순수 HTML/CSS/JS로만 되어 있고, GitHub Pages에 폴더째 올려 쓴다.

## 폴더 구조

```
index.html        홈 — 이번 주 진행 + 최근 도구 2개 + 방식 + 자료 + 리마인더 미리보기
news.html         새로운 소식 — 이번 주 카드 + 지난 도구 전체
issues.html       불편사항 — 반복되는 일 + 제보 방법
ideas.html        개선 아이디어 — 고르는 기준 + 만드는 순서
reminder.html     업무 리마인더 — 월별 할 일 + 캘린더(.ics) 내려받기
files.html        자료실 — 서식·템플릿
attic.html        딴짓 창고 — 게임, 만들다 만 것들
game.html         모눈 회피 게임 (단일 파일, 자기완결형)
assets/
  style.css       모든 페이지의 디자인
  site.js         메뉴·헤더·푸터 생성
  tasks.js        리마인더 업무 목록 (reminder.html과 index.html이 함께 씀)
  supabase.js     Supabase 연결 정보 (공개 키만)
  favicon.svg     탭 아이콘
  kang.png        인물 일러스트
supabase/
  schema.sql      불편사항 테이블 + RLS 정책. 대시보드 SQL Editor에서 실행한다
tools/
  build-preview.py  미리보기 파일 생성 스크립트
preview*.html     생성물. 직접 고치지 말 것 (아래 참고)
```

## 반드시 지킬 것

**메뉴는 `assets/site.js`의 `SITE` 객체에서만 고친다.**
각 HTML 파일에는 `<div id="site-header"></div>`와 `<div id="site-footer"></div>`만 있고,
상단바·모바일 서랍·푸터는 site.js가 만들어 넣는다. HTML에 메뉴를 직접 쓰지 말 것.

**디자인은 `assets/style.css` 한 곳에서만 고친다.**
HTML의 인라인 `style=` 사용은 섹션 배경색(`background:var(--paper-2)`) 정도로 제한한다.

**리마인더 업무 목록은 `assets/tasks.js`에서만 고친다.**
`TASKS`(특정 달)와 `MONTHLY`(매달 반복)를 reminder.html과 index.html이 함께 쓴다.
어느 한쪽 HTML에 목록을 복사해 두지 말 것. 홈 미리보기는 이 목록에서 자동으로 뽑는다.

**누를 수 없는 카드는 `<a>`가 아니라 `<article class="work">`로 쓴다.**
링크할 곳이 생기기 전까지 `href="#"`를 두지 않는다. 호버 효과는 `a.work`에만 걸려 있어서,
`article`로 두면 눌릴 것처럼 보이지 않는다.

**새 페이지를 만들 때는 기존 페이지를 복사한다.**
`<head>` 구성, `site-header`/`site-footer` 자리, 맨 아래 `<script src="assets/site.js">`를 그대로 유지한다.
새 페이지를 만들면 `site.js`의 `SITE.menu`에도 반드시 추가한다.

**`preview.html`, `preview-reminder.html`은 손으로 고치지 않는다.**
CSS·JS·이미지를 한 파일에 밀어 넣은 생성물이다. 원본을 고친 뒤 `python tools/build-preview.py`로 다시 만든다.

## 디자인 규칙

- 메인 컬러는 **#333132** (Black, RGB 51/49/50, PANTONE P 179-15C) 하나뿐이다.
  명도만 나눠 쓴다: `--ink` `--ink-2` `--ink-3` `--hover` `--paper` `--paper-2` `--rule`
- **다른 유채색을 새로 들이지 않는다.** 강조가 필요하면 굵기·크기·여백·형태로 해결한다.
- 폰트는 Pretendard(CDN) + 숫자는 시스템 모노스페이스(`--fs-num`).
- 본문 폭은 `--wrap`(1000px). 단, 상단바만 화면 폭 전체를 쓴다.
- 모바일 기준점은 760px. 이 아래에서 메뉴가 햄버거로 바뀌고 카드가 1열이 된다.
- 애니메이션은 최소로 하고 `prefers-reduced-motion`을 항상 처리한다.

## 글쓰기 규칙

- 한국어 **습니다체**. 짧고 단정하게.
- 도구 소개는 **문제 → 방법 → 남은 것** 세 줄 구조를 지킨다.
- 과장하지 않는다. "혁신", "완벽한" 같은 말을 쓰지 않는다.
- 숫자는 근거를 댈 수 있는 것만 쓴다. 모르면 아예 빼는 쪽을 택한다.

## Supabase (불편사항 접수)

`issues.html`의 제보 폼이 `public.issues` 테이블에 넣는다. 그 외에는 쓰지 않는다.

**공개 키만 코드에 넣는다.** `assets/supabase.js`의 키는 브라우저에 노출되라고 만든
publishable 키라 저장소에 올려도 된다. **데이터베이스 비밀번호와 secret / service_role 키는
어떤 파일에도 넣지 않는다.** 정적 사이트라 넣는 즉시 공개된다.

**보호 장치는 RLS 정책뿐이다.** 지금 정책은 insert만 허용하고 select 정책이 없어서
아무도 접수 내용을 읽어갈 수 없다. 접수분은 대시보드 Table Editor에서 본다.
정책을 손댔다면 아래로 읽기가 막혔는지 반드시 확인한다. 빈 배열 `[]`이 나와야 정상이다.

```bash
curl "<프로젝트 URL>/rest/v1/issues?select=*" -H "apikey: <공개 키>"
```

읽기 권한이 없으므로 insert할 때 `Prefer: return=minimal` 헤더가 반드시 필요하다.
빼면 PostgREST가 넣은 행을 돌려주려다 실패한다.

## 콘텐츠 정책 (중요)

이 사이트는 공개 저장소에 올라간다.

- 회사명, 고객사명, 내부 문서, 사내 시스템 화면, 실제 담당 일정은 올리지 않는다.
- 업무 사례는 "월 6시간 절감" 같은 결과 수준으로만 쓴다.
- 리마인더의 업무 목록은 일반적인 총무 주기로만 채운다.
- 이메일 등 연락처는 공개해도 되는 것만 쓴다.

## 기술 메모

- 빌드 과정 없음. 파일을 그대로 서빙한다. npm, 번들러, 프레임워크를 도입하지 않는다.
- 서버가 없다. 폼 전송·알림·DB가 필요하면 외부 서비스(구글 폼, Supabase 등)를 붙인다.
- **글은 HTML에 둔다. Supabase로 옮기지 않는다.** 정적 파일이라 DB에서 불러오면 첫 화면이
  비어 보이고 검색 노출도 나빠진다. 무료 플랜은 한동안 접속이 없으면 일시정지되므로
  글까지 DB에 있으면 그때 사이트가 백지가 된다. DB는 브라우저에서 써넣어야 하는 것에만 쓴다.
- `localStorage`는 반드시 try/catch로 감싼다. 차단 환경에서 페이지가 죽으면 안 된다.
- 리마인더의 `.ics` 생성은 브라우저에서 Blob으로 만든다. 서버를 쓰지 않는다.
  `DTSTAMP`는 UTC에 `Z`를 붙이고, `SUMMARY`·`DESCRIPTION`은 쉼표·세미콜론·역슬래시를 이스케이프해야 한다(RFC 5545).
- 게임(`game.html`)은 다른 페이지와 디자인 체계가 다르다(모눈종이 컨셉). 의도된 것이니 통일하지 말 것.

## 자주 하는 작업

- **이번 주 도구 갱신** → `index.html`의 `.week` 블록과 `news.html`의 `.work.now` 카드
- **도구 추가** → `news.html`의 `#archive`에 `.work` 카드 복사, 대표 항목이면 `index.html`에도
- **리마인더 항목 추가** → `assets/tasks.js`의 `TASKS` 배열에 `{ m, d, t, p }` 한 줄
- **메뉴 추가** → `assets/site.js`의 `SITE.menu`

## 배포

GitHub Pages. `index.html`이 저장소 루트에 있어야 하고 `assets/` 폴더가 같은 위치에 있어야 한다.
파일을 고쳐 커밋하면 1~2분 뒤 반영된다.
