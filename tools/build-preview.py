#!/usr/bin/env python3
"""
미리보기 파일 생성기.

CSS·JS·이미지를 HTML 안에 전부 밀어 넣어 파일 하나로 열 수 있게 만든다.
파일 하나만 남에게 보내거나, 폴더 없이 열어봐야 할 때 쓴다.

    python tools/build-preview.py

원본(index.html 등)을 고친 뒤 다시 실행하면 preview 파일이 갱신된다.
preview 파일은 직접 고치지 말 것.
"""
import base64
import pathlib
import sys
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent

# (원본, 만들 미리보기 파일)
TARGETS = [
    ("index.html", "preview.html"),
]

NOTE = (
    '<div class="wrap"><p style="font-size:12px;color:var(--ink-3);'
    'text-align:center;padding:0 0 8px">'
    '미리보기 파일입니다. 메뉴 링크는 폴더째 올린 뒤 동작합니다.</p></div>\n'
    '<div id="site-footer"></div>'
)


def main() -> int:
    css = (ROOT / "assets/style.css").read_text(encoding="utf-8")
    img = base64.b64encode((ROOT / "assets/kang.png").read_bytes()).decode()
    icon = urllib.parse.quote((ROOT / "assets/favicon.svg").read_text(encoding="utf-8"))

    # 외부 스크립트는 전부 본문에 밀어 넣는다. 새 스크립트를 추가하면 여기에도 적는다.
    scripts = [
        "assets/site.js",
        "assets/supabase.js",
        "assets/db.js",
        "assets/when.js",
        "assets/task-form.js",
        "assets/home.js",
        "assets/cal.js",
        "assets/notify.js",
        "assets/fab.js",
    ]

    for src_name, out_name in TARGETS:
        src = ROOT / src_name
        if not src.exists():
            print(f"건너뜀: {src_name} 없음")
            continue

        s = src.read_text(encoding="utf-8")
        s = s.replace(
            '<link rel="stylesheet" href="assets/style.css">',
            "<style>\n" + css + "\n</style>",
        )
        for rel in scripts:
            tag = '<script src="%s"></script>' % rel
            if tag in s:
                body = (ROOT / rel).read_text(encoding="utf-8")
                s = s.replace(tag, "<script>\n" + body + "\n</script>")
        s = s.replace(
            '<link rel="icon" href="assets/favicon.svg">',
            '<link rel="icon" href="data:image/svg+xml,' + icon + '">',
        )
        s = s.replace('src="assets/kang.png"', 'src="data:image/png;base64,' + img + '"')
        s = s.replace('<div id="site-footer"></div>', NOTE)

        if 'href="assets/' in s or 'src="assets/' in s:
            print(f"경고: {out_name}에 assets/ 참조가 남았습니다. 혼자서는 안 열립니다.")

        (ROOT / out_name).write_text(s, encoding="utf-8")
        size = (ROOT / out_name).stat().st_size
        print(f"만듦: {out_name}  ({size // 1024}KB)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
