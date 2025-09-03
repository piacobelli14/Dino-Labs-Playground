function lintJSON(code) {
    const errors = [];
    let stack = [];
    let line = 1;
    let col = 0;
    let inString = false;
    let stringChar = null;
    let escape = false;
    let inComment = false; 

    const bracketDepthAtLine = {};
    let currentBracketDepth = 0;

    for (let i = 0; i < code.length; i++) {
        const char = code[i];

        if (inString && char === "\\" && code[i + 1] === "\n") {
            i++;
            line++;
            col = 0;
            continue;
        }

        if (inString && char === "\n") {
            errors.push({ line, col, message: "EOL while scanning string literal" });
            inString = false;
        }

        if (char === "\n") {
            bracketDepthAtLine[line] = currentBracketDepth;
            line++;
            col = 0;
            inComment = false;
            continue;
        }
        col++;

        if (inComment) {
            continue;
        }

        if (inString) {
            if (escape) {
                escape = false;
                continue;
            }
            if (char === "\\") {
                const allowedEscapes = ["'", '"', "\\", "n", "r", "t", "0", "x", "u"];
                const nextChar = code[i + 1];
                if (nextChar && nextChar !== "\n" && !allowedEscapes.includes(nextChar)) {
                    errors.push({ line, col, message: `Invalid escape sequence \\${nextChar}` });
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

        if (char === "/" && code[i + 1] === "/") {
            inComment = true;
            continue;
        }

        if (char === "'" || char === '"') {
            inString = true;
            stringChar = char;
            continue;
        }

        if (char === "{" || char === "[") {
            stack.push({ char, line, col });
            currentBracketDepth++;
            continue;
        }
        if (char === "}" || char === "]") {
            if (stack.length === 0) {
                errors.push({ line, col, message: `Unmatched closing '${char}'` });
            } else {
                const last = stack.pop();
                if ((last.char === "{" && char !== "}") || (last.char === "[" && char !== "]")) {
                    errors.push({
                        line,
                        col,
                        message: `Mismatched closing '${char}'; expected closing for '${last.char}' from line ${last.line}, col ${last.col}`
                    });
                }
            }
            currentBracketDepth = Math.max(0, currentBracketDepth - 1);
            continue;
        }
    }

    bracketDepthAtLine[line] = currentBracketDepth;

    if (inString) {
        errors.push({ line, col, message: "Unclosed string literal" });
    }

    while (stack.length > 0) {
        const unclosed = stack.pop();
        errors.push({
            line: unclosed.line,
            col: unclosed.col,
            message: `Unclosed '${unclosed.char}'`
        });
    }

    try {
        JSON.parse(code);
    } catch (error) {
        errors.push({ line: 1, col: 1, message: `Invalid JSON: ${error.message || error}` });
    }

    return errors;
}

export { lintJSON };
