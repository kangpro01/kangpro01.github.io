# 일 줄이는 강프로 — 개인 사이트

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
  kang.png        인물 일러스트
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

## 콘텐츠 정책 (중요)

이 사이트는 공개 저장소에 올라간다.

- 회사명, 고객사명, 내부 문서, 사내 시스템 화면, 실제 담당 일정은 올리지 않는다.
- 업무 사례는 "월 6시간 절감" 같은 결과 수준으로만 쓴다.
- 리마인더의 업무 목록은 일반적인 총무 주기로만 채운다.
- 이메일 등 연락처는 공개해도 되는 것만 쓴다.

## 기술 메모

- 빌드 과정 없음. 파일을 그대로 서빙한다. npm, 번들러, 프레임워크를 도입하지 않는다.
- 서버가 없다. 폼 전송·알림·DB가 필요하면 외부 서비스(구글 폼, Supabase 등)를 붙인다.
- `localStorage`는 반드시 try/catch로 감싼다. 차단 환경에서 페이지가 죽으면 안 된다.
- 리마인더의 `.ics` 생성은 브라우저에서 Blob으로 만든다. 서버를 쓰지 않는다.
- 게임(`game.html`)은 다른 페이지와 디자인 체계가 다르다(모눈종이 컨셉). 의도된 것이니 통일하지 말 것.

## 자주 하는 작업

- **이번 주 도구 갱신** → `index.html`의 `.week` 블록과 `news.html`의 `.work.now` 카드
- **도구 추가** → `news.html`의 `#archive`에 `.work` 카드 복사, 대표 항목이면 `index.html`에도
- **리마인더 항목 추가** → `reminder.html`의 `TASKS` 배열에 `{ m, d, t, p }` 한 줄
- **메뉴 추가** → `assets/site.js`의 `SITE.menu`

## 배포

GitHub Pages. `index.html`이 저장소 루트에 있어야 하고 `assets/` 폴더가 같은 위치에 있어야 한다.
파일을 고쳐 커밋하면 1~2분 뒤 반영된다.
