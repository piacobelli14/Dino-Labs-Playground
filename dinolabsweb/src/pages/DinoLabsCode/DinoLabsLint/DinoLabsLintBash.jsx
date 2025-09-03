function lintBash(code) {
    const errors = [];
    let stack = [];
    let line = 1,
        col = 0;
    let inString = false;
    let stringChar = null;
    let escape = false;
    let inComment = false;

    for (let i = 0; i < code.length; i++) {
        let char = code[i];

        if (inString && char === "\\" && code[i + 1] === "\n") {
            i++;
            line++;
            col = 0;
            continue;
        }

        if (inString && char === "\n") {
            errors.push({
                line,
                col,
                message: "EOL while scanning string literal",
            });
            inString = false;
        }

        if (char === "\n") {
            line++;
            col = 0;
            inComment = false;
            continue;
        }
        col++;

        if (inComment) continue;

        if (inString) {
            if (escape) {
                escape = false;
                continue;
            }
            if (char === "\\") {
                const allowedEscapes = ["'", '"', "\\", "n", "r", "t", "v", "0", "x", "u"];
                let nextChar = code[i + 1];
                if (nextChar && nextChar !== "\n" && !allowedEscapes.includes(nextChar)) {
                    errors.push({
                        line,
                        col,
                        message: `Invalid escape sequence \\${nextChar}`,
                    });
                }
                escape = true;
                continue;
            }
            if (char === stringChar) {
                inString = false;
                stringChar = null;
            }
            continue;
        }

        if (char === "#" && (i === 0 || code[i - 1] === "\n" || code[i - 1] === " ")) {
            inComment = true;
            continue;
        }
        if (char === "'" || char === '"') {
            inString = true;
            stringChar = char;
            continue;
        }
        if (char === "(" || char === "[" || char === "{") {
            stack.push({ char, line, col });
            continue;
        }
        if (char === ")" || char === "]" || char === "}") {
            if (stack.length === 0) {
                errors.push({
                    line,
                    col,
                    message: `Unmatched closing '${char}'`,
                });
            } else {
                let last = stack.pop();
                if (
                    (last.char === "(" && char !== ")") ||
                    (last.char === "[" && char !== "]") ||
                    (last.char === "{" && char !== "}")
                ) {
                    errors.push({
                        line,
                        col,
                        message: `Mismatched closing '${char}'; expected closing for '${last.char}' from line ${last.line}, col ${last.col}`,
                    });
                }
            }
            continue;
        }
    }

    if (inString) {
        errors.push({ line, col, message: "Unclosed string literal" });
    }

    while (stack.length > 0) {
        let unclosed = stack.pop();
        errors.push({
            line: unclosed.line,
            col: unclosed.col,
            message: `Unclosed '${unclosed.char}'`,
        });
    }

    return errors;
}

export { lintBash };
