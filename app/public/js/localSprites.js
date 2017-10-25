var SPRITE_TYPE_HOMING_FIREBALL = 'homingFireball';
var SPRITE_TYPE_FIREBALL_PARTICLE_CONTRAIL = 'fireballContrailParticle';
var SPRITE_TYPE_FIREBALL_PARTICLE_DETONATION = 'fireballDetonationParticle';

var POWERUP_TYPE_HEART = 'heart';
var POWERUP_TYPE_AIRDASH = 'airDash';

var CREATURE_TYPE_ADORABILIS = 'adorableOctopus';
var CREATURE_TYPE_PACING_FIREBALL_VERTICAL = 'fireballPacingVertically';
var CREATURE_TYPE_PACING_FIREBALL_HORIZONTAL = 'fireballPacingHorizontally';

var NO_TARGET = 'targetIsNoTarget';


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
        this.maxSpeed = 32767;
        this.collides = false;  //checks for collision with level geometry.
        this.removedOnCollision = false; //if sprite collides (with level geometry) it will be removed.
        this.currentFrame = 0;
        this.framesToLive = 200;
        this.msBetweenFrames = 200;
        this.hasContrail = false;
        this.framesBetweenContrailParticles = 0; //game frames, not animation frames.
        this.contrailTimer = 0;
        this.contrailParticles = [];
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
        this.bobs = false;
        this.rising = true; //if on the upward motion of bobbing. Like 'waxing' for scale oscillation.
        this.bobHeightPerFrame = 0;
        this.bobMaxY = 0; //farthest, up or down, a bobbing sprite should get away from its original Y before turning around.
        this.originalY = y; //for preventing bobbing from making the sprite's y position drift over time. Should probably change bob implementation to eliminate this.
    }

    update() {
        updateLocalSprite(this);
    }

    render() {
        drawSprite(mainContext, this);
    }
}



