import * as std from "std";
import * as os from "os";

const formulaPath = scriptArgs[1] || scriptArgs[0];
const useFastMath = scriptArgs.includes("--fast");
const useCache = !scriptArgs.includes("--no-cache");
const BUFFER_SIZE = 4096;
const buffer = new Uint8Array(BUFFER_SIZE);

let t = 0;
let genFunc = null;
let lastError = null;
let lastMtime = 0;

const TABLE_SIZE = 1024;
const TABLE_MASK = TABLE_SIZE - 1;
const TABLE_SCALE = TABLE_SIZE / (Math.PI * 2);
let sinTable, cosTable, tanTable;

const pow2Cache = new Float64Array(256);
for (let i = 0; i < 256; i++) {
    pow2Cache[i] = Math.pow(2, (i - 128) / 12); // Common musical intervals
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
    std.err.printf("[fast-math] Lookup tables initialized (%d entries)\n", TABLE_SIZE);
}

function loadFormula() {
    try {
        const f = std.open(formulaPath, "r");
        const content = f.readAsString().trim();
        f.close();

        let expr = "";
        let start = 0;
        for (let i = 0; i < content.length; i++) {
            if (content[i] === '\n') {
                const line = content.slice(start, i).trim();
                if (line && !line.startsWith('//')) {
                    if (expr) expr += '\n';
                    expr += line;
                }
                start = i + 1;
            }
        }
        const lastLine = content.slice(start).trim();
        if (lastLine && !lastLine.startsWith('//')) {
            if (expr) expr += '\n';
            expr += lastLine;
        }

        if (!expr) {
            std.err.printf("[error] no code found in formula file\n");
            return;
        }

        genFunc = new Function(
            't, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round, pow2',
            `return (${expr})`);

        std.err.printf("[reloaded %s] expr='%s' (length=%d)\n",
            new Date().toLocaleTimeString(), expr, expr.length);
    } catch (e) {
        std.err.printf("[error loading formula] %s\n", e.message);
    }
}

const [st, err] = os.stat(formulaPath);
if (err === 0) {
    lastMtime = st.mtime;
    loadFormula();
}

let sin, cos, tan, random;

if (useFastMath) {
    sin = (x) => {
        const idx = ((x * TABLE_SCALE) | 0) & TABLE_MASK;
        return sinTable[idx];
    };
    cos = (x) => {
        const idx = ((x * TABLE_SCALE) | 0) & TABLE_MASK;
        return cosTable[idx];
    };
    tan = (x) => {
        const idx = ((x * TABLE_SCALE) | 0) & TABLE_MASK;
        return tanTable[idx];
    };
    
    let seed = 2463534242;
    random = () => {
        seed ^= seed << 13;
        seed ^= seed >> 17;
        seed ^= seed << 5;
        return ((seed >>> 0) * 2.3283064365386963e-10); // Faster than division
    };
} else {
    sin = Math.sin;
    cos = Math.cos;
    tan = Math.tan;
    random = Math.random;
}

const { log, exp, sqrt, ceil, round } = Math;

const abs = (x) => x < 0 ? -x : x;
const floor = (x) => x | 0;

const pow = useCache ? (base, exp) => {
    if (base === 2 && exp >= -10.67 && exp <= 10.67) {
        const idx = ((exp * 12) + 128) | 0;
        if (idx >= 0 && idx < 256) return pow2Cache[idx];
    }
    return Math.pow(base, exp);
} : Math.pow;

const pow2 = (exp) => {
    if (exp >= -10.67 && exp <= 10.67) {
        const idx = ((exp * 12) + 128) | 0;
        if (idx >= 0 && idx < 256) return pow2Cache[idx];
    }
    return Math.pow(2, exp);
};

const STAT_CHECK_INTERVAL = 512;
let statCounter = 0;

let errorMode = false;

for (; ;) {
    if (!errorMode) {
        let i = 0;
        
        // Massive unroll: 16 samples at once
        try {
            for (; i < BUFFER_SIZE - 15; i += 16) {
                buffer[i] = genFunc(t++, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round, pow2) & 255;
                buffer[i+1] = genFunc(t++, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round, pow2) & 255;
                buffer[i+2] = genFunc(t++, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round, pow2) & 255;
                buffer[i+3] = genFunc(t++, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round, pow2) & 255;
                buffer[i+4] = genFunc(t++, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round, pow2) & 255;
                buffer[i+5] = genFunc(t++, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round, pow2) & 255;
                buffer[i+6] = genFunc(t++, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round, pow2) & 255;
                buffer[i+7] = genFunc(t++, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round, pow2) & 255;
                buffer[i+8] = genFunc(t++, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round, pow2) & 255;
                buffer[i+9] = genFunc(t++, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round, pow2) & 255;
                buffer[i+10] = genFunc(t++, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round, pow2) & 255;
                buffer[i+11] = genFunc(t++, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round, pow2) & 255;
                buffer[i+12] = genFunc(t++, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round, pow2) & 255;
                buffer[i+13] = genFunc(t++, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round, pow2) & 255;
                buffer[i+14] = genFunc(t++, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round, pow2) & 255;
                buffer[i+15] = genFunc(t++, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round, pow2) & 255;
            }
            // Remaining samples
            for (; i < BUFFER_SIZE; i++) {
                buffer[i] = genFunc(t++, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round, pow2) & 255;
            }
        } catch (e) {
            errorMode = true;
            lastError = e;
            // Fill remaining with silence
            for (; i < BUFFER_SIZE; i++) {
                buffer[i] = 128;
            }
        }
    } else {
        // Error recovery mode: slower but safer
        for (let i = 0; i < BUFFER_SIZE; i++) {
            try {
                buffer[i] = genFunc(t++, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round, pow2) & 255;
            } catch (e) {
                buffer[i] = 128;
            }
        }
        errorMode = false;
    }

    // Single write call
    std.out.write(buffer.buffer, 0, BUFFER_SIZE);

    if (lastError) {
        std.err.printf("[error] %s\n", lastError.message || lastError);
        lastError = null;
    }

    if (++statCounter >= STAT_CHECK_INTERVAL) {
        statCounter = 0;
        const [st, err] = os.stat(formulaPath);
        if (err === 0 && st.mtime !== lastMtime) {
            lastMtime = st.mtime;
            loadFormula();
        }
    }
}