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

## Fast Math

Enable fast math with the `--fast` flag to use pre-computed lookup tables for math functions (sin, cos, tan) and a xorshift32 PRNG. This should yield a performance boost, but the results may be slightly different.

```bash
./run.sh examples/steady-on-tim.js 44000 --fast
```
