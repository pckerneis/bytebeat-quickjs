# Bytebeat-QuickJS

A bytebeat player using QuickJS designed to run on constrained Linux systems.

Features:
- Realtime reloading of the formula file
- ALSA audio output
- Simple command line interface
- Lightweight

## Dependencies

- QuickJS
- ALSA

## Installation

### Dependencies

```bash
sudo apt install quickjs alsa-utils
```

On some distributions, you may need to build QuickJS from source.

```bash
# 1. Install build tools
sudo apt-get update
sudo apt-get install build-essential git

# 2. Clone QuickJS
git clone https://github.com/bellard/quickjs.git
cd quickjs

# 3. Build the qjs executable with optimization
CFLAGS="-O2 -flto -DNDEBUG -std=c11" make qjs

# 4. Install system-wide
sudo cp qjs /usr/local/bin/
sudo cp qjsc /usr/local/bin/
```

### Clone this repository

```bash
git clone https://github.com/pckerneis/bytebeat-quickjs.git
cd bytebeat-quickjs
```

## Usage

```bash
./run.sh <formula.js> [rate]
```

### Examples

The `examples` directory contains some sample bytebeat formulas.

```bash
./run.sh examples/42-melody.js
```

```bash
./run.sh examples/steady-on-tim.js 44000
```

## Undersampling

Reduce CPU load by computing every Nth sample and duplicating it. Useful for complex formulas that can't keep up in real-time.

```bash
./run.sh <formula.js> <rate> --undersample=N
```

Valid values: `1` (default), `2`, `4`, `8`

The sample rate must be divisible by the undersample factor.

Example:

```bash
# Compute every 4th sample, reducing load by 75%
./run.sh examples/steady-on-tim.js 44000 --undersample=4

# Less aggressive 2x undersampling
./run.sh examples/42-melody.js 8000 --undersample=2
```

**Note:** Undersampling reduces audio quality (introduces aliasing) but allows complex formulas to run in real-time on slower hardware.

## Offline Mode

Pre-render a fixed duration and play it back. Useful for complex formulas that cause underruns in realtime mode.

```bash
./play.sh <formula.js> [rate] [duration]
```

Example:

```bash
# Render and play 30 seconds at 44kHz
./play.sh examples/steady-on-tim.js 44000 30

# Render and play 60 seconds at 8kHz
./play.sh examples/42-melody.js 8000 60
```

## WAV File Rendering

Render bytebeat to a WAV file for easy sharing and playback.

```bash
./render.sh <formula.js> [output.wav] [rate] [duration]
```

Example:

```bash
# Render to output.wav (30 seconds at 8kHz)
./render.sh examples/42-melody.js

# Render to custom file with specific parameters
./render.sh examples/steady-on-tim.js music.wav 44000 60

# High quality rendering
./render.sh examples/42-melody.js melody.wav 44000 120
```
