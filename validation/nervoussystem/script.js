import * as blocks from "./blocks.js";
import * as factory from "./factory.js";

export var workspace = null;
export var context = null;
export var explodedViewInput = null;
export var explosionLevel = 0;
export var lastExplosionViewState = false;
export var explosionAnimationTime = 0;
export var showIoModeInput = null;
export var things = [];
export var draggingThing = null;
export var tickSpeedInput = null;
export var currentTick = 0;
export var lastTickAt = 0;

var lastPointerX = 0;
var lastPointerY = 0;
var nextTickCallbacks = [];
var tickTimers = [];

var ease = (t) => t < 0.5 ? 2 * Math.pow(t, 2) : -1 + ((4 - (2 * t)) * t);

export class TickTimer {
    constructor(callback) {
        this.callback = callback;

        this.triggerAt = null;

        tickTimers.push(this);
    }

    set(duration) {
        this.triggerAt = currentTick + duration;
    }

    clear() {
        this.triggerAt = null;
    }
}

export function lerp(v0, v1, t) {
    return (v0 * (1 - t)) + (v1 * t);
}

export function invLerp(v0, v1, v) {
    return (v - v0) / (v1 - v0);
}

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

export function tickProgress() {
    return Math.min(Math.max((Date.now() - lastTickAt) / ((100 - tickSpeedInput.value) * 10), 0), 1);
}

export function onNextTick(callback) {
    nextTickCallbacks.push(callback);
}

function render() {
    var maxWorkspaceWidth = window.innerWidth - 10;
    var maxWorkspaceHeight = window.innerHeight - 10;

    if (explodedViewInput.checked != lastExplosionViewState) {
        explosionAnimationTime = Date.now();
        lastExplosionViewState = explodedViewInput.checked;
    }

    var explosionProgress = ease(Math.min(Math.max(Date.now() - explosionAnimationTime, 0) / 1000, 1));

    if (explodedViewInput.checked) {
        explosionLevel = explosionProgress;
    } else {
        explosionLevel = 1 - explosionProgress;
    }

    if (Date.now() - lastTickAt > (100 - tickSpeedInput.value) * 10) {
        currentTick++;
        lastTickAt = Date.now();

        var currentTickCallbacks = [...nextTickCallbacks];

        nextTickCallbacks = [];

        for (var callback of currentTickCallbacks) {
            try {
                callback();
            } catch (error) {
                console.warn(error);
            }
        }

        for (var callback of tickTimers.filter((timer) => timer.triggerAt == currentTick).map((timer) => timer.callback)) {
            try {
                callback();
            } catch (error) {
                console.warn(error);
            }
        }
    }

    for (var thing of things) {
        if (thing.renderedX + thing.width + 10 > maxWorkspaceWidth) {
            maxWorkspaceWidth = thing.renderedX + thing.width + 10;
        }

        if (thing.renderedY + thing.height + 10 > maxWorkspaceHeight) {
            maxWorkspaceHeight = thing.renderedY + thing.height + 10;
        }
    }

    workspace.width = maxWorkspaceWidth;
    workspace.height = maxWorkspaceHeight;

    var sortedThings = [...things].sort((a, b) => a.z - b.z);

    for (var thing of sortedThings) {
        thing.render();
    }

    for (var thing of sortedThings.filter((thing) => thing instanceof blocks.Block)) {
        thing.renderMessages();
    }

    requestAnimationFrame(render);
}

window.addEventListener("load", async function() {
    await document.fonts.load("1rem Brass Mono");

    workspace = document.querySelector("#workspace");
    explodedViewInput = document.querySelector("#explodedView");
    showIoModeInput = document.querySelector("#showIoMode");
    tickSpeedInput = document.querySelector("#tickSpeed");
    context = workspace.getContext("2d");

    render();

    var block1 = factory.processTokenList([
        "while", "score", "<", "1", "0", "0",
        "pendown",
        "forward", "2", "0",
        "left", "4", "5", "+", "(", "count", "*", "3", ")",
        "penup",
        "if", "count", "=", "score", "/", "2",
        "break",
        "end",
        "loop"
    ]);

    block1.x = 100;
    block1.y = 100;

    block1.moveDownstreamsUnderSelf();

    var block2 = factory.processTokenList([
        "for", "i", "=", "1", "to", "1", "0", "step", "2",
        "right", "1", "0", "-", "i",
        "forward", "5",
        "next",
    ]);

    block2.x = 500;
    block2.y = 600;

    block2.moveDownstreamsUnderSelf();

    workspace.addEventListener("pointerdown", function(event) {
        lastPointerX = event.pageX;
        lastPointerY = event.pageY;

        // if (!explodedViewInput.checked) {
            draggingThing = [...things].sort((a, b) => b.z - a.z).find((thing) => (
                (!explodedViewInput.checked || thing instanceof blocks.ControllerBlock) &&
                event.pageX >= thing.renderedX &&
                event.pageY >= thing.renderedY &&
                event.pageX < thing.renderedX + thing.width &&
                event.pageY < thing.renderedY + thing.height
            ));
        // }

        draggingThing?.bringToFront();
    });

    workspace.addEventListener("touchstart", function(event) {
        if (draggingThing) {
            event.preventDefault();
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

    document.querySelector("#pollButton").addEventListener("click", function() {
        for (var thing of things) {
            if (thing instanceof blocks.ControllerBlock) {
                thing.poll();
            }
        }
    });
});

new Audio("media/click.mp3").load(); // Preload clicking sound