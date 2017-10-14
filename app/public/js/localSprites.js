class SimpleSprite {
    constructor(animation, x, y, vx = 0, vy = 0, xScale = 1, yScale = 1) {
        this.animation = animation;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
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
var twilightTilesImage = requireImage('gfx/jetrel/twilight-tiles.png');

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