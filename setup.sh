#!/usr/bin/env bash
# Run once per machine (and again when the drive moves to a machine with a different architecture).
#   bash setup.sh
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(pwd)"

step() { printf "\n\033[1m▸ %s\033[0m\n" "$1"; }
ok()   { printf "  \033[32m✓\033[0m %s\n" "$1"; }
warn() { printf "  \033[33m!\033[0m %s\n" "$1"; }
fail() { printf "  \033[31m✗\033[0m %s\n" "$1"; exit 1; }

step "Machine"
OS="$(uname)"
ok "$OS $(uname -m)"

step "Drive"
EXFAT=0
if [[ "$OS" == "Darwin" && "$ROOT" == /Volumes/* ]]; then
  VOL="/Volumes/$(echo "$ROOT" | cut -d/ -f3)"
  FSTYPE="$(diskutil info "$VOL" | awk -F': *' '/File System Personality/ {print $2}')"
  if [[ "$FSTYPE" == *APFS* ]]; then
    ok "$VOL: $FSTYPE"
  else
    warn "$VOL is \"$FSTYPE\" – APFS is recommended (exFAT has no symlinks and creates ._ files)."
    [[ "$FSTYPE" == *ExFAT* || "$FSTYPE" == *exFAT* || "$FSTYPE" == *FAT* ]] && EXFAT=1
  fi
fi

step "Tools"
HAS_BREW=0; command -v brew >/dev/null && HAS_BREW=1
(( HAS_BREW )) || warn "Homebrew not found – install Node 20+ and ffmpeg with your package manager"
if ! command -v node >/dev/null; then
  (( HAS_BREW )) && brew install node || fail "Node missing"
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
(( NODE_MAJOR >= 20 )) || fail "Node $(node -v) is too old (need 20+) – brew upgrade node"
ok "Node $(node -v)"
if ! command -v ffmpeg >/dev/null; then
  (( HAS_BREW )) && brew install ffmpeg || fail "ffmpeg missing"
fi
ok "ffmpeg $(ffmpeg -version | head -1 | awk '{print $3}')"
if command -v claude >/dev/null; then ok "Claude Code"; else warn "Claude Code missing – see https://code.claude.com/docs for installation"; fi

step "Dependencies"
MARK="node_modules/.installed-for"
WANT="$(node -p 'process.platform + "-" + process.arch')"
if [[ -f "$MARK" && "$(cat "$MARK")" == "$WANT" ]]; then
  ok "node_modules matches this machine ($WANT)"
else
  if [[ -d node_modules ]]; then
    warn "node_modules was installed for $(cat "$MARK" 2>/dev/null || echo 'unknown') – reinstalling for $WANT"
    rm -rf node_modules
  fi
  if (( EXFAT )); then npm ci --no-audit --no-fund --no-bin-links; else npm ci --no-audit --no-fund; fi
  echo "$WANT" > "$MARK"
  ok "installed"
fi
if node node_modules/@remotion/cli/remotion-cli.js browser ensure >/dev/null 2>&1; then
  ok "Render browser ready"
else
  warn "Could not download the render browser (no internet?) – it will be fetched on the first render"
fi

step ".env"
if [[ -f .env ]]; then ok ".env present"; else cp .env.example .env; warn ".env created from template – add your API keys now"; fi

step "Git"
if [[ -d .git ]]; then ok "Repository present"; else git init -q && ok "git init (no commit yet)"; fi
if (( EXFAT )) && command -v dot_clean >/dev/null; then dot_clean -m "$ROOT" && ok "._ files removed"; fi

step "Check"
npm run --silent doctor || true

printf "\n\033[1mNext:\033[0m run \033[1mclaude\033[0m in this folder and type \033[1m/welcome\033[0m – it sets up your brand and your first project.\n"
