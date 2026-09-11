#!/usr/bin/env bash
# Open Rituals in local-first mode.
#
# Why this exists: browsers block a page served from the public internet from
# reaching your local Obsidian API (Chrome's Private Network Access rule). Opening
# the app from a local file lifts that, so the daily ritual blocks are appended to
# your daily note silently instead of via a deep link.
#
# Not required — the hosted copy still works and falls back to "Open in Obsidian".
#
# Usage: double-click in Finder, or run:  ./scripts/open-rituals.command

set -uo pipefail

APP="$HOME/repos/rituals/index.html"

if [ ! -f "$APP" ]; then
  echo "Can't find $APP" >&2
  exit 1
fi

FILE_URL="file://$APP"
if [ -d "/Applications/Google Chrome.app" ]; then
  open -na "Google Chrome" --args --app="$FILE_URL"
else
  echo "Chrome not found — opening in the default browser instead."
  echo "NOTE: only Chrome has been verified for local vault access."
  open "$FILE_URL"
fi
