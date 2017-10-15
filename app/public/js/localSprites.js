//NEED TO ADD MAX SPEED LIMIT TO SIMPLE SPRITE!

class SimpleSprite {
    constructor(animation, x, y, vx = 0, vy = 0, xScale = 1, yScale = 1) {
        this.animation = animation;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.homing = false;
        this.target = target;
        this.maxSpeed = maxSpeed;  //doesn't do anything yet, but will be part of code that limits max speed
        this.currentFrame = 0;
        this.framesToLive = 200;
        // I needed these because the graphic I wanted to use faced up and I need it to face down,
        // which I can get by using yScale = -1
        this.xScale = xScale;
        this.yScale = yScale;
    }
}

// This function is called every update and controls updating the local sprite, which for now just means:
// update position according to velocity.
// updating the current frame
// removing the object
function updateLocalSprite(localSprite) {
    if (localSprite.homing) { //homing behavior
        var homerToTargetX = (localSprite.target.x - localSprite.x),  //these two vars are the difference, in x/y values, between the homer's position and its target's position,
        homerToTargetY = (localSprite.target.y - localSprite.y),        //phrased so that they could be added to the homer's coordinates in order to overlap the target's.
        normalizedHomerToTargetXRatio,    //these two vars turn that vector into a normalized ratio.
        normalizedHomerToTargetYRatio,
        dx,
        dy,
        accelScale = 1;
        if (homerToTargeX >= homerToTargetY) {
            //pick the larger of the X or Y differences in position between homer and mc and use it as the "1" for normalizing both.
            normalizedHomerToTargeXRatio = homerToTargeX / homerToTargeX; //always results in 1, but presenting it this way  makes it clearer what's going on
            normalizedHomerToTargetYRatio = homerToTargetY / homerToTargetX;
        } else {
            normalizedHomerToTargetYRatio = homerToTargetY / homerToTargetY;
            normalizedHomerToTargetXRatio = homerToTargetX / homerToTargetY;
        }
        dx = normalizedHomerToTargetXRatio * accelScale;    //scale the normalized ratio for the desired acceleration
        dy = normalizedHomerToTargetYRatio * accelScale;    
        localSprite.vx += dx;   //add the scaled vector to the homer's velocity
        localSprite.vy += dy;
    }
    localSprite.x += localSprite.vx;
    localSprite.y += localSprite.vy;
    localSprite.currentFrame = Math.floor(now() / 200) % localSprite.animation.frames.length;
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

function addHomingFireball() {
    var hitbox = rectangle(0, 0, 32, 32);
    var frames = [
        $.extend(rectangle(0 * 32, 0 * 32, 32, 32), {image: fireballBImage, hitBox}),
        $.extend(rectangle(1 * 32, 0 * 32, 32, 32), {image: fireballBImage, hitBox}),
        $.extend(rectangle(2 * 32, 0 * 32, 32, 32), {image: fireballBImage, hitBox}),
        $.extend(rectangle(3 * 32, 0 * 32, 32, 32), {image: fireballBImage, hitBox}),
        $.extend(rectangle(4 * 32, 0 * 32, 32, 32), {image: fireballBImage, hitBox}),
        /*I asked Chris what the "hitbox" in the above lines meant, and he said:
         *"That is the same is if I wrote 'hitbox: hitbox'
It adds a hitbox property to that object and sets it to the local variable with the same name."
        */
    ];
    var homingFireballSprite = new SimpleSprite({frames}, 600, 200, 0, 0, 1, 1);
    homingFireballSprite.homing = true;
    homingFireballSprite.target = mainCharacter;
    homingFireballSprite.framesToLive = 32767;
    localSprites.push(homingFireballSprite);
}