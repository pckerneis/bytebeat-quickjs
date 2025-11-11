// Shared utilities for bytebeat scripts
import * as std from "std";

export const TABLE_SIZE = 1024;
export const TABLE_MASK = TABLE_SIZE - 1;
export const TABLE_SCALE = TABLE_SIZE / (Math.PI * 2);

export const POW2_CACHE_SIZE = 512;

// Initialize lookup tables and caches
export function initFastMath(useFastMath) {
    const pow2Cache = new Float32Array(POW2_CACHE_SIZE);
    for (let i = 0; i < POW2_CACHE_SIZE; i++) {
        pow2Cache[i] = Math.pow(2, (i - 256) / 12);
    }

    let sinTable, cosTable, tanTable;
    
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
    
    return { sinTable, cosTable, tanTable, pow2Cache };
}

// Load and parse formula from file
export function loadFormulaFromFile(path) {
    const f = std.open(path, "r");
    let expr = "";
    const content = f.readAsString();
    f.close();

    for (let i = 0, start = 0; i <= content.length; i++) {
        if (i === content.length || content[i] === '\n') {
            const line = content.slice(start, i).trim();
            if (line && !line.startsWith('//')) {
                if (expr) expr += '\n';
                expr += line;
            }
            start = i + 1;
        }
    }
    
    return expr;
}

// Create optimized math functions
export function createMathFunctions(useFastMath, tables) {
    const { sinTable, cosTable, tanTable, pow2Cache } = tables;
    
    let sin, cos, tan, random;
    
    if (useFastMath) {
        sin = (x) => sinTable[((x * TABLE_SCALE) | 0) & TABLE_MASK];
        cos = (x) => cosTable[((x * TABLE_SCALE) | 0) & TABLE_MASK];
        tan = (x) => tanTable[((x * TABLE_SCALE) | 0) & TABLE_MASK];
        
        let seed = 2463534242;
        random = () => {
            seed ^= seed << 13;
            seed ^= seed >> 17;
            seed ^= seed << 5;
            return (seed >>> 0) * 2.3283064365386963e-10;
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
    
    const pow2 = (x) => {
        const idx = ((x * 12) + 256) | 0;
        return (idx >= 0 && idx < POW2_CACHE_SIZE) ? pow2Cache[idx] : Math.pow(2, x);
    };
    
    const pow = (base, exp) => base === 2 ? pow2(exp) : Math.pow(base, exp);
    
    return { sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round, pow2 };
}

// Compile formula into function
export function compileFormula(expr, mathFuncs) {
    const genFunc = new Function(
        't', 'sin', 'cos', 'tan', 'random', 'sqrt', 'abs', 'floor', 'log', 'exp', 'pow', 'ceil', 'round', 'pow2',
        `return (${expr})`
    );
    
    return genFunc;
}
