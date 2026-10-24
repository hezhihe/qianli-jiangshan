#!/usr/bin/env python3
"""千里江山·粒子山河 开发服务器：Cache-Control no-store，改代码刷新即生效，无需版本号。"""
import http.server
import socketserver
import sys
from pathlib import Path

ROOT = Path(__file__).parent

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8899
    with socketserver.TCPServer(('', port), NoCacheHandler) as httpd:
        print(f'serving {ROOT} at http://127.0.0.1:{port}/site/index.html (no-cache)')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
