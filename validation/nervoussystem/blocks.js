import * as ns from "./script.js";

export var nextZ = 1;

function getIoModeColour(ioMode) {
    if (!ns.showIoModeInput.checked) {
        return "#555555";
    }

    if (ioMode == "input") {
        return "#0000ff";
    }

    if (ioMode == "output") {
        return "#ff0000";
    }

    return "#555555";
}

export class Message {
    constructor(sender, recipient, type, data) {
        this.sender = sender;
        this.recipient = recipient;
        this.type = type;
        this.data = data;
    }

    render(x, y) {
        ns.context.globalAlpha = ns.explosionLevel;

        var lines = [
            this.type,
            ...Object.keys(this.data).map((key) => `${key}: ${this.data[key]}`)
        ];

        var maxLineWidth = 0;
        var lineHeight = ns.textMetrics(lines[0]).fontBoundingBoxDescent;

        for (var line of lines) {
            maxLineWidth = Math.max(ns.textMetrics(line).width, maxLineWidth);
        }

        ns.setColour("#aaaaaa");
        ns.fillRoundedRect(x, y, 8, 8, 0);
        ns.setColour("#cccccc");
        ns.fillRoundedRect(x, y, maxLineWidth + 8, (lineHeight * lines.length) + 8, 8);
        ns.drawRoundedRect(x, y, maxLineWidth + 8, (lineHeight * lines.length) + 8, 8);
        ns.setColour("#aaaaaa");
        ns.drawRoundedRect(x, y, maxLineWidth + 8, (lineHeight * lines.length) + 8, 8);

        ns.setColour("#000000");

        for (var i = 0; i < lines.length; i++) {
            ns.drawText(lines[i], x + 4, y + 4 + (lineHeight * i));
        }

        ns.context.globalAlpha = 1;
    }
}

export class IoSendError extends Error {
    constructor() {
        super("Cannot send message due to IO configuration");
    }
}

export class IoReceiveError extends Error {
    constructor() {
        super("Cannot receive message due to IO configuration");
    }
}

export class Block {
    constructor(value, bg = "#777777", fg = "#ffffff") {
        this.value = value;
        this.bg = bg;
        this.fg = fg;

        this.x = 0;
        this.y = 0;
        this.z = 0;

        this.outbox = [];
    }

    get renderedX() {
        return this.x;
    }

    get renderedY() {
        return this.y;
    }

    get width() {
        return ns.textMetrics(this.value.length >= 2 || this instanceof ArgumentBlock ? this.value : "..", 3).width + 12;
    }

    get height() {
        return ns.textMetrics(this.value, 3).fontBoundingBoxDescent + 12;
    }

    render() {
        ns.setColour(this.bg);
        ns.fillRoundedRect(this.renderedX, this.renderedY, this.width, this.height, 12);

        ns.setColour(this.fg);
        ns.drawText(this.value, this.renderedX + 6, this.renderedY + 6, 3);
    }

    renderMessages() {}

    bringToFront() {
        this.z = nextZ++;
    }

    drag(deltaX, deltaY, byUser = true) {
        this.x += deltaX;
        this.y += deltaY;
    }

    drop() {}

    handleMessage(message) {}

    sendMessage(recipient, type, data = {}) {
        if (!recipient) {
            return;
        }

        if (this.outbox.find((message) => message.recipient == recipient)) {
            throw new Error("Message is already being sent to recipient");
        }

        this.outbox.push(new Message(this, recipient, type, data));

        if (this.outbox.length == 1) {
            ns.onNextTick(() => {
                for (var message of this.outbox) {
                    message.recipient.handleMessage(message);
                }

                this.outbox = [];
            });
        }
    }
}

export class ControllerBlock extends Block {
    constructor() {
        super("", "#cccccc");

        this.downstreamBlock = null;
        this.downstreamIoMode = "output";

        this.resetTimer = new ns.TickTimer(() => {
            this.downstreamIoMode = "output";
        });
    }

