import * as std from "std";
import * as os from "os";

const formulaPath = scriptArgs[1] || scriptArgs[0];
const BUFFER_SIZE = 512;
const buffer = new Uint8Array(BUFFER_SIZE);

let t = 0;
let genFunc = null;
let lastError = null;
let lastMtime = 0;

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

const { sin, cos, tan, log, exp, pow, sqrt, abs, floor, ceil, round, random } = Math;

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
