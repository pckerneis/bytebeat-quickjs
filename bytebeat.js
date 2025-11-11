import * as std from "std";
import * as os from "os";

// Debug: print all scriptArgs
std.err.printf("scriptArgs: %s\n", JSON.stringify(scriptArgs));

const formulaPath = scriptArgs[1] || scriptArgs[0];
const controlPath = "/tmp/bytebeat.reload";

let t = 0;
let expr = "(t*(t>>5|t>>8))&255";

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
    
    const newExpr = codeLines.join('\n');
    
    if (!newExpr) {
      std.err.printf("[error] no code found in formula file\n");
      return;
    }
    
    expr = newExpr;
    std.err.printf("[reloaded %s] expr='%s' (length=%d)\n", 
                   new Date().toLocaleTimeString(), expr, expr.length);
  } catch (e) {
    std.err.printf("[error loading formula] %s: %s\n", e.message, e.stack || "");
  }
}

loadFormula();

// Expose Math functions short names
globalThis.sin      = Math.sin;
globalThis.cos      = Math.cos;
globalThis.tan      = Math.tan;
globalThis.log      = Math.log;
globalThis.exp      = Math.exp;
globalThis.pow      = Math.pow;
globalThis.sqrt     = Math.sqrt;
globalThis.abs      = Math.abs;
globalThis.floor    = Math.floor;
globalThis.ceil     = Math.ceil;
globalThis.round    = Math.round;
globalThis.random   = Math.random;

function putchar(byte) {
    const buf = new Uint8Array(1);
    buf[0] = byte & 0xFF;
    std.out.write(buf.buffer);
}

// Audio loop
let lastError = null;
for (;;) {
  try {
    const val = eval(expr) & 255;
    putchar(val);
  } catch (e) {
    putchar(128);
    lastError = e;
  }
  t++;
  
  // Log errors periodically (every 8000 samples = 1 second at 8kHz)
  if (lastError && t % 8000 === 0) {
    std.err.printf("[error] %s | expr='%s'\n", lastError.message || lastError, expr);
    lastError = null;
  }

  // non-blocking reload signal check
  if (t % 1024 === 0) {
    const [stat_result, stat_err] = os.stat(controlPath);
    if (stat_err === 0) {
      os.remove(controlPath);
      loadFormula();
    }
  }
}
