#!/bin/bash
URL="${1:-http://localhost:3000/}"
OUTPUT="${2:-screenshots/screenshot.png}"
WIDTH="${3:-360}"
HEIGHT="${4:-800}"

if [[ "$OUTPUT" != /* ]]; then
  OUTPUT="$(pwd)/$OUTPUT"
fi

mkdir -p "$(dirname "$OUTPUT")"
PROFILE_DIR=$(mktemp -d)
timeout 8s firefox --headless --profile "$PROFILE_DIR" --screenshot "$OUTPUT" --window-size="$WIDTH,$HEIGHT" "$URL" >/dev/null 2>&1
rm -rf "$PROFILE_DIR"
if [ -f "$OUTPUT" ]; then
  echo "Saved screenshot to $OUTPUT (${WIDTH}x${HEIGHT})"
else
  echo "Failed to save screenshot"
fi
