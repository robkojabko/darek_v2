"""
Spustí hru na místní síti (počítač i mobil ve stejné Wi-Fi):
  python tools/server.py            (port 8000)
  python tools/server.py 8080       (jiný port)

Stejné jako `python -m http.server`, jen prohlížeči řekne, ať si soubory
nepamatuje – po každé úpravě hry se tak načtou nové soubory z js/
(jinak by mobil mohl míchat staré a nové soubory a hra by se rozbila).
"""

import functools
import http.server
import socket
import sys
from pathlib import Path

HRA = Path(__file__).resolve().parent.parent


class BezCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()


def moje_ip():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(('10.255.255.255', 1))   # nic se neposílá, jen zjistí adresu v síti
            return s.getsockname()[0]
    except OSError:
        return '127.0.0.1'


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = functools.partial(BezCache, directory=str(HRA))
    with http.server.ThreadingHTTPServer(('0.0.0.0', port), handler) as srv:
        print(f'Hra běží: http://localhost:{port}/index.html')
        print(f'Na mobilu ve stejné Wi-Fi: http://{moje_ip()}:{port}/index.html')
        print('Ukončit: Ctrl+C')
        srv.serve_forever()


if __name__ == '__main__':
    main()
