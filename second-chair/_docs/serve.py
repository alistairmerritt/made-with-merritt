"""Preview madewithmerritt.com locally, Second Chair included: python3 second-chair/_docs/serve.py  (then open http://localhost:4174/second-chair/)

Python's stock `http.server` only queues five connections, so a browser loading the
artwork in parallel sometimes gets one reset and shows a broken image. This is the same
server with a longer queue. It's only for previewing; any static host serves the folder as is.
"""
import functools
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4174
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))   # the repository root, as GitHub Pages serves it


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 128
    daemon_threads = True


class Handler(http.server.SimpleHTTPRequestHandler):
    # Always fetch fresh while previewing, so a reload shows the latest change.
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


handler = functools.partial(Handler, directory=ROOT)
print(f"Made with Merritt: http://localhost:{PORT}/  ·  Second Chair: http://localhost:{PORT}/second-chair/")
Server(("127.0.0.1", PORT), handler).serve_forever()
