function lintXML(code) {
    const errors = [];
    let line = 1;
    let col = 0;
    let inTag = false;
    let tagName = "";
    let stack = [];
    let inString = false;
    let stringChar = null;
    let escape = false;
    let inComment = false;

    const bracketDepthAtLine = {};
    let currentBracketDepth = 0;

    for (let i = 0; i < code.length; i++) {
        const char = code[i];

        if (char === "\n") {
            bracketDepthAtLine[line] = currentBracketDepth;
            line++;
            col = 0;
            continue;
        }
        col++;

        if (!inComment && char === "<" && code.substr(i, 4) === "<!--") {
            inComment = true;
            continue;
        }
        if (inComment && code.substr(i, 3) === "-->") {
            inComment = false;
            i += 2;
            col += 2;
            continue;
        }
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

        if (char === "'" || char === '"') {
            inString = true;
            stringChar = char;
            continue;
        }

        if (!inTag && char === "<") {
            inTag = true;
            tagName = "";
            continue;
        } else if (inTag && char === ">") {
            inTag = false;
            const isClosing = tagName.startsWith("/");
            const isSelfClosing = tagName.endsWith("/");
            let pureTagName = tagName.replace(/^\//, "").replace(/\/$/, "").trim();

            if (pureTagName && !pureTagName.startsWith("?") && !pureTagName.startsWith("!")) {
                if (isClosing) {
                    if (stack.length === 0) {
                        errors.push({
                            line,
                            col,
                            message: `Unmatched closing tag </${pureTagName}>`,
                        });
                    } else {
                        const last = stack.pop();
                        if (last !== pureTagName) {
                            errors.push({
                                line,
                                col,
                                message: `Mismatched closing tag </${pureTagName}>; expected </${last}>`,
                            });
                        }
                    }
                } else if (!isSelfClosing) {
                    stack.push(pureTagName);
                }
            }
            tagName = "";
            continue;
        }

        if (inTag) {
            tagName += char;
        }
    }

    bracketDepthAtLine[line] = currentBracketDepth;

    if (stack.length > 0) {
        while (stack.length > 0) {
            const unclosed = stack.pop();
            errors.push({
                line,
                col,
                message: `Unclosed <${unclosed}>`,
            });
        }
    }

    const codeLines = code.split(/\r?\n/);

    for (let i = 0; i < codeLines.length; i++) {
        const ln = codeLines[i];
        const lineNumber = i + 1;
        if (/^\s*$/.test(ln)) continue;

        const leadingWhitespaceMatch = ln.match(/^[ \t]*/);
        const leadingWhitespace = leadingWhitespaceMatch ? leadingWhitespaceMatch[0] : "";
        if (leadingWhitespace.includes(" ") && leadingWhitespace.includes("\t")) {
            errors.push({
                line: lineNumber,
                col: 1,
                message: "Mixed tabs and spaces in indentation",
            });
        }
    }

    return errors;
}

export { lintXML };