    get width() {
        return 280;
    }

    get height() {
        return 80;
    }

    render() {
        if (this.downstreamBlock) {
            ns.setColour("#777777");

            ns.fillRoundedRect(
                this.renderedX + 14,
                this.renderedY + this.height + 4,
                36,
                this.downstreamBlock.renderedY - this.renderedY - this.height,
                0
            );
        }

        ns.setColour(getIoModeColour(this.downstreamIoMode));
        ns.fillRoundedRect(this.renderedX + 12, this.renderedY + this.height - 4, 40, 8, this.downstreamBlock ? 0 : 4);

        super.render();

        ns.setColour("#333333");
        ns.drawText("attoblocks", this.renderedX + 8, this.renderedY + 8, 1);

        for (var i = 0; i < 5; i++) {
            ns.setColour("#777777");
            ns.fillRoundedRect(this.renderedX + 24 + (i * 48), this.renderedY + 28, 32, 32, 16);
            ns.drawText(["run", "stop", "speed", "step", "link"][i], this.renderedX + 24 + (i * 48), this.renderedY + 64, 0.8);
        }
    }

    renderMessages() {
        for (var message of this.outbox) {
            if (message.recipient == this.downstreamBlock && this.downstreamBlock) {
                message.render(this.renderedX + 32, ns.lerp(this.renderedY + this.height + 4, this.downstreamBlock.renderedY - 4, ns.tickProgress()));
            }
        }
    }

    moveDownstreamsUnderSelf() {
        this.downstreamBlock?.moveUnder(this);
    }

    bringToFront() {
        super.bringToFront();

        this.downstreamBlock?.bringToFront();
    }

    drag(deltaX, deltaY, byUser = true) {
        super.drag(deltaX, deltaY);

        this.downstreamBlock?.drag(deltaX, deltaY, byUser = false);
    }

    handleMessage(message) {
        if (message.sender == this.downstreamBlock && this.downstreamIoMode != "input") {
            throw new IoReceiveError();
        }

        this.resetTimer.set(4);
    }

    sendMessage(recipient, type, data = undefined) {
        if (recipient == this.downstreamBlock && this.downstreamIoMode != "output") {
            throw new IoSendError();
        }

        super.sendMessage(recipient, type, data);
    }

    poll() {
        this.sendMessage(this.downstreamBlock, "discovery");

        this.downstreamIoMode = "input";

        this.resetTimer.set(4);
    }
}

export class CommandBlock extends Block {
    constructor(value, bg = undefined, fg = undefined) {
        super(value, bg, fg);

        this.upstreamBlock = null;
        this.upstreamIoMode = "input";
        this.downstreamBlock = null;
        this.downstreamIoMode = "output";

        this.resetTimer = new ns.TickTimer(() => {
            this.upstreamIoMode = "input";
            this.downstreamIoMode = "output";
        });
    }

    get renderedY() {
        if (ns.explosionLevel > 0 && this.upstreamBlock) {
            return this.upstreamBlock.renderedY + this.upstreamBlock.height + 8 + (ns.explosionLevel * 60);
        }

        return super.renderedY;
    }

    render() {
        if (this.downstreamBlock) {
            ns.setColour("#777777");

            ns.fillRoundedRect(
                this.renderedX + 14,
                this.renderedY + this.height + 4,
                36,
                this.downstreamBlock.renderedY - this.renderedY - this.height,
                0
            );
        }

        ns.setColour(getIoModeColour(this.upstreamIoMode));
        ns.fillRoundedRect(this.renderedX + 12, this.renderedY - 4, 40, 8, this.upstreamBlock ? 0 : 4);
        ns.setColour(getIoModeColour(this.downstreamIoMode));
        ns.fillRoundedRect(this.renderedX + 12, this.renderedY + this.height - 4, 40, 8, this.downstreamBlock ? 0 : 4);

        super.render();
    }