// This function is called every update and controls updating the local sprite, which for now just means:
// update position according to velocity.
// updating the current frame
// removing the object
function updateLocalSprite(localSprite) {
    if (localSprite.homing) { //homing behavior
        var dx = localSprite.target.x - localSprite.x;
        var dy = localSprite.target.y - localSprite.y;
        var magnitude = Math.sqrt(dx * dx + dy * dy);
        if (magnitude > 0) {
            localSprite.vx += dx * localSprite.acceleration / magnitude;
            localSprite.vy += dy * localSprite.acceleration / magnitude;
        }
    }
    if (localSprite.rotationPerFrame) localSprite.rotation += localSprite.rotationPerFrame;
    //WRONG: Both bobbing and scale oscillation should have a nice sinusoid curve to them, but they're just linear right now.
    //bobbing
    if (localSprite.bobs) {
        if (localSprite.y <= localSprite.originalY - localSprite.bobMaxY) localSprite.rising = true;
        if (localSprite.y >= localSprite.originalY + localSprite.bobMaxY) localSprite.rising = false;
        if (localSprite.rising) localSprite.y += localSprite.bobHeightPerFrame;
        if (!localSprite.rising) localSprite.y -= localSprite.bobHeightPerFrame;
    }
    //scale oscillator
    //MAYBE WRONG: Scale might drift away from original, getting very large or small. Maybe need to implement a regulatory fix like the 'originalY' solution in the bobbing update area.
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
    //contrail generation
    //WRONG: TOO SPECIFIC TO FIREBALL RIGHT NOW. It seems like you could give addSprite functions a bunch of new parameters to fix this, but that seems messy, as a lot of sprites won't have contrails.
    if (localSprite.hasContrail === true) {
        if (localSprite.contrailTimer >= localSprite.framesBetweenContrailParticles) {
            addFireballParticle(localSprite, 30, 32, 32, SPRITE_TYPE_FIREBALL_PARTICLE_CONTRAIL);
            localSprite.contrailTimer = 0;
        } else {
            localSprite.contrailTimer++;
        }
    }
    localSprite.x += localSprite.vx;
    localSprite.y += localSprite.vy;
    //max speed
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

    //geomtry collision checks
    //if something.collides, but !it.removedOnCollision && it.pacing, it reverses at it.speed
    if (localSprite.vx && localSprite.collides) {
        if (localSprite.vx < 0) {
            if (!moveSpriteInDirection(localSprite, localSprite.vx, TILE_LEFT)) {
                if (localSprite.removedOnCollision) localSprite.shouldBeRemoved = true;
                if (localSprite.pacing) localSprite.vx = localSprite.xSpeed;
            }
        } else {
            if (!moveSpriteInDirection(localSprite, localSprite.vx, TILE_RIGHT)) {
                if (localSprite.removedOnCollision) localSprite.shouldBeRemoved = true;
                if (localSprite.pacing) localSprite.vx = -localSprite.xSpeed;
            }
        }
    }
    if (localSprite.vy && localSprite.collides) {
        if (localSprite.vy < 0) {
            if (!moveSpriteInDirection(localSprite, localSprite.vy, TILE_UP)) {
                if (localSprite.removedOnCollision) localSprite.shouldBeRemoved = true;
                if (localSprite.pacing) localSprite.vy = localSprite.ySpeed;
            }
        } else {
            if (!moveSpriteInDirection(localSprite, localSprite.vy, TILE_DOWN)) {
                if (localSprite.removedOnCollision) localSprite.shouldBeRemoved = true;
                if (localSprite.pacing) localSprite.vy = -localSprite.ySpeed;
            }
        }
    }
    //updating various sprite types
    if (localSprite.type === TRIGGER_TYPE_FORCE) {
        if (rectanglesOverlap(localSprite.hitBox, getGlobalSpriteHitBox(localSprite.target)) && canTriggerTrigger(localSprite)) {
            if (localSprite.forceType === FORCE_AMP) {
                if (localSprite.target.vx) localSprite.target.vx *= localSprite.xForce;
                if (localSprite.target.vy < 0) localSprite.target.vy *= localSprite.yForce;    //doesn't speed falling
            }
            if (localSprite.forceType === FORCE_FIXED) {
                if (localSprite.target.vx) localSprite.target.vx += localSprite.xForce;
                if (localSprite.target.vy) localSprite.target.vy += localSprite.yForce;
            }
            localSprite.notReadyToTriggerUntil = now() + localSprite.cooldownInMS;
        }
    }

    if (localSprite.type === TRIGGER_TYPE_SPAWN) {
        if (rectanglesOverlap(localSprite.hitBox, getGlobalSpriteHitBox(localSprite.target)) && canTriggerTrigger(localSprite)) {   //I'm repeating this line of code, and should just use it once.
            if (localSprite.spawnedObjectType === SPRITE_TYPE_HOMING_FIREBALL) addHomingFireballSprite(localSprite.spawnedObjectX, localSprite.spawnedObjectY, localSprite.target);
            localSprite.notReadyToTriggerUntil = now() + localSprite.cooldownInMS;
        }
    }

    if (localSprite.type === POWERUP_TYPE_HEART && mainCharacter.health < mainCharacter.maxHealth) {
        if (rectanglesOverlap(localSprite.hitBox, getGlobalSpriteHitBox(mainCharacter))) {     //when I changed "localSprite.hitBox" to "getGlobalSpriteHitBox(localSprite), this stopped working.
            mainCharacter.health++;
            localSprite.shouldBeRemoved = true;
        }
    }

    if (localSprite.type === POWERUP_TYPE_AIRDASH) {
        if (rectanglesOverlap(localSprite.hitBox, getGlobalSpriteHitBox(mainCharacter))) {     //when I changed "localSprite.hitBox" to "getGlobalSpriteHitBox(localSprite), this stopped working.
            mainCharacter.canAirDashUntil = now() + localSprite.durationInMS;
            localSprite.shouldBeRemoved = true;
        }
    }

    if (localSprite.type === CREATURE_TYPE_ADORABILIS) {
        if (rectanglesOverlap(getGlobalSpriteHitBox(localSprite), getGlobalSpriteHitBox(mainCharacter)) && canTriggerTrigger(localSprite)) {     //when I changed "localSprite.hitBox" to "getGlobalSpriteHitBox(localSprite), this stopped working.
            localSprite.notReadyToTriggerUntil = now() + localSprite.cooldownInMS;
            mainCharacter.compelledByOctopusTouch = now() + localSprite.durationOfTouchEffectInMS;
        }
    }
    
    if (localSprite.type === CREATURE_TYPE_PACING_FIREBALL_HORIZONTAL || localSprite.type === CREATURE_TYPE_PACING_FIREBALL_VERTICAL) {
        if (rectanglesOverlap(getGlobalSpriteHitBox(localSprite), getGlobalSpriteHitBox(mainCharacter)) && mainCharacter.invulnerableUntil < now()) {
            var randomVXBoost;
            //note: character should get bounced away from fireball, which could use some code similar to that used for homing, but I didn't want to deal with that while I was making this.
            mainCharacter.vy = -15; //player pops upward if hit
            if (Math.random() > 0.5) randomVXBoost = Math.random() * 8;   //player gets a random vx if hit.
            else randomVXBoost = Math.random() * -8;
            mainCharacter.vx += randomVXBoost;
            damageSprite(mainCharacter, 1);
        }
    }

    if (localSprite.type === SPRITE_TYPE_HOMING_FIREBALL) {
        var fireballHitBox = getGlobalSpriteHitBox(localSprite);
        // We only need to check against the main character here because each client will be running this
        // check for its own main character, which should cover all players.
        if (rectanglesOverlap(fireballHitBox, getGlobalSpriteHitBox(mainCharacter))) {
            mainCharacter.health--;
            localSprite.shouldBeRemoved = true;
        }
    }

    if (localSprite.framesToLive-- <= 0) {
        // This flag will be used in the update loop to remove this sprite from the list of localSprites.
        localSprite.shouldBeRemoved = true;
    }
    if (localSprite.shouldBeRemoved && localSprite.type === SPRITE_TYPE_HOMING_FIREBALL) addFireballDetonation(localSprite, 10, 32, 32); //WRONG: don't know why this (following) isn't working for the rest of this line (starting after '10,'): getGlobalSpriteHitBox(localSprites[i]).width, getLocalSpriteHitBox(localSprites[i].height));
}
//remove the sprite from the array of local sprites after it has used up all of its frames.
function removeFinishedLocalSprites() {
    // This just gets rid of all the local sprites that have shouldBeRemoved set to true on them
    localSprites = localSprites.filter(localSprite => !localSprite.shouldBeRemoved);
}

