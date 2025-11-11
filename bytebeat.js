import * as std from "std";
import * as os from "os";

const formulaPath = scriptArgs[1] || scriptArgs[0];
const useFastMath = scriptArgs.includes("--fast");
const BUFFER_SIZE = 512;
const buffer = new Uint8Array(BUFFER_SIZE);

let t = 0;
let genFunc = null;
let lastError = null;
let lastMtime = 0;

// Pre-computed lookup tables for fast math (8192 entries = ~0.00077 radian precision)
const TABLE_SIZE = 8192;
const sinTable = new Float64Array(TABLE_SIZE);
const cosTable = new Float64Array(TABLE_SIZE);
const tanTable = new Float64Array(TABLE_SIZE);

if (useFastMath) {
    for (let i = 0; i < TABLE_SIZE; i++) {
        const angle = (i / TABLE_SIZE) * Math.PI * 2;
        sinTable[i] = Math.sin(angle);
        cosTable[i] = Math.cos(angle);
        tanTable[i] = Math.tan(angle);
    }
    std.err.printf("[fast-math] Lookup tables initialized (%d entries)\n", TABLE_SIZE);
}

function loadFormula() {
    try {
        const f = std.open(formulaPath, "r");
        const content = f.readAsString().trim();
        f.close();

        // Filter out comment-only lines but keep all code (including inline comments)
        const lines = content.split('\n');
        const codeLines = lines.filter(line => {
            const trimmed = line.trim();
            return trimmed && !trimmed.startsWith('//');
        });

        const expr = codeLines.join('\n');

        if (!expr) {
            std.err.printf("[error] no code found in formula file\n");
            return;
        }

        // Compile expression into function for performance
        genFunc = new Function(
            't, sin, cos, tan, log, exp, pow, sqrt, abs, floor, ceil, round, random',
            `return (${expr})`);

        std.err.printf("[reloaded %s] expr='%s' (length=%d)\n",
            new Date().toLocaleTimeString(), expr, expr.length);
    } catch (e) {
        std.err.printf("[error loading formula] %s: %s\n", e.message, e.stack || "");
    }
}

const [st, err] = os.stat(formulaPath);
if (err === 0) {
    lastMtime = st.mtime;
    loadFormula();
}

// Math functions - use fast tables if enabled
let sin, cos, tan, random;

if (useFastMath) {
    // Fast lookup-table based trig functions
    sin = (x) => {
        const normalized = ((x % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const index = Math.floor((normalized / (Math.PI * 2)) * TABLE_SIZE) % TABLE_SIZE;
        return sinTable[index];
    };
    cos = (x) => {
        const normalized = ((x % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const index = Math.floor((normalized / (Math.PI * 2)) * TABLE_SIZE) % TABLE_SIZE;
        return cosTable[index];
    };
    tan = (x) => {
        const normalized = ((x % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const index = Math.floor((normalized / (Math.PI * 2)) * TABLE_SIZE) % TABLE_SIZE;
        return tanTable[index];
    };
    
    // xorshift32 PRNG
    let seed = 2463534242;
    random = () => {
        seed ^= seed << 13;
        seed ^= seed >> 17;
        seed ^= seed << 5;
        return ((seed >>> 0) / 0xFFFFFFFF);
    };
} else {
    // Standard Math functions
    sin = Math.sin;
    cos = Math.cos;
    tan = Math.tan;
    random = Math.random;
}

const { log, exp, pow, sqrt, abs, floor, ceil, round } = Math;

for (; ;) {
    // Fill buffer
    for (let i = 0; i < BUFFER_SIZE; i++) {
        try {
            buffer[i] = genFunc(t++, sin, cos, tan, log, exp, pow, sqrt, abs, floor, ceil, round, random) & 255;
        } catch (e) {
            buffer[i] = 128;
            lastError = e;
        }
    }

    std.out.write(buffer.buffer, 0, BUFFER_SIZE);

    if (lastError) {
        std.err.printf("[error] %s\n", lastError.message || lastError);
        lastError = null;
    }

    const [st, err] = os.stat(formulaPath);
    if (err === 0 && st.mtime !== lastMtime) {
        lastMtime = st.mtime;
        loadFormula();
    }
}
