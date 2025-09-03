function lintJavaScript(code) {
    const errors = [];
    let stack = [];
    let line = 1,
        col = 0;
    let inString = false;
    let stringChar = null;
    let inTripleString = false;
    let escape = false;
    let inComment = false;

    const bracketDepthAtLine = {};
    let currentBracketDepth = 0;

    for (let i = 0; i < code.length; i++) {
        let char = code[i];

        if (inString && !inTripleString && char === "\\" && code[i + 1] === "\n") {
            i++;
            line++;
            col = 0;
            continue;
        }

        if (inString && !inTripleString && char === "\n") {
            errors.push({
                line,
                col,
                message: "EOL while scanning string literal",
            });
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

        if (inComment) continue;

        if (inString) {
            if (escape) {
                escape = false;
                continue;
            }
            if (char === "\\") {
                const allowedEscapes = ["'", '"', "`", "\\", "b", "f", "n", "r", "t", "v", "0", "x", "u"];
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
            if (inTripleString) {
                if (char === "`") {
                    inString = false;
                    inTripleString = false;
                    stringChar = null;
                }
                continue;
            } else {
                if (char === stringChar) {
                    inString = false;
                    stringChar = null;
                }
                continue;
            }
        }

        if (char === "/" && code[i + 1] === "/") {
            inComment = true;
            continue;
        }
        if (char === "'" || char === '"') {
            inString = true;
            inTripleString = false;
            stringChar = char;
            continue;
        }
        if (char === "`") {
            inString = true;
            inTripleString = true;
            stringChar = "`";
            continue;
        }
        if (char === "(" || char === "[" || char === "{") {
            stack.push({ char, line, col });
            currentBracketDepth++;
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
            currentBracketDepth = Math.max(0, currentBracketDepth - 1);
            continue;
        }
    }

    bracketDepthAtLine[line] = currentBracketDepth;

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

    const codeLines = code.split(/\r?\n/);

    for (let i = 0; i < codeLines.length; i++) {
        let ln = codeLines[i];
        let lineNumber = i + 1;
        if (/^\s*$/.test(ln)) continue;

        let leadingWhitespaceMatch = ln.match(/^[ \t]*/);
        let leadingWhitespace = leadingWhitespaceMatch ? leadingWhitespaceMatch[0] : "";
        if (leadingWhitespace.includes(" ") && leadingWhitespace.includes("\t")) {
            errors.push({
                line: lineNumber,
                col: 1,
                message: "Mixed tabs and spaces in indentation",
            });
        }

        const lineBracketDepth = bracketDepthAtLine[lineNumber] || 0;
        if (lineBracketDepth === 0) {
            let trimmed = ln.trim();
            const blockHeaderRegex = /^(if|else|for|while|function|class)\b/;
            if (blockHeaderRegex.test(trimmed) && !trimmed.endsWith("{")) {
                errors.push({
                    line: lineNumber,
                    col: ln.length,
                    message: "Missing '{' at end of block header",
                });
            }
        }
    }

    return errors;
}

export { lintJavaScript };
