import * as std from "std";
import * as os from "os";


const formulaPath = scriptArgs[1] || scriptArgs[0];
const controlPath = "/tmp/bytebeat.reload";

let t = 0;
let genFunc = null;

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

loadFormula();

// Audio loop with buffering
const BUFFER_SIZE = 16384;
const buffer = new Uint8Array(BUFFER_SIZE);
let lastError = null;

for (;;) {
  // Fill entire buffer at once for better performance
  for (let i = 0; i < BUFFER_SIZE; i++) {
    try {
      buffer[i] = genFunc(
          t,
          Math.sin, Math.cos, Math.tan, Math.log, Math.exp, Math.pow,
          Math.sqrt, Math.abs, Math.floor, Math.ceil, Math.round, Math.random
      ) & 255;
    } catch (e) {
      buffer[i] = 128;
      lastError = e;
    }
    t++;
  }
  
  // Write full buffer
  std.out.write(buffer.buffer, 0, BUFFER_SIZE);
  
  // Log errors periodically (once per buffer)
  if (lastError) {
    std.err.printf("[error] %s\n", lastError.message || lastError);
    lastError = null;
  }

  // non-blocking reload signal check (once per buffer)
  const [stat_result, stat_err] = os.stat(controlPath);
  if (stat_err === 0) {
    os.remove(controlPath);
    loadFormula();
  }
}
