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

# Cleanup function
cleanup() {
  echo "Stopping..."
  kill -9 $PID 2>/dev/null
  killall -9 qjs aplay 2>/dev/null
  exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup INT TERM

echo "Running (PID=$PID). Ctrl+C to stop."
echo "Watching $FILE for changes..."

# Watch formula file for edits
while inotifywait -qq -e close_write "$FILE"; do
  touch /tmp/bytebeat.reload
done

cleanup
