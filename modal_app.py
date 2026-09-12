"""MoveLog backend on Modal.

One container, always. The live-session registry is in memory and Telegram
long-polling allows exactly one poller, so a second container would split the
registry and get 409s from Telegram.

Dev loop:  npm run serve    (modal serve — public URL, hot reload on src edits)
Deploy:    npm run deploy
"""

import os
import subprocess

import modal

BACKEND = "apps/backend"

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("curl", "ca-certificates")
    .run_commands(
        "curl -fsSL https://deb.nodesource.com/setup_22.x | bash -",
        "apt-get install -y nodejs",
    )
    # Dependencies are their own layer so source edits never trigger an npm install.
    .add_local_file(f"{BACKEND}/package.json", "/app/backend/package.json", copy=True)
    .run_commands("cd /app/backend && npm install --no-audit --no-fund")
    .add_local_file(f"{BACKEND}/tsconfig.json", "/app/backend/tsconfig.json", copy=True)
    # Runtime mount (no copy=True): `modal serve` re-syncs this on every save.
    .add_local_dir(f"{BACKEND}/src", "/app/backend/src")
)

app = modal.App("movelog")
photos = modal.Volume.from_name("movelog-photos", create_if_missing=True)


@app.function(
    image=image,
    secrets=[modal.Secret.from_dotenv(__file__)],
    volumes={"/photos": photos},
    min_containers=1,
    max_containers=1,
    scaledown_window=60 * 60,
    timeout=60 * 60 * 24,
)
@modal.concurrent(max_inputs=200)
@modal.web_server(8080, startup_timeout=120)
def backend():
    subprocess.Popen(
        ["npx", "tsx", "src/index.ts"],
        cwd="/app/backend",
        env={**os.environ, "PORT": "8080", "PHOTOS_DIR": "/photos"},
    )
