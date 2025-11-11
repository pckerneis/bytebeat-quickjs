import * as std from "std";
import * as os from "os";

const formulaPath = scriptArgs[1] || scriptArgs[0];
const useFastMath = scriptArgs.includes("--fast");

const PRERENDER_SIZE = 44000;
const BUFFER_SIZE = 8192;
const buffer = new Uint8Array(BUFFER_SIZE);
const preBuffer = new Uint8Array(PRERENDER_SIZE);

let t = 0;
let genFunc = null;
let prerenderedUntil = 0;
let prereadPos = 0;

const TABLE_SIZE = 512;
const TABLE_MASK = 511;
const TABLE_SCALE = 81.48733086393088;
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
    
    const angleStep = 0.012271846303084916;
    for (let i = 0; i < TABLE_SIZE; i++) {
        const angle = i * angleStep;
        sinTable[i] = Math.sin(angle);
        cosTable[i] = Math.cos(angle);
        tanTable[i] = Math.tan(angle);
    }
}

function loadFormula() {
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

        // Warm up JIT
        const args = [0, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, pow2];
        for (let i = 0; i < 200; i++) {
            try { args[0] = i; genFunc(...args); } catch(e) {}
        }
        
        prerenderedUntil = 0;
        prereadPos = 0;

        std.err.printf("[loaded] len=%d\n", expr.length);
    } catch (e) {
        std.err.printf("[error] %s\n", e.message);
    }
}

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
    sin = Math.sin; cos = Math.cos; tan = Math.tan; random = Math.random;
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

loadFormula();

function prerenderChunk() {
    const startT = prerenderedUntil;
    const endT = startT + PRERENDER_SIZE;
    
    for (let i = 0; i < PRERENDER_SIZE; ) {
        args[0] = startT + i; preBuffer[i++] = genFunc(...args) & 255;
        args[0] = startT + i; preBuffer[i++] = genFunc(...args) & 255;
        args[0] = startT + i; preBuffer[i++] = genFunc(...args) & 255;
        args[0] = startT + i; preBuffer[i++] = genFunc(...args) & 255;
    }
    
    prerenderedUntil = endT;
    prereadPos = 0;
    std.err.printf("[prerendered %d->%d]\n", startT, endT);
}

let statCounter = 0;
const STAT_CHECK = 1024;

// Initial prerender
prerenderChunk();

for (;;) {
    // Fast copy from prebuffer
    const remaining = prerenderedUntil - (t);
    
    if (remaining < BUFFER_SIZE) {
        // Running out - prerender next chunk
        prerenderChunk();
    }
    
    // Copy from prerender buffer
    for (let i = 0; i < BUFFER_SIZE; i++) {
        buffer[i] = preBuffer[prereadPos++];
        t++;
        if (prereadPos >= PRERENDER_SIZE) prereadPos = 0;
    }
    
    std.out.write(buffer.buffer, 0, BUFFER_SIZE);
    
    if (++statCounter >= STAT_CHECK) {
        statCounter = 0;
        const [st, err] = os.stat(formulaPath);
        if (err === 0 && st.mtime !== t) {
            loadFormula();
            prerenderChunk();
        }
    }
}
