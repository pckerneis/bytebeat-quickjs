import * as std from "std";
import * as os from "os";

const formulaPath = scriptArgs[1] || scriptArgs[0];
const useFastMath = scriptArgs.includes("--fast");
const BUFFER_SIZE = 512;
const buffer = new Uint8Array(BUFFER_SIZE);

const STAT_CHECK_INTERVAL = 256;
let statCounter = 0;

let t = 0;
let genFunc = null;
let lastError = null;
let lastMtime = 0;

const TABLE_SIZE = 2048;
const TABLE_MASK = TABLE_SIZE - 1;
const TABLE_SCALE = TABLE_SIZE / (Math.PI * 2);
let sinTable, cosTable, tanTable;

if (useFastMath) {
    sinTable = new Float64Array(TABLE_SIZE);
    cosTable = new Float64Array(TABLE_SIZE);
    tanTable = new Float64Array(TABLE_SIZE);
    
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
            't, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round',
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
        const normalized = x - Math.floor(x / (Math.PI * 2)) * (Math.PI * 2);
        const index = (normalized * TABLE_SCALE) & TABLE_MASK;
        return sinTable[index];
    };
    cos = (x) => {
        const normalized = x - Math.floor(x / (Math.PI * 2)) * (Math.PI * 2);
        const index = (normalized * TABLE_SCALE) & TABLE_MASK;
        return cosTable[index];
    };
    tan = (x) => {
        const normalized = x - Math.floor(x / (Math.PI * 2)) * (Math.PI * 2);
        const index = (normalized * TABLE_SCALE) & TABLE_MASK;
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
    sin = Math.sin;
    cos = Math.cos;
    tan = Math.tan;
    random = Math.random;
}

const { log, exp, pow, sqrt, abs, floor, ceil, round } = Math;

for (; ;) {
    let i = 0;
    try {
        for (; i < BUFFER_SIZE - 3; i += 4) {
            buffer[i] = genFunc(t++, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round) & 255;
            buffer[i+1] = genFunc(t++, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round) & 255;
            buffer[i+2] = genFunc(t++, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round) & 255;
            buffer[i+3] = genFunc(t++, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round) & 255;
        }
        for (; i < BUFFER_SIZE; i++) {
            buffer[i] = genFunc(t++, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round) & 255;
        }
    } catch (e) {
        for (; i < BUFFER_SIZE; i++) {
            buffer[i] = 128;
        }
        lastError = e;
    }

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