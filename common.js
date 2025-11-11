import * as std from "std";

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

export function createMathFunctions() {
    const { sin, cos, tan, log, exp, sqrt, ceil, round, pow, random } = Math;
    const abs = (x) => x < 0 ? -x : x;
    const floor = (x) => x | 0;
    
    return { sin, cos, tan, random, sqrt, abs, floor, log, exp, pow, ceil, round };
}

export function compileFormula(expr) {
    const genFunc = new Function(
        't', 'sin', 'cos', 'tan', 'random', 'sqrt', 'abs', 'floor', 'log', 'exp', 'pow', 'ceil', 'round',
        `return (${expr})`
    );
    
    return genFunc;
}