var localSprites = [];
var twilightTilesImage = requireImage('/gfx/jetrel/twilight-tiles.png'),
fireballBImage = requireImage('/gfx/fireball/fireballB.png'),
fireballContrailAImage = requireImage('/gfx/fireball/fireballContrailA.png'),
powerupHeartImage = requireImage('/gfx/powerups/powerupHeart.png'),
powerupAirDashImage = requireImage('/gfx/powerups/powerupAirDash.png'),
creatureAdorabilisImage = requireImage('/gfx/creatures/creatureAdorabilis.png');


var hitBox = rectangle(0, 0, 32, 32);
var fireballAnimation = {
    frames: [
        $.extend(rectangle(0 * 32, 0 * 32, 32, 32), {image: fireballBImage, hitBox}),
        $.extend(rectangle(1 * 32, 0 * 32, 32, 32), {image: fireballBImage, hitBox}),
        $.extend(rectangle(2 * 32, 0 * 32, 32, 32), {image: fireballBImage, hitBox}),
        $.extend(rectangle(3 * 32, 0 * 32, 32, 32), {image: fireballBImage, hitBox}),
        $.extend(rectangle(4 * 32, 0 * 32, 32, 32), {image: fireballBImage, hitBox}),
    ]
};

function addHomingFireballSprite(xPosition, yPosition, target) {
    var homingFireballSprite = new SimpleSprite(fireballAnimation, xPosition, yPosition, 0, 0, 1.5, 1.5);
    homingFireballSprite.type = SPRITE_TYPE_HOMING_FIREBALL;
    homingFireballSprite.homing = true;
    homingFireballSprite.collides = true;
    homingFireballSprite.removedOnCollision = true;
    homingFireballSprite.target = target;
    homingFireballSprite.maxSpeed = 1.4;
    homingFireballSprite.acceleration = 0.5;
    homingFireballSprite.framesToLive = 1000;
    homingFireballSprite.msBetweenFrames = 50;
    homingFireballSprite.rotationPerFrame = 5;
    homingFireballSprite.scaleOscillation = true;
    homingFireballSprite.xScaleMax = 1.33;
    homingFireballSprite.xScaleMin = 1;
    homingFireballSprite.yScaleMax = 1.33;
    homingFireballSprite.yScaleMin = 1;
    homingFireballSprite.xScalePerFrame = 0.01;
    homingFireballSprite.yScalePerFrame = 0.01;
    homingFireballSprite.hasContrail = true;
    homingFireballSprite.framesBetweenContrailParticles = 3;
    localSprites.push(homingFireballSprite);
}

