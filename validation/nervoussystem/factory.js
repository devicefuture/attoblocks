import * as ns from "./script.js";
import * as blocks from "./blocks.js";

export const COLOURS = {
    black: "rgb(0, 0, 0)",
    purple: "rgb(94, 52, 235)",
    darkGreen: "rgb(62, 181, 74)",
    darkBlue: "rgb(28, 90, 189)",
    red: "rgb(237, 26, 58)",
    magenta: "rgb(219, 29, 118)",
    brown: "rgb(199, 80, 20)",
    lightGrey: "rgb(238, 238, 238)",
    darkGrey: "rgb(56, 56, 56)",
    lightPurple: "rgb(130, 134, 245)",
    lightGreen: "rgb(96, 230, 110)",
    lightBlue: "rgb(80, 177, 242)",
    lightRed: "rgb(255, 97, 121)",
    pink: "rgb(255, 71, 191)",
    yellow: "rgb(252, 218, 63)",
    white: "rgb(255, 255, 255)"
};

export var tokens = {};

["if", "else", "else if", "for", "repeat", "while", "until", "delay"].forEach(function(name) {
    tokens[name] = () => new blocks.StatementBlockWithArguments(name, COLOURS.darkBlue, COLOURS.white);
});

["end", "next", "loop", "return", "break", "continue", "stop"].forEach(function(name) {
    tokens[name] = () => new blocks.StatementBlock(name, COLOURS.darkBlue, COLOURS.white);
});

["to", "step"].forEach(function(name) {
    tokens[name] = () => new blocks.ArgumentBlock(name, COLOURS.darkBlue, COLOURS.white);
});

["forward", "backward", "left", "right", "angle"].forEach(function(name) {
    tokens[name] = () => new blocks.StatementBlockWithArguments(name, COLOURS.darkGreen, COLOURS.white);
});

["penup", "pendown"].forEach(function(name) {
    tokens[name] = () => new blocks.StatementBlock(name, COLOURS.darkGreen, COLOURS.white);
});

["+", "-", "*", "/", "div", "mod", ";", "&", "|", "~"].forEach(function(name) {
    tokens[name] = () => new blocks.ArgumentBlock(name, COLOURS.lightGrey, COLOURS.pink);
});

["=", "<", "<=", ">", ">=", "!=", "and", "or", "xor", "not"].forEach(function(name) {
    tokens[name] = () => new blocks.ArgumentBlock(name, COLOURS.lightGrey, COLOURS.darkBlue);
});

["(", ")"].forEach(function(name) {
    tokens[name] = () => new blocks.ArgumentBlock(name, COLOURS.lightGrey, COLOURS.darkGrey);
});

for (var i = 0; i <= 9; i++) {
    (function(i) {
        tokens[String(i)] = () => new blocks.ArgumentBlock(String(i), COLOURS.lightGrey, COLOURS.black);
    })(i);
}

export function processTokenList(tokenList) {
    var firstBlock = null;
    var lastBlock = null;
    var lastStatement = null;

    for (var name of tokenList) {
        var block = (tokens[name] || (() => new blocks.ArgumentBlock(name, COLOURS.lightGrey, COLOURS.black)))();

        ns.things.push(block);

        if (!firstBlock) {
            firstBlock = block;
        }

        if (lastBlock) {
            if (lastBlock instanceof blocks.ArgumentBlock && block instanceof blocks.StatementBlock) {
                if (lastStatement) {
                    block.connectUnder(lastStatement);
                }
            } else {
                block.connectUnder(lastBlock);
            }
        }

        lastBlock = block;

        if (block instanceof blocks.StatementBlock) {
            lastStatement = block;
        }
    }

    return firstBlock;
}