import * as ns from "./script.js";

export var nextZ = 1;

export class Block {
    constructor(value, bg = "#777777", fg = "#ffffff") {
        this.value = value;
        this.bg = bg;
        this.fg = fg;

        this.x = 0;
        this.y = 0;
        this.z = 0;
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

    bringToFront() {
        this.z = nextZ++;
    }

    drag(deltaX, deltaY, byUser = true) {
        this.x += deltaX;
        this.y += deltaY;
    }

    drop() {}
}

export class ControllerBlock extends Block {
    constructor() {
        super("", "#cccccc");

        this.downstreamBlock = null;
    }

    get width() {
        return 280;
    }

    get height() {
        return 80;
    }

    render() {
        ns.setColour("#555555");
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
}

export class CommandBlock extends Block {
    constructor(value, bg = undefined, fg = undefined) {
        super(value, bg, fg);

        this.upstreamBlock = null;
        this.downstreamBlock = null;
    }

    get renderedY() {
        if (ns.explosionLevel > 0 && this.upstreamBlock) {
            return this.upstreamBlock.renderedY + this.upstreamBlock.height + 8 + (ns.explosionLevel * 60);
        }

        return super.renderedY;
    }

    render() {
        if (this.upstreamBlock) {
            ns.setColour("#777777");

            ns.fillRoundedRect(
                this.renderedX + 14,
                this.upstreamBlock.renderedY + this.upstreamBlock.height + 4,
                36,
                this.renderedY - this.upstreamBlock.renderedY - this.upstreamBlock.height - 8,
                0
            );
        }

        ns.setColour("#555555");
        ns.fillRoundedRect(this.renderedX + 12, this.renderedY - 4, 40, 8, this.upstreamBlock ? 0 : 4);
        ns.fillRoundedRect(this.renderedX + 12, this.renderedY + this.height - 4, 40, 8, this.downstreamBlock ? 0 : 4);

        super.render();
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
}

export class CommandBlockWithArguments extends CommandBlock {
    constructor(value, bg = undefined, fg = undefined) {
        super(value, bg, fg);

        this.firstArgumentBlock = null;
    }

    render() {
        ns.setColour("#555555");
        ns.fillRoundedRect(this.renderedX + this.width - 4, this.renderedY + ((this.height - 40) / 2), 8, 40, this.firstArgumentBlock ? 0 : 4);

        super.render();
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
}

export class ArgumentBlock extends Block {
    constructor(value, bg = undefined, fg = undefined) {
        super(value, bg, fg);

        this.upstreamBlock = null;
        this.downstreamBlock = null;
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
        if (this.upstreamBlock) {
            ns.setColour("#777777");

            ns.fillRoundedRect(
                this.upstreamBlock.renderedX + this.upstreamBlock.width + 4,
                this.renderedY + ((this.height - 36) / 2),
                this.renderedX - this.upstreamBlock.renderedX - this.upstreamBlock.width - 8,
                36,
                0
            );
        }

        ns.setColour("#555555");
        ns.fillRoundedRect(this.renderedX - 4, this.renderedY + ((this.height - 40) / 2), 8, 40, this.upstreamBlock ? 0 : 4);
        ns.fillRoundedRect(this.renderedX + this.width - 4, this.renderedY + ((this.height - 40) / 2), 8, 40, this.downstreamBlock ? 0 : 4);

        super.render();
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
}