function addCreature(x, y, target, creatureType) {
        var xSize,
        ySize,
        xScale,
        yScale,
        scaledXSize,
        scaledYSize,
        //scaledCenteredLeft = x - (scaledXSize / 2), //replaces 'left' part of rectangle to center the hitBox on the 'x' argument, rather than have 'x' be at its upper-left.
        //scaledCenteredTop = y - (scaledYSize / 2),
        //hitBox = rectangle(scaledCenteredLeft, scaledCenteredTop, scaledXSize, scaledYSize), //made the sprite not draw. don't know why.
        hitBox,   //These values seem to make the octopus sit right on top of the player (note just visually, but in the x/y coordinates), whereas different values leave it displaced. I think it has something to do with scaling, as 1, 1 scaling doesn't create displacement. The fireball, from which this creature was originally copied, doesn't seem to have this problem.
        frames = [];
    if (creatureType === CREATURE_TYPE_ADORABILIS) {
        xSize = 32;
        ySize = 32;
        xScale = 2.5;
        yScale = 2.5;
        scaledXSize = xSize * xScale;
        scaledYSize = ySize * yScale;
        //scaledCenteredLeft = x - (scaledXSize / 2), //replaces 'left' part of rectangle to center the hitBox on the 'x' argument, rather than have 'x' be at its upper-left.
        //scaledCenteredTop = y - (scaledYSize / 2),
        //hitBox = rectangle(scaledCenteredLeft, scaledCenteredTop, scaledXSize, scaledYSize), //made the sprite not draw. don't know why.
        hitBox = rectangle(-24, -56, 80, 80);   //These values seem to make the octopus sit right on top of the player (note just visually, but in the x/y coordinates), whereas different values leave it displaced. I think it has something to do with scaling, as 1, 1 scaling doesn't create displacement. The fireball, from which this creature was originally copied, doesn't seem to have this problem.
        frames = [
            $.extend(rectangle(0 * xSize, 0 * ySize, xSize, ySize), {image: creatureAdorabilisImage, hitBox}),
            $.extend(rectangle(1 * xSize, 0 * ySize, xSize, ySize), {image: creatureAdorabilisImage, hitBox}),
            $.extend(rectangle(2 * xSize, 0 * ySize, xSize, ySize), {image: creatureAdorabilisImage, hitBox}),
            $.extend(rectangle(3 * xSize, 0 * ySize, xSize, ySize), {image: creatureAdorabilisImage, hitBox}),
            $.extend(rectangle(4 * xSize, 0 * ySize, xSize, ySize), {image: creatureAdorabilisImage, hitBox}),
            $.extend(rectangle(5 * xSize, 0 * ySize, xSize, ySize), {image: creatureAdorabilisImage, hitBox}),
            $.extend(rectangle(6 * xSize, 0 * ySize, xSize, ySize), {image: creatureAdorabilisImage, hitBox}),
            $.extend(rectangle(7 * xSize, 0 * ySize, xSize, ySize), {image: creatureAdorabilisImage, hitBox}),
            $.extend(rectangle(8 * xSize, 0 * ySize, xSize, ySize), {image: creatureAdorabilisImage, hitBox})
        ];
        var adorabilisSprite = new SimpleSprite({frames}, x, y, 0, 0, xScale, yScale);
        adorabilisSprite.type = creatureType;
        adorabilisSprite.homing = true;
        adorabilisSprite.collides = false; //should be true when there's better collision behavior in place. Probably.
        adorabilisSprite.target = target;
        adorabilisSprite.maxSpeed = 0.8;
        adorabilisSprite.acceleration = 0.1;
        adorabilisSprite.notReadyToTriggerUntil = now();
        adorabilisSprite.durationOfTouchEffectInMS = 5000;
        adorabilisSprite.framesToLive = 32767;
        adorabilisSprite.msBetweenFrames = 85;
        adorabilisSprite.cooldownInMS = 2000; //how long after it touches the player before its touch can affect the player again.
        localSprites.push(adorabilisSprite);
    }
    if (creatureType === CREATURE_TYPE_PACING_FIREBALL_HORIZONTAL) {
        xSize = 32;
        ySize = 32;
        xScale = 1.5;
        yScale = 1.5;
        scaledXSize = xSize * xScale;
        scaledYSize = ySize * yScale;
        //scaledCenteredLeft = x - (scaledXSize / 2), //replaces 'left' part of rectangle to center the hitBox on the 'x' argument, rather than have 'x' be at its upper-left.
        //scaledCenteredTop = y - (scaledYSize / 2),
        //hitBox = rectangle(scaledCenteredLeft, scaledCenteredTop, scaledXSize, scaledYSize), //made the sprite not draw. don't know why.
        hitBox = rectangle(0, 0, 32, 32);   //These values seem to make the octopus sit right on top of the player (note just visually, but in the x/y coordinates), whereas different values leave it displaced. I think it has something to do with scaling, as 1, 1 scaling doesn't create displacement. The fireball, from which this creature was originally copied, doesn't seem to have this problem.
        frames = [
            $.extend(rectangle(0 * xSize, 0 * ySize, xSize, ySize), {image: fireballBImage, hitBox}),
            $.extend(rectangle(1 * xSize, 0 * ySize, xSize, ySize), {image: fireballBImage, hitBox}),
            $.extend(rectangle(2 * xSize, 0 * ySize, xSize, ySize), {image: fireballBImage, hitBox}),
            $.extend(rectangle(3 * xSize, 0 * ySize, xSize, ySize), {image: fireballBImage, hitBox}),
            $.extend(rectangle(4 * xSize, 0 * ySize, xSize, ySize), {image: fireballBImage, hitBox})
        ];
        var pacingFireballSprite = new SimpleSprite({frames}, x, y, 0, 0, xScale, yScale);
        pacingFireballSprite.type = creatureType;
        pacingFireballSprite.collides = true;
        pacingFireballSprite.pacing = true;
        if (pacingFireballSprite.type === CREATURE_TYPE_PACING_FIREBALL_HORIZONTAL) {
            pacingFireballSprite.xSpeed = 1.75;
            pacingFireballSprite.ySpeed = 0;
        }
        if (pacingFireballSprite.type === CREATURE_TYPE_PACING_FIREBALL_VERTICAL) {
            pacingFireballSprite.xSpeed = 0;
            pacingFireballSprite.ySpeed = 1.75;
        }
        pacingFireballSprite.vx = pacingFireballSprite.xSpeed;
        pacingFireballSprite.vy = pacingFireballSprite.ySpeed;
        pacingFireballSprite.framesToLive = 32767;
        pacingFireballSprite.msBetweenFrames = 50;
        pacingFireballSprite.rotationPerFrame = 5;
        pacingFireballSprite.scaleOscillation = true;
        pacingFireballSprite.xScaleMax = 1.75;
        pacingFireballSprite.xScaleMin = 1.25;
        pacingFireballSprite.yScaleMax = 1.75;
        pacingFireballSprite.yScaleMin = 1.25;
        pacingFireballSprite.xScalePerFrame = 0.01;
        pacingFireballSprite.yScalePerFrame = 0.01;
        pacingFireballSprite.hasContrail = true;
        pacingFireballSprite.framesBetweenContrailParticles = 3;
        localSprites.push(pacingFireballSprite);
    }
}


