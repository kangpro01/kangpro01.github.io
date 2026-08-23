# 일 줄이는 강프로

반복되는 총무 업무를 자동화 도구로 바꾸는 과정을 기록하는 개인 사이트.

## 열어보기

폴더째 받아서 `index.html`을 더블클릭하면 됩니다.
**파일 하나만 따로 열면 디자인이 안 입혀집니다.** `assets` 폴더가 옆에 있어야 합니다.

혼자서도 열리는 파일이 필요하면 `preview.html`을 쓰십시오.

## 고치는 곳

| 하고 싶은 것 | 고칠 파일 |
|---|---|
| 메뉴 추가·이름 변경 | `assets/site.js`의 `SITE` |
| 색·글씨·여백 | `assets/style.css`의 `:root` |
| 이번 주 진행 상황 | `index.html`의 `.week`, `news.html`의 `.work.now` |
| 도구 추가 | `news.html`의 `#archive` |
| 리마인더 항목 | `assets/tasks.js`의 `TASKS` |

원본을 고친 뒤 미리보기 파일을 다시 만들려면:

```bash
python tools/build-preview.py
```

VS Code에서는 `Ctrl+Shift+B`로도 실행됩니다.

## 배포

GitHub Pages. 이 폴더를 통째로 저장소에 올리고
Settings → Pages에서 브랜치를 지정하면 됩니다. `index.html`이 루트에 있어야 합니다.

## 만들 때 지킨 것

자세한 규칙은 `CLAUDE.md`에 있습니다. 요약하면,

- 빌드 도구 없음. 순수 HTML/CSS/JS.
- 메인 컬러는 `#333132` 하나. 다른 유채색을 들이지 않습니다.
- 회사 내부 정보는 올리지 않습니다.
