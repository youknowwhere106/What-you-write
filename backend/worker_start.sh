#!/bin/sh
# Start a minimal HTTP health server alongside the Celery worker.
# Railway requires something to respond on $PORT for health checks.

PORT="${PORT:-8000}"

python - <<EOF &
import http.server, os, threading

class HealthHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")
    def log_message(self, *args):
        pass  # silence access logs

server = http.server.HTTPServer(("0.0.0.0", int(os.environ.get("PORT", 8000))), HealthHandler)
server.serve_forever()
EOF

exec celery -A app.workers.celery_app worker --loglevel=info -Q ai_processing --concurrency=2
