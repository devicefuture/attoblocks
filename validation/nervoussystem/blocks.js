import * as ns from "./script.js";

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

    connectTo(block) {}

    render() {
        ns.setColour(this.bg);
        ns.fillRoundedRect(this.renderedX, this.renderedY, this.width, this.height, 12);

        ns.setColour(this.fg);
        ns.drawText(this.value, this.renderedX + 6, this.renderedY + 6, 3);
    }

    drag(deltaX, deltaY, byUser = true) {
        this.x += deltaX;
        this.y += deltaY;
    }

    drop() {}
}

export class StatementBlock extends Block {
    constructor(value, bg = undefined, fg = undefined) {
        super(value, bg, fg);

        this.upstreamBlock = null;
        this.downstreamBlock = null;
    }

    render() {
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
                thing instanceof StatementBlock && !thing.downstreamBlock &&
                thing.x >= this.x - 20 && thing.x < this.x + 20 &&
                thing.y >= this.y - this.height - 20 && thing.y < this.y - 20
            ) {
                this.connectUnder(thing);
                break;
            }
        }
    }
}

export class StatementBlockWithArguments extends StatementBlock {
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

    render() {
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

        if (block instanceof StatementBlockWithArguments) {
            block.firstArgumentBlock = this;
        } else {
            block.downstreamBlock = this;
        }

        this.moveUnder(block);
        this.moveDownstreamsUnderSelf();
    }

    drag(deltaX, deltaY, byUser = true) {
        super.drag(deltaX, deltaY);

        if (this.upstreamBlock && byUser) {
            if (this.upstreamBlock instanceof StatementBlockWithArguments) {
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
                    (thing instanceof StatementBlockWithArguments && !thing.firstArgumentBlock)
                ) &&
                thing.x + thing.width >= this.x - 20 && thing.x + thing.width < this.x + 20 &&
                thing.y >= this.y - 20 && thing.y < this.y + 20
            ) {
                this.connectUnder(thing);

                break;
            }
        }
    }
}