    renderMessages() {
        for (var message of this.outbox) {
            if (message.recipient == this.upstreamBlock && this.upstreamBlock) {
                message.render(this.renderedX + 32, ns.lerp(this.renderedY - 4, this.upstreamBlock.renderedY + this.upstreamBlock.height + 4, ns.tickProgress()));
            }

            if (message.recipient == this.downstreamBlock && this.downstreamBlock) {
                message.render(this.renderedX + 32, ns.lerp(this.renderedY + this.height + 4, this.downstreamBlock.renderedY - 4, ns.tickProgress()));
            }
        }
    }

    moveUnder(block) {
        this.x = block.x;
        this.y = block.y + block.height + 7;

        this.moveDownstreamsUnderSelf();
    }

    moveDownstreamsUnderSelf() {
        this.downstreamBlock?.moveUnder(this);
    }

    connectUnder(block) {
        this.upstreamBlock = block;
        block.downstreamBlock = this;

        this.moveUnder(block);
        this.moveDownstreamsUnderSelf();
    }

    bringToFront() {
        super.bringToFront();

        this.downstreamBlock?.bringToFront();
    }

    drag(deltaX, deltaY, byUser = true) {
        super.drag(deltaX, deltaY);

        if (this.upstreamBlock && byUser) {
            this.upstreamBlock.downstreamBlock = null;
            this.upstreamBlock = null;
        }

        this.downstreamBlock?.drag(deltaX, deltaY, byUser = false);
    }

    drop() {
        for (var thing of ns.things) {
            if (
                (thing instanceof ControllerBlock || thing instanceof CommandBlock) && !thing.downstreamBlock &&
                thing.x >= this.x - 20 && thing.x < this.x + 20 &&
                thing.y + thing.height >= this.y - 20 && thing.y < this.y - 20
            ) {
                this.connectUnder(thing);

                new Audio("media/click.mp3").play();

                break;
            }
        }
    }

    handleMessage(message) {
        if (message.sender == this.upstreamBlock && this.upstreamIoMode != "input") {
            throw new IoReceiveError();
        }

        if (message.sender == this.downstreamBlock && this.downstreamIoMode != "input") {
            throw new IoReceiveError();
        }

        this.resetTimer.set(4);

        if (message.type == "discovery") {
            this.upstreamIoMode = "output";

            this.sendMessage(this.downstreamBlock, "discovery");
            this.sendMessage(this.upstreamBlock, "reporting", {value: this.value});

            this.downstreamIoMode = "input";
        }

        if (["reporting", "argumentCompletion"].includes(message.type)) {
            this.sendMessage(this.upstreamBlock, message.type, message.data);
        }
    }

    sendMessage(recipient, type, data = undefined) {
        if (recipient == this.upstreamBlock && this.upstreamIoMode != "output") {
            throw new IoSendError();
        }

        if (recipient == this.downstreamBlock && this.downstreamIoMode != "output") {
            throw new IoSendError();
        }

        super.sendMessage(recipient, type, data);
    }
}

export class CommandBlockWithArguments extends CommandBlock {
    constructor(value, bg = undefined, fg = undefined) {
        super(value, bg, fg);

        this.firstArgumentBlock = null;
        this.firstArgumentIoMode = "output";

        this.argumentCompletionTimer = new ns.TickTimer(() => {
            this.firstArgumentIoMode = "output";
            
            this.sendMessage(this.upstreamBlock, "argumentCompletion");
            this.sendMessage(this.downstreamBlock, "discovery");

            this.downstreamIoMode = "input";
        });

        this.resetTimer = new ns.TickTimer(() => {
            this.upstreamIoMode = "input";
            this.downstreamIoMode = "output";
            this.firstArgumentIoMode = "output";
        });
    }

