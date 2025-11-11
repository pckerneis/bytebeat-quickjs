import * as std from "std";
import { initFastMath, loadFormulaFromFile, createMathFunctions, compileFormula } from "./common.js";

const formulaPath = scriptArgs[1] || scriptArgs[0];
const sampleRate = parseInt(scriptArgs[2]) || 8000;
const duration = parseFloat(scriptArgs[3]) || 30.0;
const useFastMath = scriptArgs.includes("--fast");

const totalSamples = Math.floor(sampleRate * duration);

std.err.printf("=== OFFLINE MODE ===\n");
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

// Allocate full buffer in memory
std.err.printf("Allocating %d MB...\n", (totalSamples / 1024 / 1024).toFixed(2));
const fullBuffer = new Uint8Array(totalSamples);

let t = 0;
const startTime = Date.now();

std.err.printf("Rendering...\n");

// Render everything to memory first
while (t < totalSamples) {
    args[0] = t;
    try {
        fullBuffer[t] = genFunc(...args) & 255;
    } catch (e) {
        fullBuffer[t] = 128;
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
std.err.printf("Done! Rendered %.1fs in %.2fs (%.2fx realtime)\n", duration, elapsed, ratio);

// Now write everything at once
std.err.printf("Writing to output...\n");
const WRITE_CHUNK = 65536;
for (let i = 0; i < totalSamples; i += WRITE_CHUNK) {
    const writeSize = Math.min(WRITE_CHUNK, totalSamples - i);
    std.out.write(fullBuffer.buffer, i, writeSize);
}
std.err.printf("Playback started.\n");
