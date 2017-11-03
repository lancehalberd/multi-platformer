var effectWinkOutImage = requireImage('/gfx/effects/effectWinkOut.png');

var EFFECT_RUN_DUST = 'runDust';
var EFFECT_JUMP_DUST = 'jumpDust';
var EFFECT_STEAM_PLUME = 'steamPlume';
var EFFECT_TELEPORTATION = 'teleportationEffect';
var EFFECT_TELEPORTATION_PORTAL = 'teleportationEffect';
var EFFECT_TELEPORTATION_SPARKLES = 'teleportationEffect';
var EFFECT_WINKOUT = 'winkoutEffect';

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

class SimpleMovingAnimation extends SimpleAnimation {
  constructor(animation, createdAt, fps, target, vx, vy) {
       super(animation, createdAt, fps, target);
       this.vx = vx;
       this.vy =vy;
   }

   update() {
       super.update();
       this.target = this.target.translate(this.vx, this.vy);
   }
}


function addEffectTeleportation(x, y) {
    var sourceRectangle = new Rectangle(0, 0, 32, 32);
    var target = sourceRectangle.scale(3);
    // Both animations are drawn in the same target rectangle, but they have different FPS.
    target = target.moveTo(x - target.width / 2, y - target.height);
    var portalAnimation = new SimpleAnimation({frames}, now(), 9, target),
        sparklesAnimation = new SimpleAnimation({frames}, now(), 15, target);
    portalAnimation.type = EFFECT_TELEPORTATION_PORTAL;
    sparklesAnimation.type = EFFECT_TELEPORTATION_SPARKLES;
    localSprites.push(portalAnimation);
    localSprites.push(sparklesAnimation);
}

function addEffectWinkOut(x, y) {
    var sourceRectangle = new Rectangle(0, 0, 32, 32);
    var frames = rectangleToFrames(sourceRectangle, effectWinkOutImage, 8);
    var target = sourceRectangle.scale(1.67);
    target = target.moveTo(x - target.width / 2, y - target.height);
    var winkOutEffect = new SimpleAnimation({frames}, now(), 15, target);
    winkOutEffect.type = EFFECT_WINKOUT;
    localSprites.push(winkOutEffect);
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
    jumpDust.type = EFFECT_JUMP_DUST;
    localSprites.push(jumpDust);
}

function addEffectRunDust(x, y) {
    var sourceRectangle = new Rectangle(0, 0, 32, 32);
    var frames = rectangleToFrames(sourceRectangle, effectRunDustImage, 7);
    // We draw the animation 1.75 times larger than the original.
    var target = sourceRectangle.scale(1.75);
    // x, y coords are given as the middle of the characters feet, which is where we want to draw the bottom of
    // the dust cloud, so we adjust the target rectangle accordingly.
    var runDust = new SimpleAnimation({frames}, now(), 10, target.moveTo(x - target.width / 2, y - target.height));
    runDust.type = EFFECT_RUN_DUST;
    localSprites.push(runDust);
}

function addEffectSteamPlume(x, y, vx, vy, scale, animationSpeedInFPS) {
    var sourceRectangle = new Rectangle(0, 0, 32, 32);
    var frames = rectangleToFrames(sourceRectangle, effectRunDustImage, 7);
    // We draw the animation 1.75 times larger than the original.
    var target = sourceRectangle.scale(scale);
    // x, y coords are given as the middle of the characters feet, which is where we want to draw the bottom of
    // the dust cloud, so we adjust the target rectangle accordingly.
    var steamPlume = new SimpleMovingAnimation({frames}, now(), animationSpeedInFPS, target.moveTo(x - target.width / 2, y - target.height), vx, vy); // BROKEN: draws occasional, brief, glitchy clouds.
    //var steamPlume = new SimpleAnimation({frames}, now(), animationSpeedInFPS, target.moveTo(x - target.width / 2, y - target.height));
    steamPlume.type = EFFECT_STEAM_PLUME;
    localSprites.push(steamPlume);
}