    render() {
        if (this.firstArgumentBlock) {
            ns.setColour("#777777");

            ns.fillRoundedRect(
                this.renderedX + this.width + 4,
                this.renderedY + ((this.height - 36) / 2),
                this.firstArgumentBlock.renderedX - this.renderedX - this.width,
                36,
                0
            );
        }

        ns.setColour(getIoModeColour(this.firstArgumentIoMode));
        ns.fillRoundedRect(this.renderedX + this.width - 4, this.renderedY + ((this.height - 40) / 2), 8, 40, this.firstArgumentBlock ? 0 : 4);

        super.render();
    }

    renderMessages() {
        super.renderMessages();

        for (var message of this.outbox) {
            if (message.recipient == this.firstArgumentBlock && this.firstArgumentBlock) {
                message.render(ns.lerp(this.renderedX + this.width + 4, this.firstArgumentBlock.renderedX - 4, ns.tickProgress()), this.renderedY + (this.height / 2));
            }
        }
    }

    moveDownstreamsUnderSelf() {
        super.moveDownstreamsUnderSelf();

        this.firstArgumentBlock?.moveUnder(this);
    }

    bringToFront() {
        super.bringToFront();

        this.downstreamBlock?.bringToFront();
        this.firstArgumentBlock?.bringToFront();
    }

    drag(deltaX, deltaY, byUser = true) {
        super.drag(deltaX, deltaY, byUser);

        this.firstArgumentBlock?.drag(deltaX, deltaY, false);
    }

    handleMessage(message) {
        if (message.sender == this.upstreamBlock && this.upstreamIoMode != "input") {
            throw new IoReceiveError();
        }

        if (message.sender == this.downstreamBlock && this.downstreamIoMode != "input") {
            throw new IoReceiveError();
        }

        if (message.sender == this.firstArgumentBlock && this.firstArgumentIoMode != "input") {
            throw new IoReceiveError();
        }

        this.resetTimer.set(4);

        if (message.type == "discovery") {
            this.upstreamIoMode = "output";

            this.sendMessage(this.firstArgumentBlock, "discovery");
            this.sendMessage(this.upstreamBlock, "reporting", {value: this.value});

            this.firstArgumentIoMode = "input";

            this.argumentCompletionTimer.set(2);
        }

        if (["reporting", "argumentCompletion"].includes(message.type)) {
            this.sendMessage(this.upstreamBlock, message.type, message.data);

            if (message.sender == this.firstArgumentBlock) {
                this.argumentCompletionTimer.set(2);
            }
        }
    }

    sendMessage(recipient, type, data = undefined) {
        if (recipient == this.upstreamBlock && this.upstreamIoMode != "output") {
            throw new IoSendError();
        }

        if (recipient == this.downstreamBlock && this.downstreamIoMode != "output") {
            throw new IoSendError();
        }

        if (recipient == this.firstArgumentBlock && this.firstArgumentIoMode != "output") {
            throw new IoSendError();
        }

        super.sendMessage(recipient, type, data);
    }
}

export class ArgumentBlock extends Block {
    constructor(value, bg = undefined, fg = undefined) {
        super(value, bg, fg);

        this.upstreamBlock = null;
        this.upstreamIoMode = "input";
        this.downstreamBlock = null;
        this.downstreamIoMode = "output";

        this.resetTimer = new ns.TickTimer(() => {
            this.upstreamIoMode = "input";
            this.downstreamIoMode = "output";
        });
    }

    get renderedX() {
        if (ns.explosionLevel > 0 && this.upstreamBlock) {
            return this.upstreamBlock.renderedX + this.upstreamBlock.width + 8 + (ns.explosionLevel * 60);
        }

        return super.renderedX;
    }

    get renderedY() {
        if (ns.explosionLevel > 0 && this.upstreamBlock) {
            return this.upstreamBlock.renderedY;
        }

        return super.renderedY;
    }

