#!/bin/bash
FILE=$1
RATE=${2:-8000}

if [ -z "$FILE" ]; then
  echo "Usage: $0 <formula.js> [rate]"
  exit 1
fi

# Start QuickJS + aplay pipeline
qjs bytebeat.js "$FILE" "$RATE" | aplay -f U8 -r "$RATE" &

PID=$!

echo "Running (PID=$PID). Ctrl+C to stop."
echo "Watching $FILE for changes..."

# Watch formula file for edits
while inotifywait -qq -e close_write "$FILE"; do
  touch /tmp/bytebeat.reload
done

kill $PID
