import * as std from "std";
import * as os from "os";

const formulaPath = scriptArgs[0];
const controlPath = "/tmp/bytebeat.reload";

let t = 0;
let expr = "(t*(t>>5|t>>8))&255";

function loadFormula() {
  try {
    const f = std.open(formulaPath, "r");
    expr = f.readAsString().trim();
    f.close();
    std.err.printf("[reloaded %s]\n", new Date().toLocaleTimeString());
  } catch (e) {
    std.err.printf("[error loading formula] %s\n", e.message);
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

// Precreate control file so watcher can signal
std.open(controlPath, "w").close();

// Audio loop
for (;;) {
  try {
    const val = eval(expr) & 255;
    std.out.putchar(val);
  } catch (e) {
    std.out.putchar(128); // silence on error
  }
  t++;

  // non-blocking reload signal check
  if (t % 1024 === 0 && os.access(controlPath, os.R_OK)) {
    // remove the signal file after reading
    os.remove(controlPath);
    loadFormula();
  }
}
