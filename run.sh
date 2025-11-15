#!/bin/bash
FILE=$1
RATE=${2:-8000}

if [ -z "$FILE" ]; then
  echo "Usage: $0 <formula.js> [rate] [--undersample=N] [--float]"
  echo "  --undersample=N: Compute every Nth sample (1,2,4,8) to reduce CPU load"
  echo "  --float: Use float output instead of uint8"
  exit 1
fi

# Extract undersample flag
UNDERSAMPLE=""
for arg in "$@"; do
  if [[ "$arg" =~ ^--undersample=([0-9]+)$ ]]; then
    UNDERSAMPLE="--undersample=${BASH_REMATCH[1]}"
  fi
done

FORMAT="U8"
for arg in "$@"; do
  if [[ "$arg" == "--float" ]]; then
    FORMAT="F32"
    break
  fi
done

# Start QuickJS + aplay pipeline
qjs bytebeat.js "$FILE" "$RATE" $UNDERSAMPLE $FLOAT | aplay -f $FORMAT -r "$RATE" &

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
