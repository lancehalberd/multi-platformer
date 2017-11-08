
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
        this.renderToTarget(this.getHitBox());
        mainContext.restore();
        if (selectedTrigger === this) this.renderSelectedBox();
    }

    renderToTarget(target) {
        var frame = getAnimationFrame(this.constructor.animation.frames, 5);
        draw.image(mainContext, frame.image, frame, target);
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
        this.x = x;
        this.y = y;
    }


    renderPreview(x, y) {
        this.renderToTarget(Rectangle.defineByCenter(x, y, 32, 32));
    }

    renderHUD(target) {
        this.renderToTarget(target);
    }
}
CheckPoint.animation = {frames: rectangleToFrames(new Rectangle(0, 0, 32, 32), scoreBeaconImage, 1)};
