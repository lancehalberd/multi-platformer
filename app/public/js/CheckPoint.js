
class CheckPoint extends Entity {

    constructor(x, y) {
        super();
        this.x = x;
        this.y = y;
    }

    update() {
        if (mainCharacter.attacking && this.isHittingMainCharacter()) {
            mainCharacter.checkPoint = this;
        }
    }

    render() {
        mainContext.save();
        if (mainCharacter.checkPoint !== this) mainContext.globalAlpha = .5;
        this.renderToTarget(mainContext, this.getHitBox());
        mainContext.restore();
        if (selectedEntity === this) this.renderSelectedBox();
    }

    renderToTarget(context, target) {
        var frame = getAnimationFrame(this.constructor.animation.frames, 5);
        draw.image(context, frame.image, frame, target);
    }

    getHitBox() {
        if (mainCharacter.checkPoint !== this) return this.getEditingHitBox();
        // Applying a sin wave to x scale makes it look a bit like the image is spinning around the y axis.
        return this.getEditingHitBox().stretchFromCenter(Math.sin(now() / 300), 1).scaleFromCenter(1.2);
    }

    getEditingHitBox() {
        return Rectangle.defineByCenter(this.x, this.y, 32, 32);
    }

    isHittingMainCharacter() {
        return this.getHitBox().overlapsRectangle(getGlobalSpriteHitBox(mainCharacter), false);
    }

    setTarget(x, y) {
        // Don't update if the coords are the same as the last update.
        if (this.x === x && this.y === y) return;
        this.x = x;
        this.y = y;
        this.dirty = true;
    }


    renderPreview(x, y) {
        this.renderToTarget(mainContext, Rectangle.defineByCenter(x, y, 32, 32));
    }

    renderHUD(context, target) {
        this.renderToTarget(context, target);
    }
}
CheckPoint.animation = {frames: rectangleToFrames(new Rectangle(0, 0, 32, 32), scoreBeaconImage, 1)};
