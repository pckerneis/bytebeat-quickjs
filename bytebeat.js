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

// Precreate control file so watcher can signal
std.open(controlPath, "w").close();

const stdin = std.in;
stdin.setBlocking(false);

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
