# Bytebeat-QuickJS

A bytebeat player using QuickJS designed to run on constrained Linux systems.

It features:
- Realtime reloading of the formula file
- ALSA audio output
- Simple command line interface

## Dependencies

- QuickJS
- ALSA
- inotify-tools

## Installation

```bash
sudo apt install quickjs inotify-tools alsa-utils
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
