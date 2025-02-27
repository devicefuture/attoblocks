import * as blocks from "./blocks.js";

export var workspace = null;
export var context = null;
export var things = [];

export var draggingThing = null;
export var nextZ = 1;

var lastPointerX = 0;
var lastPointerY = 0;

export function setColour(colour) {
    context.fillStyle = colour;
    context.strokeStyle = colour;
}

export function drawText(text, x, y, scaleFactor = 1) {
    context.font = `${scaleFactor}em "Brass Mono", monospace`;
    context.textBaseline = "top";
    context.textAlign = "left";

    context.fillText(text, x, y);
}

export function textMetrics(text, scaleFactor = 1) {
    context.font = `${scaleFactor}em "Brass Mono", monospace`;
    context.textBaseline = "top";

    return context.measureText(text);
}

function pathRoundedRect(x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
}

export function drawRoundedRect(x, y, width, height, radius) {
    pathRoundedRect(x, y, width, height, radius);

    context.stroke();
}

export function fillRoundedRect(x, y, width, height, radius) {
    pathRoundedRect(x, y, width, height, radius);

    context.fill();
}

function render() {
    var maxWorkspaceWidth = window.innerWidth;
    var maxWorkspaceHeight = window.innerHeight;

    for (var thing of things) {
        if (thing.renderedX + thing.width > maxWorkspaceWidth) {
            maxWorkspaceWidth = thing.renderedX + thing.width;
        }

        if (thing.renderedY + thing.height > maxWorkspaceHeight) {
            maxWorkspaceHeight = thing.renderedY + thing.height;
        }
    }

    workspace.width = maxWorkspaceWidth;
    workspace.height = maxWorkspaceHeight;

    for (var thing of [...things].sort((a, b) => a.z - b.z)) {
        thing.render();
    }

    requestAnimationFrame(render);
}

window.addEventListener("load", function() {
    workspace = document.querySelector("#workspace");
    context = workspace.getContext("2d");

    for (var i = 0; i < 3; i++) {
        var testBlock = new blocks.StatementBlock(["end", "next", "loop"][i]);

        testBlock.x = 10;
        testBlock.y = 10 + (i * 80);
    
        things.push(testBlock);
    }

    for (var i = 0; i < 3; i++) {
        var testBlock = new blocks.StatementBlockWithArguments(["if", "for", "while"][i]);

        testBlock.x = 250;
        testBlock.y = 10 + (i * 80);
    
        things.push(testBlock);
    }

    for (var i = 0; i < 3; i++) {
        var testBlock = new blocks.StatementBlockWithArguments(["forward", "left", "right"][i]);

        testBlock.x = 500;
        testBlock.y = 10 + (i * 80);
    
        things.push(testBlock);
    }

    var lastX = 0;

    for (var i = 0; i < 5; i++) {
        var testBlock = new blocks.ArgumentBlock(["i", "=", "to", "step", "true"][i]);

        testBlock.x = lastX + 10;
        testBlock.y = 300;

        lastX += testBlock.width + 20;
    
        things.push(testBlock);
    }

    for (var i = 0; i < 10; i++) {
        var testBlock = new blocks.ArgumentBlock(String(i));

        testBlock.x = 10 + (i * 80);
        testBlock.y = 400;

        lastX += testBlock.width + 20;
    
        things.push(testBlock);
    }

    render();

    document.body.addEventListener("pointerdown", function(event) {
        lastPointerX = event.pageX;
        lastPointerY = event.pageY;

        draggingThing = things.find((thing) => (
            event.pageX >= thing.renderedX &&
            event.pageY >= thing.renderedY &&
            event.pageX < thing.renderedX + thing.width &&
            event.pageY < thing.renderedY + thing.height
        ));

        if (draggingThing) {
            draggingThing.z = nextZ++;
        }
    });

    document.body.addEventListener("pointermove", function(event) {
        if (draggingThing) {
            draggingThing.drag(event.pageX - lastPointerX, event.pageY - lastPointerY);
        }

        lastPointerX = event.pageX;
        lastPointerY = event.pageY;
    });

    window.addEventListener("pointerup", function() {
        draggingThing?.drop();

        draggingThing = null;
    });
});