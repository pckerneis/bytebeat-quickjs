import * as std from "std";
import { initFastMath, loadFormulaFromFile, createMathFunctions, compileFormula } from "./common.js";

const formulaPath = scriptArgs[1] || scriptArgs[0];
const outputPath = scriptArgs[2] || "output.wav";
const sampleRate = parseInt(scriptArgs[3]) || 8000;
const duration = parseFloat(scriptArgs[4]) || 30.0;
const useFastMath = scriptArgs.includes("--fast");

const totalSamples = Math.floor(sampleRate * duration);

std.err.printf("=== WAV RENDERER ===\n");
std.err.printf("Output: %s\n", outputPath);
std.err.printf("Duration: %.1f seconds (%d samples at %d Hz)\n", duration, totalSamples, sampleRate);

// Initialize math tables
const tables = initFastMath(useFastMath);

// Load and compile formula
let genFunc = null;
try {
    const expr = loadFormulaFromFile(formulaPath);
    genFunc = compileFormula(expr);
    std.err.printf("[loaded] formula length=%d\n", expr.length);
} catch (e) {
    std.err.printf("[error] %s\n", e.message);
    std.exit(1);
}

// Create math functions
const mathFuncs = createMathFunctions(useFastMath, tables);
const { sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round, pow2 } = mathFuncs;

const args = [0, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round, pow2];

// Allocate audio buffer
std.err.printf("Allocating %.2f MB...\n", (totalSamples / 1024 / 1024));
const audioData = new Uint8Array(totalSamples);

let t = 0;
const startTime = Date.now();

std.err.printf("Rendering...\n");

// Render audio
while (t < totalSamples) {
    args[0] = t;
    try {
        audioData[t] = genFunc(...args) & 255;
    } catch (e) {
        audioData[t] = 128;
    }
    t++;
    
    // Progress
    if (t % (sampleRate * 5) === 0) {
        const progress = (t / totalSamples * 100).toFixed(1);
        std.err.printf("[%s%%] %d/%d samples\n", progress, t, totalSamples);
    }
}

const elapsed = (Date.now() - startTime) / 1000;
const ratio = duration / elapsed;
std.err.printf("Rendered %.1fs in %.2fs (%.2fx realtime)\n", duration, elapsed, ratio);

// Write WAV file
std.err.printf("Writing WAV file...\n");

const dataSize = totalSamples;
const fileSize = 44 + dataSize;

const f = std.open(outputPath, "wb");

// Helper to write little-endian integers
function writeU32(val) {
    f.putByte(val & 0xFF);
    f.putByte((val >> 8) & 0xFF);
    f.putByte((val >> 16) & 0xFF);
    f.putByte((val >> 24) & 0xFF);
}

function writeU16(val) {
    f.putByte(val & 0xFF);
    f.putByte((val >> 8) & 0xFF);
}

function writeString(str) {
    for (let i = 0; i < str.length; i++) {
        f.putByte(str.charCodeAt(i));
    }
}

// RIFF header
writeString("RIFF");
writeU32(fileSize - 8);
writeString("WAVE");

// fmt chunk
writeString("fmt ");
writeU32(16); // Chunk size
writeU16(1);  // Audio format (1 = PCM)
writeU16(1);  // Number of channels (1 = mono)
writeU32(sampleRate);
writeU32(sampleRate); // Byte rate (sample rate * channels * bytes per sample)
writeU16(1);  // Block align (channels * bytes per sample)
writeU16(8);  // Bits per sample

// data chunk
writeString("data");
writeU32(dataSize);

// Write audio data
const WRITE_CHUNK = 65536;
for (let i = 0; i < totalSamples; i += WRITE_CHUNK) {
    const writeSize = Math.min(WRITE_CHUNK, totalSamples - i);
    f.write(audioData.buffer, i, writeSize);
}

f.close();

std.err.printf("Done! Wrote %s (%.2f MB)\n", outputPath, fileSize / 1024 / 1024);