    render() {
        if (this.downstreamBlock) {
            ns.setColour("#777777");

            ns.fillRoundedRect(
                this.renderedX + this.width + 4,
                this.renderedY + ((this.height - 36) / 2),
                this.downstreamBlock.renderedX - this.renderedX - this.width,
                36,
                0
            );
        }

        ns.setColour(getIoModeColour(this.upstreamIoMode));
        ns.fillRoundedRect(this.renderedX - 4, this.renderedY + ((this.height - 40) / 2), 8, 40, this.upstreamBlock ? 0 : 4);
        ns.setColour(getIoModeColour(this.downstreamIoMode));
        ns.fillRoundedRect(this.renderedX + this.width - 4, this.renderedY + ((this.height - 40) / 2), 8, 40, this.downstreamBlock ? 0 : 4);

        super.render();
    }

    renderMessages() {
        for (var message of this.outbox) {
            if (message.recipient == this.upstreamBlock && this.upstreamBlock) {
                message.render(ns.lerp(this.renderedX - 4, this.upstreamBlock.renderedX + this.upstreamBlock.width + 4, ns.tickProgress()), this.renderedY + (this.height / 2));
            }

            if (message.recipient == this.downstreamBlock && this.downstreamBlock) {
                message.render(ns.lerp(this.renderedX + this.width + 4, this.downstreamBlock.renderedX - 4, ns.tickProgress()), this.renderedY + (this.height / 2));
            }
        }
    }

    moveUnder(block) {
        this.x = block.x + block.width + 7;
        this.y = block.y;

        this.moveDownstreamsUnderSelf();
    }

    moveDownstreamsUnderSelf() {
        this.downstreamBlock?.moveUnder(this);
    }

    connectUnder(block) {
        this.upstreamBlock = block;

        if (block instanceof CommandBlockWithArguments) {
            block.firstArgumentBlock = this;
        } else {
            block.downstreamBlock = this;
        }

        this.moveUnder(block);
        this.moveDownstreamsUnderSelf();
    }

    bringToFront() {
        super.bringToFront();

        this.downstreamBlock?.bringToFront();
    }

    drag(deltaX, deltaY, byUser = true) {
        super.drag(deltaX, deltaY);

        if (this.upstreamBlock && byUser) {
            if (this.upstreamBlock instanceof CommandBlockWithArguments) {
                this.upstreamBlock.firstArgumentBlock = null;
            } else {
                this.upstreamBlock.downstreamBlock = null;
            }

            this.upstreamBlock = null;
        }

        this.downstreamBlock?.drag(deltaX, deltaY, byUser = false);
    }

    drop() {
        for (var thing of ns.things) {
            if (
                (
                    (thing instanceof ArgumentBlock && !thing.downstreamBlock) ||
                    (thing instanceof CommandBlockWithArguments && !thing.firstArgumentBlock)
                ) &&
                thing.x + thing.width >= this.x - 20 && thing.x + thing.width < this.x + 20 &&
                thing.y >= this.y - 20 && thing.y < this.y + 20
            ) {
                this.connectUnder(thing);

                new Audio("media/click.mp3").play();

                break;
            }
        }
    }

    handleMessage(message) {
        if (message.sender == this.upstreamBlock && this.upstreamIoMode != "input") {
            throw new IoReceiveError();
        }

        if (message.sender == this.downstreamBlock && this.downstreamIoMode != "input") {
            throw new IoReceiveError();
        }

        this.resetTimer.set(4);

        if (message.type == "discovery") {
            this.upstreamIoMode = "output";

            this.sendMessage(this.downstreamBlock, "discovery");
            this.sendMessage(this.upstreamBlock, "reporting", {value: this.value});

            this.downstreamIoMode = "input";
        }

        if (["reporting"].includes(message.type)) {
            this.sendMessage(this.upstreamBlock, message.type, message.data);
        }
    }

    sendMessage(recipient, type, data = undefined) {
        if (recipient == this.upstreamBlock && this.upstreamIoMode != "output") {
            throw new IoSendError();
        }

        if (recipient == this.downstreamBlock && this.downstreamIoMode != "output") {
            throw new IoSendError();
        }

        super.sendMessage(recipient, type, data);
    }
}