function addFireballParticle(parent, decayFrames, parentPreScalingXSize, parentPreScalingYSize, type) {
    var hitBox = rectangle(0, 0, 8, 8);
    var frames = [
        $.extend(rectangle(0 * 8, 0 * 8, 8, 8), {image: fireballContrailAImage, hitBox}),
        //$.extend(rectangle(1 * 8, 0 * 8, 8, 8), {image: fireballContrailAImage, hitBox}),
        //$.extend(rectangle(2 * 8, 0 * 8, 8, 8), {image: fireballContrailAImage, hitBox}),
        //$.extend(rectangle(3 * 8, 0 * 8, 8, 8), {image: fireballContrailAImage, hitBox}),
        //$.extend(rectangle(4 * 8, 0 * 8, 8, 8), {image: fireballContrailAImage, hitBox}),
    ];
    var randomX,    //distance particle spawns from parent's origin
    randomY;
    //random spawn location of particles in vicinity of parent sprite
    if (Math.random() > 0.5) {
        randomX = Math.round(parent.x + ((Math.random() * parent.xScale * parentPreScalingXSize) / 2));  //divide by 2 to keep the particles spawning completely within the bounds of the parent's hitbox
    } else {
        randomX = Math.round(parent.x - ((Math.random() * parent.xScale * parentPreScalingXSize) / 2));
    }
    if (Math.random() < 0.5) {
        randomY = Math.round(parent.y + ((Math.random() * parent.yScale * parentPreScalingYSize) / 2));
    } else {
        randomY = Math.round(parent.y - ((Math.random() * parent.yScale * parentPreScalingYSize) / 2));
    }
    var fireballParticle = new SimpleSprite({frames}, randomX, randomY, 0, 0, 1.25, 2.5);
    fireballParticle.type = type;
    fireballParticle.framesToLive = decayFrames;
    fireballParticle.scaleOscillation = true;
    fireballParticle.xScalePerFrame = fireballParticle.xScale / fireballParticle.framesToLive;
    fireballParticle.yScalePerFrame = fireballParticle.yScale / fireballParticle.framesToLive;
    fireballParticle.xScaleMin = 0;
    fireballParticle.yScaleMin = 0;
    fireballParticle.rotationPerFrame = 50;
    //fireballParticle.msBetweenFrames = Math.round((decayFrames * 50 /*or framerate*/) / frames.length) + 1; //'+1' hopefully keeps the animation from starting to loop just before the pariticle dies.  //would be better to also have a continuous alpha fade happen during this time. Could also scale down if that weren't build into the animation frames already.
    //parent.contrailParticles.push(fireballParticle);
    if (fireballParticle.type === SPRITE_TYPE_FIREBALL_PARTICLE_CONTRAIL) localSprites.push(fireballParticle); //WRONG: Should push to parent.contrailParticles, but then render.js should render things in that array. I don't know the syntax for that yet, I don't think.
    if (fireballParticle.type === SPRITE_TYPE_FIREBALL_PARTICLE_DETONATION) {
        var randomVX,
        randomVY;
        if (Math.random() < 0.5) {
            randomVX = -(Math.random() * 50);
        } else {
            randomVX = Math.random() * 50;
        }
        if (Math.random() < 0.5) {
            randomVY = -(Math.random() * 50);
        } else {
            randomVY = Math.random() * 50;
        }
        fireballParticle.vx = randomVX;     //BROKEN: I'm not seeing these detonation particles move how they should.
        fireballParticle.vy = randomVY -4;  //can't see how much rising this is.
        localSprites.push(fireballParticle);
    }
}

