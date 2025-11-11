import * as std from "std";
import * as os from "os";
import { loadFormulaFromFile, createMathFunctions, compileFormula } from "./common.js";

const formulaPath = scriptArgs[1] || scriptArgs[0];
const sampleRate = parseInt(scriptArgs[2]) || 8000;

// Parse undersample factor
let undersample = 1;
for (const arg of scriptArgs) {
    const match = arg.match(/^--undersample=(\d+)$/);
    if (match) {
        undersample = parseInt(match[1]);
        break;
    }
}

// Validate undersample
if (![1, 2, 4, 8].includes(undersample)) {
    std.err.printf("[error] undersample must be 1, 2, 4, or 8 (got %d)\n", undersample);
    std.exit(1);
}

if (sampleRate % undersample !== 0) {
    std.err.printf("[error] sample rate %d not divisible by undersample %d\n", sampleRate, undersample);
    std.exit(1);
}

if (undersample > 1) {
    std.err.printf("[undersample] factor=%d (compute every %d samples)\n", undersample, undersample);
}

const BUFFER_SIZE = 4096;
const buffer = new Uint8Array(BUFFER_SIZE);

let t = 0;
let genFunc = null;
let lastError = null;
let lastMtime = 0;

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
const mathFuncs = createMathFunctions();
const { sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round } = mathFuncs;

for (; ;) {
    // Render buffer
    try {
        if (undersample === 1) {
            // Normal mode: compute every sample
            for (let i = 0; i < BUFFER_SIZE; i++) {
                buffer[i] = genFunc(t++, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round) & 255;
            }
        } else {
            // Undersample mode: compute every Nth sample and duplicate
            for (let i = 0; i < BUFFER_SIZE; i += undersample) {
                const val = genFunc(t, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round) & 255;
                for (let j = 0; j < undersample && i + j < BUFFER_SIZE; j++) {
                    buffer[i + j] = val;
                }
                t += undersample;
            }
        }
    } catch (e) {
        if (lastError !== e.message) {
            lastError = e.message;
            std.err.printf("[error] %s\n", e.message);
        }
        // Fill with silence on error
        for (let i = 0; i < BUFFER_SIZE; i++) {
            buffer[i] = 128;
        }
    }

    // Single write call
    std.out.write(buffer.buffer, 0, BUFFER_SIZE);

    if (lastError) {
        std.err.printf("[error] %s\n", lastError.message || lastError);
        lastError = null;
    }

    // Check for formula file changes every buffer
    const [st, err] = os.stat(formulaPath);
    if (err === 0 && st.mtime !== lastMtime) {
        lastMtime = st.mtime;
        loadFormula();
    }
}