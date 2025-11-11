import * as std from "std";
import * as os from "os";

const formulaPath = scriptArgs[1] || scriptArgs[0];
const sampleRate = parseInt(scriptArgs[2]) || 8000;
const duration = parseFloat(scriptArgs[3]) || 30.0;
const useFastMath = scriptArgs.includes("--fast");

const totalSamples = Math.floor(sampleRate * duration);
const CHUNK_SIZE = 65536;

std.err.printf("=== OFFLINE MODE ===\n");
std.err.printf("Duration: %.1f seconds (%d samples at %d Hz)\n", duration, totalSamples, sampleRate);

// Fast math setup
const TABLE_SIZE = 512;
const TABLE_MASK = 511;
const TABLE_SCALE = TABLE_SIZE / (Math.PI * 2);
let sinTable, cosTable, tanTable;

const POW2_CACHE_SIZE = 512;
const pow2Cache = new Float32Array(POW2_CACHE_SIZE);
for (let i = 0; i < POW2_CACHE_SIZE; i++) {
    pow2Cache[i] = Math.pow(2, (i - 256) / 12);
}

if (useFastMath) {
    sinTable = new Float32Array(TABLE_SIZE);
    cosTable = new Float32Array(TABLE_SIZE);
    tanTable = new Float32Array(TABLE_SIZE);
    
    for (let i = 0; i < TABLE_SIZE; i++) {
        const angle = (i / TABLE_SIZE) * Math.PI * 2;
        sinTable[i] = Math.sin(angle);
        cosTable[i] = Math.cos(angle);
        tanTable[i] = Math.tan(angle);
    }
    std.err.printf("[fast-math] enabled\n");
}

// Load formula
let genFunc = null;

try {
    const f = std.open(formulaPath, "r");
    let expr = "";
    const content = f.readAsString();
    f.close();

    for (let i = 0, start = 0; i <= content.length; i++) {
        if (i === content.length || content[i] === '\n') {
            const line = content.slice(start, i).trim();
            if (line && !line.startsWith('//')) {
                if (expr) expr += '\n';
                expr += line;
            }
            start = i + 1;
        }
    }

    genFunc = new Function(
        't', 'sin', 'cos', 'tan', 'random', 'sqrt', 'abs', 'floor', 'log', 'exp', 'pow', 'pow2',
        `return (${expr})`
    );

    std.err.printf("[loaded] formula length=%d\n", expr.length);
} catch (e) {
    std.err.printf("[error] %s\n", e.message);
    std.exit(1);
}

// Math functions
let sin, cos, tan, random;

if (useFastMath) {
    sin = (x) => sinTable[((x * TABLE_SCALE) | 0) & TABLE_MASK];
    cos = (x) => cosTable[((x * TABLE_SCALE) | 0) & TABLE_MASK];
    tan = (x) => tanTable[((x * TABLE_SCALE) | 0) & TABLE_MASK];
    let seed = 2463534242;
    random = () => {
        seed ^= seed << 13;
        seed ^= seed >> 17;
        seed ^= seed << 5;
        return (seed >>> 0) * 2.3283064365386963e-10;
    };
} else {
    sin = Math.sin;
    cos = Math.cos;
    tan = Math.tan;
    random = Math.random;
}

const log = Math.log, exp = Math.exp, sqrt = Math.sqrt;
const abs = (x) => x < 0 ? -x : x;
const floor = (x) => x | 0;
const pow2 = (x) => {
    const idx = ((x * 12) + 256) | 0;
    return (idx >= 0 && idx < POW2_CACHE_SIZE) ? pow2Cache[idx] : Math.pow(2, x);
};
const pow = (base, exp) => base === 2 ? pow2(exp) : Math.pow(base, exp);

const args = [0, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, pow2];

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
