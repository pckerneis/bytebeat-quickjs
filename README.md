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

# 3. Build the qjs executable
make

# 4. (Optional) install system-wide
sudo cp qjs /usr/local/bin/
sudo cp qjsc /usr/local/bin/
```

In case you hit a "error: 'for' loop initial declarations are only allowed in C99 or C11 mode" error, you can try to add the following line to the Makefile, line xx:

```makefile
CFLAGS += -std=c99
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
