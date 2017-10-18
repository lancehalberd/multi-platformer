class SimpleSprite {
    constructor(animation, x, y, vx = 0, vy = 0, xScale = 1, yScale = 1) {
        this.animation = animation;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.rotation = 0;
        this.rotationPerFrame = 0;
        this.homing = false;
        this.target = {x: 0, y: 0};
        this.acceleration = 0;
        this.maxSpeed = 0;
        this.currentFrame = 0;
        this.framesToLive = 200;
        this.msBetweenFrames = 200;
        // I needed these because the graphic I wanted to use faced up and I need it to face down,
        // which I can get by using yScale = -1
        this.xScale = xScale;
        this.yScale = yScale;
        this.xScaleMax = xScale;
        this.xScaleMin = xScale;
        this.yScaleMax = yScale;
        this.yScaleMin = yScale;
        this.xScalePerFrame = 0;
        this.yScalePerFrame = 0;
        this.scaleOscillation = false;
        this.xScaleWaxing = false;
        this.yScaleWaxing = false;
    }
}

// This function is called every update and controls updating the local sprite, which for now just means:
// update position according to velocity.
// updating the current frame
// removing the object
function updateLocalSprite(localSprite) {
    if (localSprite.homing) { //homing behavior
        var homerToTargetX,  //these two vars are the difference, in x/y values, between the homer's position and its target's position,
        homerToTargetY,        //phrased so that they could be added to the homer's coordinates in order to overlap the target's.
        normalizedHomerToTargetXRatio,    //these two vars will turn that vector into a normalized ratio. Actually, sometimes one of the numbers is over 1 right now, but it still works, I *think.*
        normalizedHomerToTargetYRatio,
        homerX = localSprite.x,
        homerY = localSprite.y,
        targetX = localSprite.target.x,
        targetY = localSprite.target.y,
        dx,
        dy;
        //finding values for homerToTargetX and homerToTargetY.
        if ((homerX < targetX && homerX >= 0 && targetX > 0) || (homerX > targetX && homerX > 0 && targetX >= 0) || (homerX > targetX && homerX <= 0 && targetX < 0) || (homerX === targetX)) homerToTargetX = targetX - homerX;
        if (homerX < targetX && homerX <= 0 && targetX >= 0) homerToTargetX = Math.abs(homerX) + Math.abs(targetX);
        if (homerX < targetX && homerX < 0 && targetX <= 0) homerToTargetX = Math.abs(homerX) - Math.abs(targetX);
        if (homerX > targetX && homerX > 0 && targetX < 0) homerToTargetX = -(Math.abs(homerX) + Math.abs(targetX));
        if ((homerY < targetY && homerY >= 0 && targetY > 0) || (homerY > targetY && homerY > 0 && targetY >= 0) || (homerY > targetY && homerY <= 0 && targetY < 0) || (homerY === targetY)) homerToTargetY = targetY - homerY;
        if (homerY < targetY && homerY <= 0 && targetY >= 0) homerToTargetY = Math.abs(homerY) + Math.abs(targetY);
        if (homerY < targetY && homerY < 0 && targetY <= 0) homerToTargetY = Math.abs(homerY) - Math.abs(targetY);
        if (homerY > targetY && homerY > 0 && targetY < 0) homerToTargetY = -(Math.abs(homerY) + Math.abs(targetY));
        //making a normalized ratio out of homerToTargetX and homerToTargetY's relationship
        //NO DIVIDE BY ZERO PROTECTION HERE!!!
        if (Math.abs(homerToTargetX) > Math.abs(homerToTargetY)) {
            if (homerToTargetX < 0) {
                normalizedHomerToTargetXRatio = -(Math.abs(homerToTargetX) / Math.abs(homerToTargetX));
            } else {
                normalizedHomerToTargetXRatio = Math.abs(homerToTargetX) / Math.abs(homerToTargetX);
            }
            if (homerToTargetY < 0) {
                normalizedHomerToTargetYRatio = -(Math.abs(homerToTargetY) / Math.abs(homerToTargetX));
            } else {
                normalizedHomerToTargetYRatio = Math.abs(homerToTargetY) / Math.abs(homerToTargetX);            
            }
        }
        if (Math.abs(homerToTargetX) < Math.abs(homerToTargetY)) {
            if (homerToTargetX < 0) {
                normalizedHomerToTargetXRatio = -(Math.abs(homerToTargetX) / Math.abs(homerToTargetY));
            } else {
                normalizedHomerToTargetXRatio = Math.abs(homerToTargetX) / Math.abs(homerToTargetY);
            }
            if (homerToTargetY < 0) {
                normalizedHomerToTargetYRatio = -(Math.abs(homerToTargetY) / Math.abs(homerToTargetY));
            } else {
                normalizedHomerToTargetYRatio = Math.abs(homerToTargetY) / Math.abs(homerToTargetY);            
            }
        }
        dx = normalizedHomerToTargetXRatio * localSprite.acceleration;    //scale the normalized ratio for the desired acceleration
        dy = normalizedHomerToTargetYRatio * localSprite.acceleration;    
        localSprite.vx += dx;   //add the scaled vector to the homer's velocity
        localSprite.vy += dy;
    }
    //rotation. Should there be an "isRotating" flag, ond only do this if it's true?
    localSprite.rotation += localSprite.rotationPerFrame;
    //scale oscillator
    if (localSprite.scaleOscillation === true) {
        if (localSprite.xScaleWaxing === true) {
            if (localSprite.xScale <= localSprite.xScaleMax) localSprite.xScale += localSprite.xScalePerFrame;
            if (localSprite.xScale > localSprite.xScaleMax) localSprite.xScaleWaxing = false;
        }
        if (localSprite.xScaleWaxing === false) {
            if (localSprite.xScale >= localSprite.xScaleMin) localSprite.xScale -= localSprite.xScalePerFrame;
            if (localSprite.xScale < localSprite.xScaleMin) localSprite.xScaleWaxing = true;
        }
        if (localSprite.yScaleWaxing === true) {
            if (localSprite.yScale <= localSprite.yScaleMax) localSprite.yScale += localSprite.yScalePerFrame;
            if (localSprite.yScale > localSprite.yScaleMax) localSprite.yScaleWaxing = false;
        }
        if (localSprite.yScaleWaxing === false) {
            if (localSprite.yScale >= localSprite.yScaleMin) localSprite.yScale -= localSprite.yScalePerFrame;
            if (localSprite.yScale < localSprite.yScaleMin) localSprite.yScaleWaxing = true;
        }
    }
    localSprite.x += localSprite.vx;
    localSprite.y += localSprite.vy;
    //max speed limit:
    if (localSprite.vx < 0) {
        localSprite.vx = Math.max(-localSprite.maxSpeed, localSprite.vx);
    } else {
        localSprite.vx = Math.min(localSprite.maxSpeed, localSprite.vx);
    }
    if (localSprite.vy < 0) {
        localSprite.vy = Math.max(-localSprite.maxSpeed, localSprite.vy);
    } else {
        localSprite.vy = Math.min(localSprite.maxSpeed, localSprite.vy);
    }
    //animation stuff. msBetweenFrames sets sprite's animation speed.
    localSprite.currentFrame = Math.floor(now() / localSprite.msBetweenFrames) % localSprite.animation.frames.length;
    // remove the sprite from the array of local sprites after it has used up all of its frames.
    if (localSprite.framesToLive-- <= 0) {
        // This flag will be used in the update loop to remove this sprite from the list of localSprites.
        localSprite.shouldBeRemoved = true;
    }
}

