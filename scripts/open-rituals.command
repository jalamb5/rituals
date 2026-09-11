#!/usr/bin/env bash
# Open Rituals in local-first mode.
#
# Why this exists: a review has to READ your Obsidian vault, and browsers block a
# page served from the internet from reaching your local Obsidian API. Opening the
# app from a local file lifts that restriction — so this opens the file directly
# (and makes sure the zero-key AI endpoint is up for the optional suggestion).
#
# Usage: double-click in Finder, or run:  ./scripts/open-rituals.command

set -uo pipefail

REPO="$HOME/repos/rituals"
APP="$REPO/index.html"
PROXY_PORT=8645

if [ ! -f "$APP" ]; then
  echo "Can't find $APP" >&2
  exit 1
fi

# 1. Make sure the local AI endpoint (hermes proxy → Nous Portal) is running.
#    Not needed for the digest itself — only for "Suggest title & summary".
if ! lsof -nP -iTCP:"$PROXY_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  HERMES="$(command -v hermes || echo "$HOME/.local/bin/hermes")"
  if [ -x "$HERMES" ]; then
    mkdir -p "$HOME/.hermes/logs"
    nohup "$HERMES" proxy start --provider nous >"$HOME/.hermes/logs/rituals-proxy.log" 2>&1 &
    for _ in $(seq 1 20); do
      lsof -nP -iTCP:"$PROXY_PORT" -sTCP:LISTEN >/dev/null 2>&1 && break
      sleep 0.5
    done
    echo "AI endpoint: http://127.0.0.1:$PROXY_PORT/v1"
  else
    echo "hermes not found — the optional AI suggestion will be unavailable." >&2
  fi
else
  echo "AI endpoint already up on port $PROXY_PORT."
fi

# 2. Open the app from the file:// origin. Chrome is preferred (verified path) and
#    gets a chrome-less app window; anything else falls back to the default browser.
FILE_URL="file://$APP"
if [ -d "/Applications/Google Chrome.app" ]; then
  open -na "Google Chrome" --args --app="$FILE_URL"
else
  echo "Chrome not found — opening in the default browser instead."
  echo "NOTE: only Chrome has been verified for local vault access."
  open "$FILE_URL"
fi
