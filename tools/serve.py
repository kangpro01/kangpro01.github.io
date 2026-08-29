# 로컬에서 화면을 확인할 때 쓰는 서버입니다. 배포와는 상관이 없습니다.
#
#   python tools/serve.py          → http://localhost:8123
#   python tools/serve.py 9000     → 포트 지정
#
# python -m http.server 를 쓰지 않는 이유:
# 3.7 아래에서는 요청을 하나씩만 처리합니다. 브라우저가 CSS·JS를 동시에
# 받아가려 하면 서로 물려 페이지가 멈춥니다. 아래처럼 스레드를 붙이면 됩니다.

import os
import sys
from socketserver import ThreadingMixIn

try:                                        # 3.x
    from http.server import HTTPServer, SimpleHTTPRequestHandler
except ImportError:                         # 2.x
    from BaseHTTPServer import HTTPServer
    from SimpleHTTPServer import SimpleHTTPRequestHandler


class Server(ThreadingMixIn, HTTPServer):
    daemon_threads = True


class Handler(SimpleHTTPRequestHandler):
    # 고친 파일이 바로 보이게 캐시를 끕니다
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        SimpleHTTPRequestHandler.end_headers(self)


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
    print('http://localhost:%d — 멈추려면 Ctrl+C' % port)
    Server(('127.0.0.1', port), Handler).serve_forever()
