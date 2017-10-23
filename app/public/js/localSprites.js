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
    if (localSprite.type === 'SPRITE_TYPE_FIREBALL_HOMING') {
        var fireballHitBox = getGlobalSpriteHitBox(localSprite);
        // We only need to check against the main character here because each client will be running this
        // check for its own main character, which should cover all players.
        if (rectanglesOverlap(fireballHitBox, getGlobalSpriteHitBox(mainCharacter))) {
            mainCharacter.health--;
            localSprite.shouldBeRemoved = true;
        }
    }
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
    //contrail generation
    //WRONG: TOO SPECIFIC TO FIREBALL RIGHT NOW. It seems like you could give addSprite functions a bunch of new parameters to fix this, but that seems messy, as a lot of sprites won't have contrails.
    if (localSprite.hasContrail === true) {
        if (localSprite.contrailTimer >= localSprite.framesBetweenContrailParticles) {
            addFireballParticle(localSprite, 30, 32, 32, 0); //for last argument, 0 = contrail, 1 = detonation
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

    //geomtry collision checks for projectiles that die on impact
    //BROKEN: It looks to me like "alignToTile" isn't happening, and the fireball is detonating in the frame before it would impact something,
    //  rather than right next to the wall it would be moving past.
    if (localSprite.vx && localSprite.diesOnImpact) {
        if (localSprite.vx < 0) {
            if (!(moveSpriteInDirection(localSprite, localSprite.vx, TILE_LEFT))) localSprite.shouldBeRemoved = true;
        } else {
            if (!(moveSpriteInDirection(localSprite, localSprite.vx, TILE_RIGHT))) localSprite.shouldBeRemoved = true;
        }
    }
    if (localSprite.vy && localSprite.diesOnImpact) {
        if (localSprite.vy < 0) {
            if (!(moveSpriteInDirection(localSprite, localSprite.vy, TILE_UP))) localSprite.shouldBeRemoved = true;
        } else {
            if (!(moveSpriteInDirection(localSprite, localSprite.vy, TILE_DOWN))) localSprite.shouldBeRemoved = true;
        }
    }
    //update trigger zones
    if (localSprite.type === 'SPRITE_TYPE_TRIGGER') {
        if (rectanglesOverlap(localSprite.hitBox, getGlobalSpriteHitBox(localSprite.target)) && localSprite.cooldownTimer === 0) { //when I changed "localSprite.hitBox" to "getGlobalSpriteHitBox(localSprite), this stopped working.
            if (localSprite.spawnedObjectType === 1) addHomingFireballSprite(localSprite.spawnedObjectXOffset, localSprite.spawnedObjectYOffset, localSprite.target);
                if (localSprite.xForce) localSprite.target.vx += localSprite.xForce;
                if (localSprite.yForce) localSprite.target.vy += localSprite.yForce;
                localSprite.cooldownTimer++;
        }
        if (localSprite.cooldownTimer > 0 && localSprite.cooldownTimer < localSprite.cooldownFrames) localSprite.cooldownTimer++;
        else localSprite.cooldownTimer = 0;
    }
    if (localSprite.type === 'SPRITE_TYPE_POWERUP') {
        if (rectanglesOverlap(localSprite.hitBox, getGlobalSpriteHitBox(localSprite.target))) {     //when I changed "localSprite.hitBox" to "getGlobalSpriteHitBox(localSprite), this stopped working.
            if (localSprite.powerupType === 'POWERUP_TYPE_HEART') {
                localSprite.target.health = Math.min(localSprite.health + 1, localSprite.target.maxHealth);
                localSprite.shouldBeRemoved = true;
            }
        }
    }

    if (localSprite.framesToLive-- <= 0) {
        // This flag will be used in the update loop to remove this sprite from the list of localSprites.
        localSprite.shouldBeRemoved = true;
    }
    if (localSprite.shouldBeRemoved && localSprite.type === 'SPRITE_TYPE_FIREBALL_HOMING') addFireballDetonation(localSprite, 10, 32, 32); //WRONG: don't know why this (following) isn't working for the rest of this line (starting after '10,'): getGlobalSpriteHitBox(localSprites[i]).width, getLocalSpriteHitBox(localSprites[i].height));
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
customBlocksAImage = requireImage('gfx/customBlocksA.png'),
heartImage = requireImage('/gfx/heart.png');

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
    homingFireballSprite.type = 'SPRITE_TYPE_FIREBALL_HOMING';
    homingFireballSprite.homing = true;
    homingFireballSprite.target = target;
    homingFireballSprite.maxSpeed = 3.5;
    homingFireballSprite.acceleration = 0.8;
    homingFireballSprite.framesToLive = 1000;
    homingFireballSprite.msBetweenFrames = 50;
    homingFireballSprite.rotationPerFrame = 5;
    homingFireballSprite.scaleOscillation = true;
    homingFireballSprite.xScaleMax = 1.75;
    homingFireballSprite.xScaleMin = 1.25;
    homingFireballSprite.yScaleMax = 1.75;
    homingFireballSprite.yScaleMin = 1.25;
    homingFireballSprite.xScalePerFrame = 0.01;
    homingFireballSprite.yScalePerFrame = 0.01;
    homingFireballSprite.hasContrail = true;
    homingFireballSprite.framesBetweenContrailParticles = 3;
    homingFireballSprite.diesOnImpact = true;
    localSprites.push(homingFireballSprite);
}


function addFireballParticle(parent, decayFrames, parentPreScalingXSize, parentPreScalingYSize, type) { //types: 0 = contrail, 1 = detonation
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
    if (type === 0) fireballParticle.type = 'fireballContrailParticle';
    if (type === 1) fireballParticle.type = 'fireballDetonationParticle';
    fireballParticle.framesToLive = decayFrames;
    fireballParticle.scaleOscillation = true;
    fireballParticle.xScalePerFrame = fireballParticle.xScale / fireballParticle.framesToLive;
    fireballParticle.yScalePerFrame = fireballParticle.yScale / fireballParticle.framesToLive;
    fireballParticle.xScaleMin = 0;
    fireballParticle.yScaleMin = 0;
    fireballParticle.rotationPerFrame = 50;
    //fireballParticle.msBetweenFrames = Math.round((decayFrames * 50 /*or framerate*/) / frames.length) + 1; //'+1' hopefully keeps the animation from starting to loop just before the pariticle dies.  //would be better to also have a continuous alpha fade happen during this time. Could also scale down if that weren't build into the animation frames already.
    //parent.contrailParticles.push(fireballParticle);
    if (fireballParticle.type === 'fireballContrailParticle') localSprites.push(fireballParticle); //WRONG: Should push to parent.contrailParticles, but then render.js should render things in that array. I don't know the syntax for that yet, I don't think.
    if (fireballParticle.type === 'fireballDetonationParticle') {
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
        fireballParticle.vy = randomVY + 4;
        localSprites.push(fireballParticle);
    }
}

function addFireballDetonation(parent, numberOfFragments, parentPreScalingXSize, parentPreScalingYSize) {
    var detonationParticles = [];
    for (var i = 0; i < numberOfFragments; i++) {
        var newParticle = addFireballParticle(parent, 30, parentPreScalingXSize, parentPreScalingYSize, 1);
        detonationParticles.push(newParticle);
    }
    for (var j = 0; j < detonationParticles.length; j++) {

    }
}


function addTrigger(left, top, width, height, target, spawnedObjectType, spawnedObjectXOffset, spawnedObjectYOffset, xForce, yForce, cooldownFrames) { //too many parameters! break function up into subtypes of trigger zone
    //spawnedObjectXOffset and ...YOffset are where opject spawns relative to the center of the trigger zone
    //spawnedObjectType key: 0 = doesn't spawn anything, 1 = homing fireball
    var hitBox = rectangle(left, top, width, height);
    var frames = [
        $.extend(rectangle(1 * 16, 0 * 16, 16, 16), {image: customBlocksAImage, hitBox}),
        //$.extend(rectangle(1 * 8, 0 * 8, 8, 8), {image: fireballContrailAImage, hitBox}),
        //$.extend(rectangle(2 * 8, 0 * 8, 8, 8), {image: fireballContrailAImage, hitBox}),
        //$.extend(rectangle(3 * 8, 0 * 8, 8, 8), {image: fireballContrailAImage, hitBox}),
        //$.extend(rectangle(4 * 8, 0 * 8, 8, 8), {image: fireballContrailAImage, hitBox}),
    ];
    var trigger = new SimpleSprite({frames}, left, top, 0, 0, 1, 1);
    trigger.type = 'SPRITE_TYPE_TRIGGER',
    trigger.hitBox = rectangle(left, top, width, height),
    trigger.target = target,
    trigger.cooldownFrames = cooldownFrames,   //50 per second, I think
    trigger.cooldownTimer = 0,
    trigger.xForce = xForce,
    trigger.yForce = yForce,
    trigger.spawnedObjectType = spawnedObjectType,
    trigger.spawnedObjectXOffset = (left + width / 2) + spawnedObjectXOffset,
    trigger.spawnedObjectYOffset = (top + width / 2) + spawnedObjectYOffset,
    trigger.framesToLive = 32767;   //temporary: should change the shouldBeRemoved code to have a more sensible way to signify immortality.
    localSprites.push(trigger); //this will gone when tigger zones are broken up into types better
}

function addPowerup(x, y, powerupType, xScale, yScale, target, falls) {
    //send powerup x, y for where its bottom middle should be
    //itemType key: 0 = heart,
    var frames = [];
    var powerup = new SimpleSprite({frames}, x, y, 0, 0, target, xScale, yScale);
    powerup.type = 'SPRITE_TYPE_POWERUP';
    if (powerupType === 0) {
        frames.push($.extend(rectangle(0, 0, 50, 50), {image: heartImage, hitBox}));
        var xSize = 50,  //would like to procedurally draw this figure (and Y counterpart) from the dimensions of the current animation frame
        ySize = 50,
        scaledXSize = xScale * xSize,
        scaledYSize = yScale * ySize,
        hitBox = rectangle(x - (scaledXSize / 2), y - scaledYSize, scaledXSize, scaledYSize); //or could skip and like getGlobalSpriteHitBox use the animation frame?
        //could probably draw from these (following) lines of code to extract dimensions from an animation frame (but this would be of a static size):
        //var frame = sprite.animation.frames[sprite.currentFrame];
        //hitBox = frame.hitBox || rectangle(0, 0, frame.width, frame.height);
        powerup.powerupType = 'POWERUP_TYPE_HEART',
        powerup.xScale = xScale,
        powerup.yScale = yScale,
        powerup.target = target,
        powerup.hitBox = rectangle(x - (scaledXSize / 2), y - scaledYSize, scaledXSize, scaledYSize),
        powerup.framesToLive = 32767;
    }
/*    if (falls) {          //for powerups to fall and settle on the ground, they'd need geometry collision, which I don't want to tackle right now.
        powerup.vy += 5;    //for some reason this line wasn't working.
    }*/
    localSprites.push(powerup);
}