function removeFinishedLocalSprites() {
    // This just gets rid of all the local sprites that have shouldBeRemoved set to true on them
    localSprites = localSprites.filter(localSprite => !localSprite.shouldBeRemoved);
}

var localSprites = [];
var twilightTilesImage = requireImage('gfx/jetrel/twilight-tiles.png'),
fireballBImage = requireImage('gfx/fireball/fireballB.png');

function addLocalFallingSpikesSprite() {
    var hitBox = rectangle(0, 0, 16, 16);
    // I'm using the different versions of the spikes pointing down tiles to make an "animation"
    var frames = [
        $.extend(rectangle(1 * 16, 14 * 16, 16, 16), {image: twilightTilesImage, hitBox}),
        $.extend(rectangle(2 * 16, 14 * 16, 16, 16), {image: twilightTilesImage, hitBox}),
        $.extend(rectangle(3 * 16, 14 * 16, 16, 16), {image: twilightTilesImage, hitBox}),
        $.extend(rectangle(2 * 16, 14 * 16, 16, 16), {image: twilightTilesImage, hitBox}),
    ];
    var fallingSpikesSprite = new SimpleSprite({frames}, mainCharacter.x, cameraY - 32, 0, 5, 2, -2);
    localSprites.push(fallingSpikesSprite);
}

function addHomingFireballSprite(xPosition, yPosition, target) {
    var hitBox = rectangle(0, 0, 32, 32);
    var frames = [
        $.extend(rectangle(0 * 32, 0 * 32, 32, 32), {image: fireballBImage, hitBox}),
        $.extend(rectangle(1 * 32, 0 * 32, 32, 32), {image: fireballBImage, hitBox}),
        $.extend(rectangle(2 * 32, 0 * 32, 32, 32), {image: fireballBImage, hitBox}),
        $.extend(rectangle(3 * 32, 0 * 32, 32, 32), {image: fireballBImage, hitBox}),
        $.extend(rectangle(4 * 32, 0 * 32, 32, 32), {image: fireballBImage, hitBox}),
    ];
    var homingFireballSprite = new SimpleSprite({frames}, xPosition, yPosition, 0, 0, 1.5, 1.5);
    homingFireballSprite.homing = true;
    homingFireballSprite.target = target;
    homingFireballSprite.maxSpeed = 3.5;
    homingFireballSprite.acceleration = 0.8;
    homingFireballSprite.framesToLive = 32767;
    homingFireballSprite.msBetweenFrames = 50;
    homingFireballSprite.rotationPerFrame = 5;
    homingFireballSprite.scaleOscillation = true;
    homingFireballSprite.xScaleMax = 1.75;
    homingFireballSprite.xScaleMin = 1.25;
    homingFireballSprite.yScaleMax = 1.75;
    homingFireballSprite.yScaleMin = 1.25;
    homingFireballSprite.xScalePerFrame = 0.01;
    homingFireballSprite.yScalePerFrame = 0.01;
    localSprites.push(homingFireballSprite);
}