function addFireballDetonation(parent, numberOfFragments, parentPreScalingXSize, parentPreScalingYSize) {
    var detonationParticles = [];
    for (var i = 0; i < numberOfFragments; i++) {
        var newParticle = addFireballParticle(parent, 30, parentPreScalingXSize, parentPreScalingYSize, SPRITE_TYPE_FIREBALL_PARTICLE_DETONATION);
        detonationParticles.push(newParticle);
    }
    for (var j = 0; j < detonationParticles.length; j++) {

    }
}

//TRIGGERS
function canTriggerTrigger(trigger) {
    return  now() > trigger.notReadyToTriggerUntil;
}

function addSpawnTrigger(left, top, width, height, cooldownInSeconds, target, spawnedObjectType, spawnedObjectXOffset, spawnedObjectYOffset) {
    var hitBox = rectangle(left, top, width, height);
    var frames = [
        $.extend(rectangle(1 * 16, 0 * 16, 16, 16), {image: fireballContrailAImage, hitBox}),
    ];
    var spawnTrigger = new SimpleSprite({frames}, left, top, 0, 0, 1, 1);
    spawnTrigger.type = TRIGGER_TYPE_SPAWN; //hm, don't actually use this...
    spawnTrigger.cooldownInMS = cooldownInSeconds * 1000;
    spawnTrigger.hitBox = hitBox;
    spawnTrigger.framesToLive = 32767;
    spawnTrigger.target = target;
    spawnTrigger.notReadyToTriggerUntil = now();
    spawnTrigger.spawnedObjectType = spawnedObjectType;
    spawnTrigger.spawnedObjectX = (left + width / 2) + spawnedObjectXOffset;
    spawnTrigger.spawnedObjectY = (top + width / 2) + spawnedObjectYOffset;
    localSprites.push(spawnTrigger);
}

