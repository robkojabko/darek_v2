# Falešná Firebase Realtime Database na testy multiplayeru (jen /hraci, REST + proud EventSource) + statické soubory hry
# Spuštění: python tools/falesna_databaze.py . 8001   → hra: http://127.0.0.1:8001/index.html?mpdb=http://127.0.0.1:8001
import json, os, sys, time, threading, queue
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = sys.argv[1]
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8001
DB = {}
LOCK = threading.Lock()
CLIENTS = []

def resolve(v):
    if isinstance(v, dict):
        if v == {'.sv': 'timestamp'}:
            return int(time.time() * 1000)
        return {k: resolve(x) for k, x in v.items()}
    return v

def broadcast(path, data):
    msg = 'event: put\ndata: ' + json.dumps({'path': path, 'data': data}) + '\n\n'
    for q in list(CLIENTS):
        q.put(msg)

class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Methods', 'GET,PUT,DELETE,PATCH')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()
    def key(self):
        p = self.path.split('?')[0]
        if not p.startswith('/hraci') or not p.endswith('.json'): return None
        rest = p[len('/hraci'):-len('.json')].strip('/')
        return rest
    def do_GET(self):
        k = self.key()
        if k is None: return super().do_GET()
        if k == '' and 'text/event-stream' in self.headers.get('Accept', ''):
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.end_headers()
            q = queue.Queue()
            with LOCK:
                snap = dict(DB) or None
                CLIENTS.append(q)
            try:
                self.wfile.write(('event: put\ndata: ' + json.dumps({'path': '/', 'data': snap}) + '\n\n').encode()); self.wfile.flush()
                while True:
                    try: msg = q.get(timeout=10)
                    except queue.Empty: msg = 'event: keep-alive\ndata: null\n\n'
                    self.wfile.write(msg.encode()); self.wfile.flush()
            except Exception:
                pass
            finally:
                CLIENTS.remove(q)
            return
        with LOCK: data = DB if k == '' else DB.get(k)
        body = json.dumps(data or None).encode()
        self.send_response(200); self.send_header('Content-Type', 'application/json'); self.end_headers(); self.wfile.write(body)
    def do_PUT(self):
        k = self.key()
        n = int(self.headers.get('Content-Length', 0))
        v = resolve(json.loads(self.rfile.read(n) or b'null'))
        with LOCK:
            DB[k] = v
        broadcast('/' + k, v)
        body = json.dumps(v).encode()
        self.send_response(200); self.send_header('Content-Type', 'application/json'); self.end_headers(); self.wfile.write(body)
    def do_DELETE(self):
        k = self.key()
        with LOCK: DB.pop(k, None)
        broadcast('/' + k, None)
        self.send_response(200); self.send_header('Content-Type', 'application/json'); self.end_headers(); self.wfile.write(b'null')

ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
