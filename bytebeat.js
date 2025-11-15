import * as std from "std";
import * as os from "os";
import { loadFormulaFromFile, createMathFunctions, compileFormula } from "./common.js";

const formulaPath = scriptArgs[1] || scriptArgs[0];
const sampleRate = parseInt(scriptArgs[2]) || 8000;

let undersample = 1;
let floatOutput = false;
for (const arg of scriptArgs) {
    const match = arg.match(/^--undersample=(\d+)$/);
    if (match) {
        undersample = parseInt(match[1]);
        break;
    }

    if (arg === "--float") {
        floatOutput = true;
        break;
    }
}

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
const buffer = floatOutput ? new Float32Array(BUFFER_SIZE) : new Uint8Array(BUFFER_SIZE);

let t = 0;
let genFunc = null;
let lastMtime = 0;
let lastErrorMsg = "";

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

const mathFuncs = createMathFunctions();
const { sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round, min, max, tanh } = mathFuncs;

for (; ;) {
    try {
        if (undersample === 1) {
            for (let i = 0; i < BUFFER_SIZE; i++) {
                let pos = t++;

                if (floatOutput) {
                    pos = pos / sampleRate;
                }

                buffer[i] = genFunc(pos, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round, min, max, tanh);

                if (!floatOutput) {
                    buffer[i] = buffer[i] & 255;
                }
            }
        } else {
            for (let i = 0; i < BUFFER_SIZE; i += undersample) {
                let pos = t;

                if (floatOutput) {
                    pos = pos / sampleRate;
                }

                const val = genFunc(pos, sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round, min, max, tanh);

                for (let j = 0; j < undersample && i + j < BUFFER_SIZE; j++) {
                    buffer[i + j] = val;

                    if (!floatOutput) {
                        buffer[i + j] = buffer[i + j] & 255;
                    }
                }

                t += undersample;
            }
        }
    } catch (e) {
        if (lastErrorMsg !== e.message) {
            lastErrorMsg = e.message;
            std.err.printf("[error] %s\n", e.message);
        }
        for (let i = 0; i < BUFFER_SIZE; i++) {
            if (!floatOutput) {
                buffer[i] = 128;
            } else {
                buffer[i] = 0;
            }
        }
    }

    std.out.write(buffer.buffer, 0, BUFFER_SIZE);

    const [st, err] = os.stat(formulaPath);
    if (err === 0 && st.mtime !== lastMtime) {
        lastMtime = st.mtime;
        loadFormula();
    }
}