function addForceTrigger(left, top, width, height, cooldownInSeconds, target, forceType, forceMagnitudeX, forceMagnitudeY) {
    //can send forceTypes FORCE_AMP or FORCE_FIXED right now.
    //FORCE_AMP multiplies the player's vx and vy by the forceMagnitudeX and forceMagnitudeY arguments.
    //FORCE_FIXED adds the forceMagnitudeX and forceMagnitudeY arguments to the player's vx and vy.
    var hitBox = rectangle(left, top, width, height);
    var frames = [
        $.extend(rectangle(1 * 16, 0 * 16, 16, 16), {image: fireballContrailAImage, hitBox}),
    ];
    var forceTrigger = new SimpleSprite({frames}, left, top, 0, 0, 1, 1);
    forceTrigger.type = TRIGGER_TYPE_FORCE; //hm, don't actually use this...
    forceTrigger.cooldownInMS = cooldownInSeconds * 1000;
    forceTrigger.hitBox = hitBox;
    forceTrigger.notReadyToTriggerUntil = now();
    forceTrigger.framesToLive = 32767;
    forceTrigger.target = target;
    forceTrigger.forceType = forceType;
    forceTrigger.xForce = forceMagnitudeX;
    forceTrigger.yForce = forceMagnitudeY;
    localSprites.push(forceTrigger);
}

function addPowerup(x, y, powerupType, xScale, yScale, durationInSeconds, falls) {
    //send powerup x, y for where its center should be
    //itemType key: 0 = heart,
    var frames = [];
    var powerup = new SimpleSprite({frames}, x, y, 0, 0, xScale, yScale);
    if (powerupType === POWERUP_TYPE_HEART) {
        frames.push($.extend(rectangle(0 * 32, 0 * 32, 32, 32), {image: powerupHeartImage, hitBox}));   //powerup sprites will be animated in the future
    }
    if (powerupType === POWERUP_TYPE_AIRDASH) {
        frames.push($.extend(rectangle(0 * 32, 0 * 32, 32, 32), {image: powerupAirDashImage, hitBox}));
        powerup.durationInMS = durationInSeconds * 1000;
    }
    var xSize = 32,
    ySize = 32,
    scaledXSize = xScale * xSize,
    scaledYSize = yScale * ySize;
    hitBox = rectangle(x - (scaledXSize / 2), y - (scaledYSize / 2), scaledXSize, scaledYSize);
    powerup.type = powerupType;
    powerup.xScale = xScale;
    powerup.yScale = yScale;
    powerup.hitBox = hitBox;
    powerup.scaleOscillation = true;
    powerup.xScaleMin = 0.875;
    powerup.yScaleMin = 0.875;
    powerup.xScaleMax = 1.125;
    powerup.yScaleMax = 1.125;
    powerup.xScalePerFrame = 0.008;
    powerup.yScalePerFrame = 0.008;
    powerup.bobs = true;
    powerup.bobHeightPerFrame = 0.67;
    powerup.bobMaxY = 12;
    powerup.originalY = y;
    powerup.framesToLive = 32767;
/*    if (falls) {          //for powerups to fall and settle on the ground, they'd need geometry collision, which I don't want to tackle right now.
        powerup.vy += 5;    //for some reason this line wasn't working.
    }*/
    localSprites.push(powerup);
}

function powerupBob(powerup) {

}
