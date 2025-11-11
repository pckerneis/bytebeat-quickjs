import * as std from "std";
import * as os from "os";
import { initFastMath, loadFormulaFromFile, createMathFunctions, compileFormula } from "./common.js";

const formulaPath = scriptArgs[1] || scriptArgs[0];
const useFastMath = scriptArgs.includes("--fast");
const BUFFER_SIZE = 4096;
const buffer = new Uint8Array(BUFFER_SIZE);

let t = 0;
let genFunc = null;
let lastError = null;
let lastMtime = 0;

// Initialize math tables
const tables = initFastMath(useFastMath);

function loadFormula() {
    try {
        const expr = loadFormulaFromFile(formulaPath);
        
        if (!expr) {
            std.err.printf("[error] no code found in formula file\n");
            return;
        }

        genFunc = compileFormula(expr);

        std.err.printf("[reloaded %s] len=%d\n",
            new Date().toLocaleTimeString(), expr.length);
    } catch (e) {
        std.err.printf("[error loading formula] %s\n", e.message);
    }
}

const [st, err] = os.stat(formulaPath);
if (err === 0) {
    lastMtime = st.mtime;
    loadFormula();
}

// Create math functions
const mathFuncs = createMathFunctions(useFastMath, tables);
const { sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round, pow2 } = mathFuncs;

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