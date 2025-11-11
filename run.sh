#!/bin/bash
FILE=$1
RATE=${2:-8000}

if [ -z "$FILE" ]; then
  echo "Usage: $0 <formula.js> [rate] [--fast]"
  echo "  --fast: Use pre-computed lookup tables for math functions"
  exit 1
fi

# Extract --fast flag if present
FAST_FLAG=""
if [ "$3" = "--fast" ]; then
  FAST_FLAG="--fast"
fi

# Start QuickJS + aplay pipeline with higher priority
nice -n -10 qjs bytebeat.js "$FILE" "$RATE" $FAST_FLAG | aplay -f U8 -r "$RATE" &

PID=$!

# Cleanup function
cleanup() {
  echo "Stopping..."
  # Kill the entire process group (qjs and aplay)
  kill -9 -$PID 2>/dev/null
  exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup INT TERM

echo -e "\033[1;36m==========================\033[0m"
echo -e "\033[1m     BYTEBEAT QUICKJS\033[0m"
echo -e "\033[1;36m==========================\033[0m"
echo "Running (PID=$PID). Ctrl+C to stop."
echo "Watching $FILE for changes..."

# Wait for the background process
wait $PID
