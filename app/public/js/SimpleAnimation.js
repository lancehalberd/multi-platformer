class SimpleAnimation {

    constructor(animation, createdAt, fps, target) {
        this.animation = animation;
        this.createdAt = createdAt;
        this.fps = fps;
        this.target = target;
    }

    getCurrentFrame() {
        return Math.floor((now() - this.createdAt) * this.fps / 1000);
    }

    update() {
        // Remove the animation once it has finished.
        if (this.getCurrentFrame() >= this.animation.frames.length) {
            this.shouldBeRemoved = true;
        }
    }

    render() {
        var frame = this.animation.frames[this.getCurrentFrame()];
        if (!frame) return; // If somehow this gets rendered with current frame too high, just do nothing.
        draw.image(mainContext, frame.image, frame, this.target);
    }
}

function addEffectJumpDust(x, y) {
    var sourceRectangle = new Rectangle(0, 0, 32, 32);
    var frames = rectangleToFrames(sourceRectangle, effectJumpDustImage, 7);
    // We draw the animation 2.5 times larger than the original.
    var target = sourceRectangle.scale(2.5);
    // x, y coords are given as the middle of the characters feet, which is where we want to draw the bottom of
    // the dust cloud, so we adjust the target rectangle accordingly.
    localSprites.push(new SimpleAnimation({frames}, now(), 10, target.moveTo(x - target.width / 2, y - target.height)));
}

function addEffectRunDust(x, y) {
    var sourceRectangle = new Rectangle(0, 0, 32, 32);
    var frames = rectangleToFrames(sourceRectangle, effectRunDustImage, 7);
    // We draw the animation 1.75 times larger than the original.
    var target = sourceRectangle.scale(1.75);
    // x, y coords are given as the middle of the characters feet, which is where we want to draw the bottom of
    // the dust cloud, so we adjust the target rectangle accordingly.
    localSprites.push(new SimpleAnimation({frames}, now(), 10, target.moveTo(x - target.width / 2, y - target.height)));
}