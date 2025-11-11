#!/bin/bash
FILE=$1
RATE=${2:-8000}
DURATION=${3:-30}

if [ -z "$FILE" ]; then
  echo "Usage: $0 <formula.js> [rate] [duration] [--fast]"
  echo "  rate: sample rate (default: 8000)"
  echo "  duration: duration in seconds (default: 30)"
  echo "  --fast: Use pre-computed lookup tables for math functions"
  exit 1
fi

# Extract --fast flag if present
FAST_FLAG=""
if [ "$4" = "--fast" ]; then
  FAST_FLAG="--fast"
fi

echo -e "\033[1;36m==========================\033[0m"
echo -e "\033[1m  BYTEBEAT OFFLINE MODE\033[0m"
echo -e "\033[1;36m==========================\033[0m"

# Render and play
qjs offline.js "$FILE" "$RATE" "$DURATION" $FAST_FLAG | aplay -f U8 -r "$RATE"

echo "Playback finished."
