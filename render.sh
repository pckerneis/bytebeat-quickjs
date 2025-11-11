#!/bin/bash
FILE=$1
OUTPUT=${2:-output.wav}
RATE=${3:-8000}
DURATION=${4:-30}

if [ -z "$FILE" ]; then
  echo "Usage: $0 <formula.js> [output.wav] [rate] [duration]"
  echo "  output.wav: output file (default: output.wav)"
  echo "  rate: sample rate (default: 8000)"
  echo "  duration: duration in seconds (default: 30)"
  exit 1
fi

echo -e "\033[1;36m==========================\033[0m"
echo -e "\033[1m   BYTEBEAT WAV RENDERER\033[0m"
echo -e "\033[1;36m==========================\033[0m"

# Render to WAV file
qjs render.js "$FILE" "$OUTPUT" "$RATE" "$DURATION"

echo "Done! Output: $OUTPUT"
