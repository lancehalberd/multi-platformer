var effectWinkOutImage = requireImage('/gfx/effects/effectWinkOut.png');

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

function addEffectTeleportation(x, y) {
    var sourceRectangle = new Rectangle(0, 0, 32, 32);
    // The teleporter image contains 2 animations, one in frames [0, 8] and the other in frames [9,23].
    // I put all the frames into this variable and then slice them out below to create each animation.
    var frames = rectangleToFrames(sourceRectangle, teleporterAImage, 24);
    var target = sourceRectangle.scale(3);
    // Both animations are drawn in the same target rectangle, but they have different FPS.
    target = target.moveTo(x - target.width / 2, y - target.height);
    localSprites.push(new SimpleAnimation({frames: frames.slice(0, 9)}, now(), 9, target));
    localSprites.push(new SimpleAnimation({frames: frames.slice(9, 24)}, now(), 15, target));
}

function addEffectWinkOut(x, y) {
    var sourceRectangle = new Rectangle(0, 0, 32, 32);
    // The teleporter image contains 2 animations, one in frames [0, 8] and the other in frames [9,23].
    // I put all the frames into this variable and then slice them out below to create each animation.
    var frames = rectangleToFrames(sourceRectangle, effectWinkOutImage, 8);
    var target = sourceRectangle.scale(1.67);
    // Both animations are drawn in the same target rectangle, but they have different FPS.
    target = target.moveTo(x - target.width / 2, y - target.height);
    localSprites.push(new SimpleAnimation({frames}, now(), 15, target));
}

function addEffectJumpDust(x, y, scale, animationSpeedInFPS, rotation) {
    var sourceRectangle = new Rectangle(0, 0, 32, 32);
    var frames = rectangleToFrames(sourceRectangle, effectJumpDustImage, 7);
    // We draw the animation [scale] times larger than the original.
    var target = sourceRectangle.scale(scale);
    // x, y coords are given as the middle of the characters feet, which is where we want to draw the bottom of
    // the dust cloud, so we adjust the target rectangle accordingly.
    var jumpDust = new SimpleAnimation({frames}, now(), animationSpeedInFPS, target.moveTo(x - target.width / 2, y - target.height));
    jumpDust.rotation = rotation;
    localSprites.push(jumpDust);
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