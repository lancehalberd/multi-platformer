var PROJECTILE_TYPE_HOMING_FIREBALL = 'homingFireball';
var PROJECTILE_TYPE_SENTINEL_BEAM = 'sentinelBeam';
var PROJECTILE_TYPE_SENTINEL_BEAM_CHARGING = 'sentinelBeamInHarmlessChargingPhase';
var PROJECTILE_TYPE_SENTINEL_TARGETING_DUMMY = 'sentinelTargetingDummyProjectile';

var POWERUP_TYPE_HEART = 'heart';
var POWERUP_TYPE_AIR_DASH = 'airDash';

var CREATURE_TYPE_ADORABILIS = 'adorableOctopus';
var CREATURE_TYPE_PACING_FIREBALL_VERTICAL = 'fireballPacingVertically';
var CREATURE_TYPE_PACING_FIREBALL_HORIZONTAL = 'fireballPacingHorizontally';
var CREATURE_TYPE_HAUNTED_MASK = 'hauntedMaskCreature';
var CREATURE_TYPE_WRAITH_HOUND = 'wraithHoundCreature';
var CREATURE_TYPE_SENTINEL_EYE = 'sentineEyeCreature';

var PARTICLE_TYPE_FIREBALL_COLLISION = 'fireballCollisionParticle';
var PARTICLE_TYPE_FIREBALL_CONTRAIL = 'fireballContrailParticle';
var PARTICLE_TYPE_BEAM_IMPACT = 'beamImpactPartilce';
var PARTICLE_TYPE_TELEPORTER_IDLING = 'teleporterIdlingParticle';
var PARTICLE_TYPE_TELEPORTER_TELEPORTING = 'teleporterTeleportingParticle';

var NO_TARGET = 'targetIsNoTarget';


class SimpleSprite {
    constructor(animation, x, y, vx = 0, vy = 0, xScale = 1, yScale = 1) {
        this.animation = animation;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.dx = 0;
        this.dy = 0;
        this.rotation = 0;
        this.rotationPerFrame = 0;
        this.homing = false;
        this.fleeing = false;
        this.flying = false; //this does two things: non-flying things are affected by gravity; flying things that are homing have homing dy.
        this.noWanderingDirectionChangeUntil = now();    // for wandering behavior
        this.wandering = false;
        this.wanderingChanceOfIdling = 0.33; // 0 will never idle while wandering, 1 will always idle while wandering.
        this.target = null;
        this.homingAcceleration = 0;
        this.fleeingAcceleration = 0;
        this.maxSpeed = 32767;
        this.maxAcceleration = 3;
        this.collides = false;  //checks for collision with level geometry.
        this.removedOnCollision = false; //if sprite collides (with level geometry) it will be removed.
        this.facesDirectionOfMovement = false;
        this.facesDirectionOfAcceleration = false;
        this.currentFrame = 0;
        this.framesToLive = 0;
        this.msBetweenFrames = 200;
        this.slipping = false; // same as .slipping for player character: doubles framerate while slipping on ice or while accelerating direction opposite of movment for non-flying creatures for which .facesDirectionOfAcceleration is true
        this.msBetweenFramesWhileSlipping = 100;
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
        this.invulnerableOnDamageDuration = 1000;
    }

    getOriginalHitBox() {
        if (this.hitBox) return this.hitBox;
        var frame = this.animation.frames[this.currentFrame];
        if (!frame) return null;
        // If the hitBox is based on the hitBox of the frame, shift it
        // so that the origin is in the bottom middle of the hitBox,
        // which is where we draw sprites to as well.
        var hitBox = frame.hitBox || frame;
        return hitBox.moveTo(-hitBox.width / 2, -hitBox.height);
    }

    getHitBox() {
        var hitBox = this.getOriginalHitBox();
        if ((this.scale || 1) !== 1 || (this.xScale || 1) !== 1 || (this.yScale || 1) !== 1) {
            hitBox = hitBox.stretch(
                Math.abs((this.scale || 1) * (this.xScale || 1)),
                Math.abs((this.scale || 1) * (this.yScale || 1))
            ).snap();
        }
        return hitBox;
    }

    update() {
        updateLocalSprite(this);
    }

    render() {
        drawSprite(mainContext, this);
    }

    renderHUD(context, target) {
        drawSpriteToRectangle(context, this, target);
    }
}
// Make sure we don't try to save the target to the server.
SimpleSprite.localFields = ['target'];



// This function is called every update and controls updating the local sprite, which for now just means:
// update position according to velocity.
// updating the current frame
// removing the object
function updateLocalSprite(localSprite) {
    // if (localSprite.type === CREATURE_TYPE_HAUNTED_MASK) console.log(localSprite);   // WRONG: leaving this line in, commented out, until the target situation is sorted out.
    // Assume the target is the mainCharacter if it isn't set yet.
    if (!localSprite.target || localSprite.target === {x: 0, y: 0}) {   // object there is default value for LocalSprite.Target. WRONG: WHY TF isn't target getting passed correctly?
        localSprite.target = mainCharacter;
    }
    // arrgh! nothing else seems to be assigning localSprite.target to mainCharacter
    localSprite.target = mainCharacter;
    // Remove a spawned sprite if it's spawner was removed.
    if (localSprite.spawner && !localSprites.includes(localSprite.spawner)) {
        localSprite.shouldBeRemoved = true;
        return;
    }
    if (localSprite.homing) { //homing behavior
        var dx = localSprite.target.x - localSprite.x;
        var dy;
        if (localSprite.target.hitBox) dy = (localSprite.target.y - (localSprite.target.hitBox.height * 0.5)) - localSprite.y;
        else dy = localSprite.target.y - localSprite.y;
        var magnitude = Math.sqrt(dx * dx + dy * dy);
        if (magnitude > 0) {
            //if (!localSprite.dx) localSprite.vx += dx * localSprite.homingAcceleration / magnitude; // if localSprite doesn't have its own dx, its vx is directly affected
            /*else*/ localSprite.dx += dx * localSprite.homingAcceleration / magnitude; // if localSprite has its own dx, the homing dx is added to it
            if (localSprite.flying) {
                // homing only affects vy if sprite is flying
                //if (!localSprite.dy) localSprite.vy += dy * localSprite.homingAcceleration / magnitude;
                /*else*/ localSprite.dy += dy * localSprite.homingAcceleration / magnitude;
            }
        }
    }
    if (localSprite.fleeing) { //fleeing behavior
        // WRONG I had duplicated this from the homing function, and it said the vars here were already defined. But then, when I deleted their declarations here, it said I was using them out of scope. I just changed their names, but I thought they were in their own scope, or whatever, and I could use the same names for different, local variables. :/
        var fleeingDx = localSprite.target.x - localSprite.x;
        var fleeingDy = localSprite.target.y - localSprite.y;
        var fleeingMagnitude = Math.sqrt(fleeingDx * fleeingDx + fleeingDy * fleeingDy);
        if (fleeingMagnitude > 0) {
            localSprite.dx -= fleeingDx * localSprite.fleeingAcceleration / fleeingMagnitude;
            if (localSprite.flying) {
                localSprite.dy -= fleeingDy * localSprite.fleeingAcceleration / fleeingMagnitude;
            }
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
            addParticle(localSprite, 30, 32, 32, PARTICLE_TYPE_FIREBALL_CONTRAIL);
            localSprite.contrailTimer = 0;
        } else {
            localSprite.contrailTimer++;
        }
    }
    if (!localSprite.collides) {
        localSprite.x += localSprite.vx;
        localSprite.y += localSprite.vy;
    }
    // max speed
    localSprite.currentSpeed = Math.sqrt(localSprite.vx * localSprite.vx + localSprite.vy * localSprite.vy);
	if (localSprite.flying ) {
		if (localSprite.currentSpeed > localSprite.maxSpeed) {
			var normalizedVector = getNormalizedVector(0, localSprite.vx, 0, localSprite.vy);
			localSprite.vx = normalizedVector[0] * localSprite.maxSpeed;
			localSprite.vy = normalizedVector[1] * localSprite.maxSpeed;
		}
	} else {
		localSprite.vx = Math.min(localSprite.vx, localSprite.maxSpeed);
	}
    // OLD MAX SPEED CODE
    /*
    if (localSprite.vx < 0) {
        localSprite.vx = Math.max(-localSprite.maxSpeed, localSprite.vx);
    } else {
        localSprite.vx = Math.min(localSprite.maxSpeed, localSprite.vx);
    }
    if (localSprite.flying) {
        if (localSprite.vy < 0) {
            localSprite.vy = Math.max(-localSprite.maxSpeed, localSprite.vy);
        } else {
            localSprite.vy = Math.min(localSprite.maxSpeed, localSprite.vy);
        }
    }
    */
    // max acceleration
    if (localSprite.dx < 0) {
        localSprite.dx = Math.max(-(localSprite.maxAcceleration), localSprite.dx);
    } else {
        localSprite.dx = Math.min(localSprite.maxAcceleration, localSprite.dx);
    }
    if (localSprite.flying) {
        // max dy only affects flying things
        if (localSprite.dy < 0) {
            localSprite.dy = Math.max(-localSprite.maxAcceleration, localSprite.dy);
        } else {
            localSprite.dy = Math.min(localSprite.maxAcceleration, localSprite.dy);
        }
    }
    //animation stuff. msBetweenFrames sets sprite's animation speed. Might want to doe this in FPS at some point.
    localSprite.currentFrame = Math.floor(now() / (localSprite.slipping ? localSprite.msBetweenFramesWhileSlipping : localSprite.msBetweenFrames) % localSprite.animation.frames.length);
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
    if (localSprite.facesDirectionOfMovement) {
        if (localSprite.vx > 0) localSprite.xScale = Math.abs(localSprite.xScale);
        if (localSprite.vx < 0) localSprite.xScale = -Math.abs(localSprite.xScale);
    }
    if (localSprite.facesDirectionOfAcceleration) {
        if (localSprite.dx > 0) localSprite.xScale = Math.abs(localSprite.xScale);
        if (localSprite.dx < 0) localSprite.xScale = -Math.abs(localSprite.xScale);
        if (!localSprite.flying) {  // WRONG: should also be && localSprite.grounded, but I think local sprites don't have a .grounded property for now.
            // if acceleration and movement are in opposite directions, sprite is slipping
            if ((localSprite.dx > 0 && localSprite.vx < 0) || (localSprite.dx < 0 && localSprite.vx > 0)) localSprite.slipping = true;
            else localSprite.slipping = false;
        }
    }
    // gravity
    if (!localSprite.flying) localSprite.vy++;
    // acceleration
    localSprite.vx += localSprite.dx;
    localSprite.vy += localSprite.dy;
    // is target inside aggro radius. If so, sets localSprite.targetInAggroRadius to true.
    if (isCharacterInsideRadius(localSprite.x, localSprite.y, localSprite.aggroRadius, localSprite.target)) localSprite.targetInAggroRadius = true;
    else localSprite.targetInAggroRadius = false;
    // wandering behavior
    if (localSprite.wandering) {
        if (localSprite.noWanderingDirectionChangeUntil <= now()) {
            if (localSprite.wanderingChanceOfIdling > Math.random()) { // creature will wander
                var randomDx = Math.random() * localSprite.wanderingAccelerationXScale,
                    randomDy = Math.random() * localSprite.wanderingAccelerationYScale;
                if (Math.random() < 0.5) randomDx = -randomDx;
                if (Math.random() < 0.5) randomDy = -randomDy;
                localSprite.dx = randomDx;
                if (localSprite.flying) localSprite.dy = randomDy;
                var timeBetweenDirectionChangesRange = localSprite.msBetweenWanderingDirectionChangeMax - localSprite.msBetweenWanderingDirectionChangeMin,
                    randomTimeDisplacement = Math.random() * timeBetweenDirectionChangesRange;
                localSprite.noWanderingDirectionChangeUntil = now() + localSprite.msBetweenWanderingDirectionChangeMin + randomTimeDisplacement;
            } else { // creature will idle
                localSprite.dx = 0;
                localSprite.dy = 0;
                localSprite.vx = 0;
                localSprite.vy = 0;
            }
        }
        localSprite.vx += localSprite.dx;
        localSprite.vy += localSprite.dy;
    }
    // haunted mask update
    if (localSprite.type === CREATURE_TYPE_HAUNTED_MASK) {
        // if target is inside aggro radius
        if (localSprite.targetInAggroRadius) {
            // aggroed
            // smoke plumes come closer together when aggroed
            localSprite.msBetweenSmokePlumes = 1100;
            // chases target when aggroed
            localSprite.wandering = false;
            localSprite.homing = true;
            // moves faster when aggroed
            localSprite.maxSpeed = localSprite.maxSpeedAggroed;
            // cancel out any residual dx/dy from non-aggroed state that might interfere with homing
            // is this necessary as things are? Even if it is, should they be reworked so that it isn't?
            //localSprite.dx = 0;
            //localSprite.dy = 0;
        }
        else {
            // target is outside aggro radius, de-aggros
            // smoke plumes come farther apart when not aggroed
            localSprite.msBetweenSmokePlumes = 1800;
            localSprite.homing = false;
            localSprite.wandering = true;
            localSprite.maxSpeed = localSprite.maxSpeedPeaceful;
        }
        // spawn smoke plumes
        if (localSprite.noSmokePlumeUntil <= now()) {
            var plumeVx,
                plumeVy = Math.min(-1, localSprite.vy -1);
            if (localSprite.vx < 0) plumeVx = Math.min(1, -localSprite.vx);
            if (localSprite.vx >= 0) plumeVx = Math.max(-1, -localSprite.vx);
            addEffectHauntedMaskSmoke(localSprite.x - getGlobalSpriteHitBox(localSprite).width * localSprite.xScale, localSprite.y, plumeVx, plumeVy, Math.abs(localSprite.xScale) * 1.2, 3);
            localSprite.noSmokePlumeUntil = now() + localSprite.msBetweenSmokePlumes;
        }
        // on collision with target
        if (getGlobalSpriteHitBox(localSprite).overlapsRectangle(getGlobalSpriteHitBox(localSprite.target))) {
            damageSprite(localSprite.target, 1);
        }
    }
    // end haunted mask update

    // wraith hound update
    if (localSprite.type === CREATURE_TYPE_WRAITH_HOUND) {
        // if target is in aggro radius, hound will stay aggroed for a bit even if target leaves radius
        if (localSprite.vx === 0 && localSprite.vy === 1) localSprite.animation = localSprite.idlingAnimation;
        if (localSprite.targetInAggroRadius && localSprite.notReadyToAggroUntil <= now() && !localSprite.target.disabled) localSprite.aggroedUntil = now() + localSprite.persistentAggroTime;
        if ((localSprite.targetInAggroRadius || localSprite.aggroedUntil > now()) && localSprite.notReadyToAggroUntil <= now() && !localSprite.target.disabled) {
            localSprite.animation = localSprite.runningAnimation;
            //aggroed if target is in aggro radius or *has* been in aggro radius recently
            localSprite.facesDirectionOfMovement = false;
            localSprite.facesDirectionOfAcceleration = true;
            localSprite.fleeing = false;
            localSprite.wandering = false;
            localSprite.homing = true;
            localSprite.maxSpeed = localSprite.maxSpeedAggroed;
            localSprite.chasing = true;
            //localSprite.msBetweenFrames = 90;
            //BROKEN: working on making animation speed scale with vx.
        }
        if (!localSprite.targetInAggroRadius && localSprite.aggroedUntil <= now() && !localSprite.target.disabled) {
            //un-aggroed
            // running animation if moving fast enough, else walking animation.
            if (Math.abs(localSprite.vx) > localSprite.runSpeedThreshold) localSprite.animation = localSprite.runningAnimation;
            else localSprite.animation = localSprite.walkingAnimation;
            //peaceful if target is out of aggro radius and has had time to calm down since target last *was* in aggro radius
            localSprite.homing = false;
            localSprite.fleeing = false;
            if (!localSprite.chasing) { // if is done chasing (i.e. de-aggroed and has slowed down, then wanders.
                //localSprite.facesDirectionOfAcceleration = true;
                localSprite.wandering = true;
                localSprite.maxSpeed = localSprite.maxSpeedPeaceful;
            }
            // slows down gradually after chasing before begins wandering
            if (localSprite.chasing && Math.abs(localSprite.vx) > localSprite.maxSpeedPeaceful / 4) { // slow down almost to a stop before wandering, to make sure it doesn't abruptly reverse direction
                localSprite.facesDirectionOfAcceleration = false; // when declerating after a chase, doesn't turn backward to gently slow down. Also doesn't face direction of acceleration when walking.
                localSprite.facesDirectionOfMovement = true;
                var decelerationRate = 0.02;// 0.01 * Math.min((localSprite.maxSpeed / localSprite.vx), 2.67);   // commented out stuff: deceleration rate increases with decreasing speed.
                if (localSprite.vx > 0) localSprite.dx -= decelerationRate;
                else localSprite.dx =+ decelerationRate;
            }
            if (localSprite.chasing && Math.abs(localSprite.vx) <= localSprite.maxSpeedPeaceful / 4) localSprite.chasing = false; // de-aggroed and slowed to 1/4 peaceful speed, so is no longer chasing, and will start wandering next frame
        }
        // animation speed scales with vx
        var minMsBetweenFrames,
            maxMsBetweenFrames;
        minMsBetweenFrames = localSprite.msBetweenFramesWhileSlipping;
        maxMsBetweenFrames = localSprite.msBetweenFramesBase * 1.5;
        localSprite.msBetweenFrames = Math.max(minMsBetweenFrames, (2 / Math.max(2, Math.abs(localSprite.vx))) * maxMsBetweenFrames);
        // run dust
        if (localSprite.slipping && localSprite.noRunDustUntil <= now()) {
            // WRONG: Slipping run dust animation should  have an "acroos the ground sweeping up and back" type trajectory/look
            addEffectRunDust(localSprite.x, localSprite.y);
            localSprite.noRunDustUntil = now() + localSprite.msBetweenSlippingRunDustPlumes;
        }
        if (Math.abs(localSprite.vx) > localSprite.runDustSpeed && localSprite.noRunDustUntil <= now()) {
            addEffectRunDust(localSprite.x, localSprite.y);
            localSprite.noRunDustUntil = now() + localSprite.msBetweenRunDustPlumes;
        }
        // ghost/shadow trail
        // BROKEN: NOT WORKING and I don't know why
        /*if (localSprite.noTrailUntil <= now()) {
            var houndFps = 1000 / localSprite.msBetweenFrames;
            addEffectWraithHoundGhostTrail(localSprite.x, localSprite.y, localSprite.vx * 0.75, localSprite.vy * 0.75, localSprite.yScale, houndFps); // WRONG: this needs to invert its xScale when it's spawned while the hound is moving left.
            msBetweenTrails = localSprite.msBetweenTrailsScale / Math.abs(localSprite.vx / 4);
            if (localSprite.chasing) localSprite.noTrailUntil = now() + msBetweenTrails;
            else localSprite.noTrailUntil = now() + (msBetweenTrails / 1.5);
            console.log('wraith hound trail spawned'); // BROKEN this is happening once, but should happen much.
        }*/
        // on collision with player
        if (isObjectCollidingWithNonInvulnerableTarget(localSprite, localSprite.target) && localSprite.notReadyToAttackUntil <= now()) {
            var target = localSprite.target,
                minKnockBackMagnitude = 23;
            damageSprite(target, 1);
            if (localSprite.vx > 0) target.vx += Math.max(localSprite.vx * 0.75, minKnockBackMagnitude);
            else target.vx += Math.min(localSprite.vx * 0.75, -minKnockBackMagnitude);
            target.vy -= 6;
            target.knockedDown = true;
            // cooldown before creature can attack or aggro again
            localSprite.notReadyToAttackUntil = now() + localSprite.attackCooldown;
            localSprite.notReadyToAggroUntil = now() + localSprite.aggroCooldown;
            // hit-and-run behavior
            localSprite.homing = false;
            localSprite.followThroughDuration = 750;
            localSprite.followThroughUntil = now() + localSprite.followThroughDuration;
            localSprite.postAttackFleeDuration = 1500;
            localSprite.fleeUntil = now() + localSprite.postAttackFleeDuration;
            localSprite.target.wasJustKnockedDown = true;
            // if target is to the right of hound
            if (localSprite.x < target.x) {
                localSprite.followThroughVx = localSprite.maxSpeedAggroed;
                localSprite.followThroughDx = localSprite.maxAcceleration; 
            } else {
                localSprite.followThroughVx = -localSprite.maxSpeedAggroed; // if target is to the left of hound
                localSprite.followThroughDx = -localSprite.maxAcceleration;
            }   
        }
        // at moment of impact, hound accelerates toward target to max speed and goes straight for a short period as an attack follow-through
        // after that it flees from the target for a while, then resume normal wander/aggro behavior
        if (localSprite.followThroughUntil <= now() && localSprite.fleeUntil > now()) {
            localSprite.fleeing = true;
        }
        if (localSprite.followThroughUntil > now() && localSprite.notReadyToAggroUntil > now() && !localSprite.wandering && !localSprite.homing) {
            // if target is to the right of hound
                localSprite.vx = localSprite.followThroughVx;
                localSprite.dx = localSprite.followThroughVx; 
        }
        ////////////////
        // WRONG: This 'waits a certain distance from disabled targets' thing and several other hound behaviors are going to need to be adjusted to make sensible behaviors when they encounter walls and drops.
        // If the target is disabled, the hound moves to a certain distance (outside their aggro radius) and idles.
        // WRONG: This behavior should probably replace some of what's above. I.e. right now, the hound flee the target for a while after knocking it down and following through
        //      with the attack. But instead of a timed flee, the hound should flee to a certain distance if the target is disabled, as long as it's not following through.
        /*if (localSprite.target.disabled && Math.abs(localSprite.x - localSprite.target.x) < localSprite.aggroRadius + 250) localSprite.fleeing = true;
        if (localSprite.target.disabled && Math.abs(localSprite.x - localSprite.target.x) > localSprite.aggroRadius + 250) {
            localSprite.vx = 0;
            localSprite.animation = localSprite.idlingAnimation;
        }*/
    }
    // end wraith hound update

    // sentinel eye update
	// NOTE: There are some things are are eye.______ instead of just vars. This is because vars whose values I was assigning in a given 'if' structure
	//		were yielding the value 'undefined' when called from different 'if' structures, even if the vars were originally declared at a scope that I though
	//		should include both of those 'if' structures.
    if (localSprite.type === CREATURE_TYPE_SENTINEL_EYE) {
        var eye = localSprite,
            maxChargeTime = eye.maxBeamChargeTimeInMs,
            minChargeTime = eye.minBeamChargeTimeInMs,
            chargeTimeRange = maxChargeTime - minChargeTime,
            beamDamageRange = eye.maxBeamDamage - eye.minBeamDamage,
            beamDuration = eye.target.invulnerableOnDamageDurationInMs * 0.9,  // beam won't live long enough to damage target twice
            xDistanceToBeamTargetPoint,
            yDistanceToBeamTargetPoint,
            normalizedTargetingVector = [],
            targetingDummyVx,
            targetingDummyVy,
            eyeTargetY = eye.target.y - eye.target.hitBox.height * 0.5; // adjusted targeting point away from the origin toward the center of the target's hit box
        // setting beam origin
		if (eye.xScale < 0) eye.beamOriginX = eye.x + -eye.hitBox.width * 0.75;   // WRONG will need to change with eye rotation
        else eye.beamOriginX = eye.x + eye.hitBox.width * 0.75;
		eye.beamOriginY = eye.y - eye.hitBox.height * 0.2;  // WRONG will need to change with eye rotation
        if ((!eye.attacking || eye.notReadyToAttackUntil > now()) && !eye.attackBeginning && eye.attackingUntil <= now()) {
            eye.wandering = true;
            if (eye.doNotFireTargetingDummyProjectileUntil <= now() && eye.notReadyToAttackUntil <= now()) {
                normalizedTargetingVector = getNormalizedVector(eye.beamOriginX, eye.target.x, eye.beamOriginY, eyeTargetY);
                targetingDummyVx = normalizedTargetingVector[0] * eye.targetingDummyMaxSpeed;
                targetingDummyVy = normalizedTargetingVector[1] * eye.targetingDummyMaxSpeed;
                getProjectileSentinelTargetingDummy(eye.beamOriginX, eye.beamOriginY, targetingDummyVx, targetingDummyVy, eye.target, eye);
                eye.doNotFireTargetingDummyProjectileUntil = now() + eye.delayBetweenFiringTargetingDummiesInMs;
            }
        }
        if (!eye.vy && !eye.vx && !eye.attacking) {
            eye.animation = eye.idlingAnimation;
        }
        // attacking
        // initiate attack
        if (eye.shouldAttack && !eye.attackBeginning && eye.notReadyToAttackUntil <= now() && eye.attackingUntil <= now()) {   // these probably aren't all necessary?
            eye.wandering = false;
            eye.dx = eye.dy = eye.vx = eye.vy = 0;
            eye.animation = eye.attackStartupAnimation;
            eye.randomChargeTime = minChargeTime + Math.random() * chargeTimeRange;
            eye.chargeBeginning = true;
            eye.shouldAttack = false;
            eye.beamChargingUntil = now() + eye.randomChargeTime;
        }
        // beam charging phase of attack
        // WRONG: code in the charging and firing phase is duplicated because of the two types of beams that are spawning (charging and damage)
        //      Maybe store vars as properties of eye if there are scope issues making things register as undefined.
        //      
        if (eye.chargeBeginning && eye.beamChargingUntil > now()) {
            // charging animation
            xDistanceToBeamTargetPoint = Math.abs(eye.beamTargetX - eye.x);
            yDistanceToBeamTargetPoint = Math.abs(eye.beamTargetY - eye.y);    
            // beam damage will be either 1 or 2, depending on how long it charged for
            eye.beamDamage = Math.ceil(eye.minBeamDamage + Math.round(beamDamageRange * (eye.randomChargeTime / chargeTimeRange)));
            // wider beam if more damage
            eye.beamWidth = eye.beamDamage * eye.beamWidthScale;
            eye.distanceToObstacle = Math.sqrt(
                xDistanceToBeamTargetPoint * xDistanceToBeamTargetPoint +
                yDistanceToBeamTargetPoint * yDistanceToBeamTargetPoint
            );
			// offsetting beam center so that rotating it leaves it in the right place
			if (eye.target.x > eye.beamOriginX) eye.beamOriginX += 0.5 * xDistanceToBeamTargetPoint;
			else eye.beamOriginX -= 0.5 * xDistanceToBeamTargetPoint;
			if (eye.target.y > eye.beamOriginY) eye.beamOriginY += 0.5 * yDistanceToBeamTargetPoint;
			else eye.beamOriginY -= 0.5 * yDistanceToBeamTargetPoint;
            eye.angleToTarget = Math.atan2(-yDistanceToBeamTargetPoint, xDistanceToBeamTargetPoint) * (180 / Math.PI); // WRONG still working this out. Math.atan2 returns a number from pi to -pi, so this is only working in part of an arc.
            getProjectileSentinelBeamCharging(eye.beamOriginX, eye.beamOriginY, eye.distanceToObstacle, eye.beamWidth, eye.angleToTarget, eye);
            eye.chargeBeginning = false;
            eye.attackBeginning = true;
        }
        // firing phase of attack
        if (eye.attackBeginning && eye.beamChargingUntil <= now()) {
            eye.animation = eye.attackAnimation;
            getProjectileSentinelBeam(eye.beamOriginX, eye.beamOriginY, eye.distanceToObstacle, eye.beamWidth, eye.angleToTarget, eye.beamDamage, beamDuration, eye.target, eye);
            eye.attackBeginning = false;
            eye.attackingUntil = now() + beamDuration;
            eye.notReadyToAttackUntil = now() + eye.attackCooldownInMs;
        }
    }
    // end sentinel eye update
    
    
    if (localSprite.type === CREATURE_TYPE_ADORABILIS) {
        if (getGlobalSpriteHitBox(localSprite).overlapsRectangle(getGlobalSpriteHitBox(mainCharacter)) && isCreatureReady(localSprite)) {
            localSprite.notReadyToTriggerUntil = now() + localSprite.cooldownInMS;
            mainCharacter.compelledByOctopusTouch = now() + localSprite.durationOfTouchEffectInMS;
        }
    }
    //THIS FUNCTION IS ONLY CALLED BY THE ADORABILIS CREATURE, AND SHOULD BE DELETED WHEN THE ADORALBILIS IS UPDATED TO NOT USE IT. Or maybe we'll use it for other creatures.
    function isCreatureReady(creature) {
        return  now() > creature.notReadyToTriggerUntil;
    }

    if (localSprite.type === CREATURE_TYPE_PACING_FIREBALL_HORIZONTAL || localSprite.type === CREATURE_TYPE_PACING_FIREBALL_VERTICAL) {
        if (getGlobalSpriteHitBox(localSprite).overlapsRectangle(getGlobalSpriteHitBox(mainCharacter)) && !(mainCharacter.invulnerableUntil > now())) { //on collision with non-invulnerable player
            var randomVXBoost;
            //note: character should get bounced away from fireball, which could use some code similar to that used for homing, but I didn't want to deal with that while I was making this.
            mainCharacter.vy = -15; //player pops upward if hit
            if (Math.random() > 0.5) randomVXBoost = Math.random() * 8;   //player gets a random vx if hit.
            else randomVXBoost = Math.random() * -8;
            mainCharacter.vx += randomVXBoost;
            damageSprite(mainCharacter, 1);
        }
    }

    if (localSprite.type === PROJECTILE_TYPE_HOMING_FIREBALL) {
        // We only need to check against the main character here because each client will be running this
        // check for its own main character, which should cover all players.
        if (getGlobalSpriteHitBox(localSprite).overlapsRectangle(getGlobalSpriteHitBox(mainCharacter))) {   //WRONG: "mainCharacter" should be localSprite.target
            mainCharacter.health--;
            localSprite.shouldBeRemoved = true;
        }
    }
    
    if (localSprite.type === PROJECTILE_TYPE_SENTINEL_BEAM) {
        var beam = localSprite;
        if (isObjectCollidingWithNonInvulnerableTarget(beam, beam.target)) {
            damageSprite(beam.target, beam.damage);
        }
        if (beam.justCreated) {
            beam.livesUntil = now() + beam.duration;
            beam.justCreated = false;
        }
        if (beam.noBeamSparksUntil <= now()) {
            getBeamImpactSparks(beam.parent.beamTargetX, beam.parent.beamTargetY, 2);
            beam.noBeamSparksUntil = now() + beam.msBetweenSparks;
        }
        if (beam.livesUntil <= now()) beam.shouldBeRemoved = true;
    }
    
    if (localSprite.type === PROJECTILE_TYPE_SENTINEL_BEAM_CHARGING) {
        var beamCharging = localSprite;
        beamCharging.yScale += 0.0075;   // WRONG this should use min scale and max scale and divide difference by chargin duration
        if (beamCharging.parent.beamChargingUntil <= now()) beamCharging.shouldBeRemoved = true;
    }
    
    if (localSprite.type === PROJECTILE_TYPE_SENTINEL_TARGETING_DUMMY) {
		// WRONG: there need to be some reiterative collision detection that locates an accurate point of termination, flush to the collision surface.
		//		For now, the dummy is sending the parent a location for beam termination that is just the place the dummy died on the frame when it
		//		would have collided next frame. When it would die next frame, it needs to repeat its check at smaller and smaller intervals, instead
		//		of just doing the one per-16 (tile size) check.
        if (isObjectCollidingWithNonInvulnerableTarget(localSprite, localSprite.target)) {
            localSprite.parent.shouldAttack = true;
        }
        if (localSprite.shouldBeRemoved) {
            localSprite.parent.beamTargetX = localSprite.x;
            localSprite.parent.beamTargetY = localSprite.y;
            // addFireballDetonation(localSprite, 6, 8, 8); // comment back in to visualize impact point
        }
    }
    
    
    // fadeout behavior
    // WRONG: This code needs to fade an animation out over its life span.
    /*if (localSprite.fadesOut) {
        localSprite.alpha =
    }*/
    if (localSprite.framesToLive && --localSprite.framesToLive <= 0) {
        // This flag will be used in the update loop to remove this sprite from the list of localSprites.
        localSprite.shouldBeRemoved = true;
    }
    if (localSprite.shouldBeRemoved && localSprite.type === PROJECTILE_TYPE_HOMING_FIREBALL) addFireballDetonation(localSprite, 10, 32, 32); //WRONG: don't know why this (following) isn't working for the rest of this line (starting after '10,'): getGlobalSpriteHitBox(localSprites[i]).width, getLocalSpriteHitBox(localSprites[i].height));
}
//remove the sprite from the array of local sprites after it has used up all of its frames.
function removeFinishedLocalSprites() {
    // This just gets rid of all the local sprites that have shouldBeRemoved set to true on them
    localSprites = localSprites.filter(localSprite => !localSprite.shouldBeRemoved);
}

var localSprites = [];

function addHomingFireballSprite(xPosition, yPosition, target) {
    var homingFireballSprite = new SimpleSprite(fireballAnimation, xPosition, yPosition, 0, 0, 1.5, 1.5);
    homingFireballSprite.type = PROJECTILE_TYPE_HOMING_FIREBALL;
    homingFireballSprite.homing = true;
    homingFireballSprite.flying = true;
    homingFireballSprite.collides = true;
    homingFireballSprite.removedOnCollision = true;
    homingFireballSprite.target = target;
    homingFireballSprite.maxSpeed = 1.4;
    homingFireballSprite.homingAcceleration = 0.5;
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
    var xScale, yScale, hitBox, frames;
    if (creatureType === CREATURE_TYPE_ADORABILIS) {
        //scaledCenteredLeft = x - (scaledXSize / 2), //replaces 'left' part of rectangle to center the hitBox on the 'x' argument, rather than have 'x' be at its upper-left.
        //scaledCenteredTop = y - (scaledYSize / 2),
        //hitBox = rectangle(scaledCenteredLeft, scaledCenteredTop, scaledXSize, scaledYSize), //made the sprite not draw. don't know why.
        // rectangleToFrames creates N frames from the same image assuming they are in a strip of rectangles laid side by side.
        frames = rectangleToFrames(new Rectangle(0, 0, 32, 32), creatureAdorabilisImage, 9);
        //These values seem to make the octopus sit right on top of the player (note just visually, but in the x/y coordinates), whereas different values leave it displaced. I think it has something to do with scaling, as 1, 1 scaling doesn't create displacement. The fireball, from which this creature was originally copied, doesn't seem to have this problem.
        hitBox = new Rectangle(-24, -56, 80, 80);
        frames.forEach(frame => frame.hitBox = hitBox);

        xScale = yScale = 2.5;
        var adorabilisSprite = new SimpleSprite({frames}, x, y, 0, 0, xScale, yScale);
        adorabilisSprite.type = creatureType;
        adorabilisSprite.homing = true;
        adorabilisSprite.flying = true;
        adorabilisSprite.collides = false; //should be true when there's better collision behavior in place. Probably.
        adorabilisSprite.target = target;
        adorabilisSprite.maxSpeed = 0.8;
        adorabilisSprite.homingAcceleration = 0.1;
        adorabilisSprite.notReadyToTriggerUntil = now();
        adorabilisSprite.durationOfTouchEffectInMS = 10000;
        adorabilisSprite.msBetweenFrames = 85;
        adorabilisSprite.cooldownInMS = 2000; //how long after it touches the player before its touch can affect the player again.
        localSprites.push(adorabilisSprite);
    }
    if (creatureType === CREATURE_TYPE_HAUNTED_MASK) {
        localSprites.push(getCreatureHauntedMask(x, y));
    }
}

function getCreatureHauntedMask(x, y) {
    xScale = yScale = 1.2;
    var animation = {frames: hauntedMaskAnimation.frames.map( frame => {
        // This defines the hitBox inside the frame from the top left corner of that frame.
        frame.hitBox = new Rectangle(15, 4, 28, 38);
        return frame;
    })}
    var hauntedMaskCreature = new SimpleSprite(animation, x, y, 0, 0, xScale, yScale);
    hauntedMaskCreature.type = CREATURE_TYPE_HAUNTED_MASK;
    hauntedMaskCreature.facesDirectionOfMovement = true;
    hauntedMaskCreature.flying = true;
    hauntedMaskCreature.dx = 0;
    hauntedMaskCreature.dy = 0;
    hauntedMaskCreature.homingAcceleration = 0.3;
    hauntedMaskCreature.fleeingAcceleration = 0.3;
    hauntedMaskCreature.msBetweenWanderingDirectionChangeMin = 750;
    hauntedMaskCreature.msBetweenWanderingDirectionChangeMax = 3000;
    hauntedMaskCreature.wanderingAccelerationXScale = 0.33;
    hauntedMaskCreature.wanderingAccelerationYScale = 0.33;
    hauntedMaskCreature.collides = true;
    hauntedMaskCreature.bobs = false;   //should be true, but I don't think the bobbing code will work with a bunch of other creature movement code as it is right now.
    hauntedMaskCreature.msBetweenFrames = 230;
    hauntedMaskCreature.aggroRadius = 270;
    hauntedMaskCreature.maxSpeedPeaceful = 0.5;
    hauntedMaskCreature.maxSpeedAggroed = 1.75;
    hauntedMaskCreature.maxAcceleration = 3;
    hauntedMaskCreature.noSmokePlumeUntil = now();
    return hauntedMaskCreature;
}

function getCreatureWraithHound(x, y) {
    hitBox = new Rectangle(-35, -33, 70, 33);
    xScale = yScale = 1.5;
    var wraithHoundCreature = new SimpleSprite(wraithHoundRunningAnimation, x, y, 0, 0, xScale, yScale);
    wraithHoundCreature.type = CREATURE_TYPE_WRAITH_HOUND;
    wraithHoundCreature.hitBox = hitBox;
    wraithHoundCreature.facesDirectionOfAcceleration = true;
    wraithHoundCreature.runningAnimation = wraithHoundRunningAnimation;
    wraithHoundCreature.walkingAnimation = wraithHoundWalkingAnimation;
    wraithHoundCreature.jumpingAnimation = wraithHoundJumpingAnimation;
    wraithHoundCreature.airborneAnimation = wraithHoundAirborneAnimation;
    wraithHoundCreature.knockedDownAnimation = wraithHoundKnockedDownAnimation;
    wraithHoundCreature.launchedAnimation = wraithHoundLaunchedAnimation;
    wraithHoundCreature.standingUpAnimation = wraithHoundStandingUpAnimation;
    wraithHoundCreature.attackAnimation = wraithHoundAttackAnimation;
    wraithHoundCreature.aggroedButTargetInaccessibleAnimation = wraithHoundBarkingAnimation;
    wraithHoundCreature.idlingAnimation = wraithHoundSittingAnimation;
    wraithHoundCreature.animation = wraithHoundCreature.runningAnimation;
    wraithHoundCreature.runSpeedThreshold = 2.5; // vx at which hound will switch from walking to running animation if not aggroed.
    wraithHoundCreature.dx = 0;
    wraithHoundCreature.dy = 0;
    wraithHoundCreature.msBetweenWanderingDirectionChangeMin = 1500;
    wraithHoundCreature.msBetweenWanderingDirectionChangeMax = 4500;
    wraithHoundCreature.wanderingAccelerationXScale = 0.33;
    wraithHoundCreature.homingAcceleration = 0.15;
    wraithHoundCreature.fleeingAcceleration = 0.15;
    wraithHoundCreature.collides = true;
    wraithHoundCreature.msBetweenFrames = 90;
    wraithHoundCreature.msBetweenFramesBase = 90;
    wraithHoundCreature.msBetweenFramesWhileSlipping = 33;
    wraithHoundCreature.aggroRadius = 200;
    wraithHoundCreature.persistentAggroTime = 2000; //time after target has left aggro radius during which hound will remain aggroed
    wraithHoundCreature.maxSpeedPeaceful = 0.5;
    wraithHoundCreature.maxSpeedAggroed = 6.5;
    wraithHoundCreature.maxAcceleration = 0.189;
    wraithHoundCreature.aggroedUntil = now();
    wraithHoundCreature.noTrailUntil = now();
    wraithHoundCreature.msBetweenTrailsScale = 800;
    wraithHoundCreature.noRunDustUntil = now();
    wraithHoundCreature.msBetweenRunDustPlumes = 250;
    wraithHoundCreature.runDustSpeed = 3.5;
    wraithHoundCreature.msBetweenSlippingRunDustPlumes = 125;
    wraithHoundCreature.notReadyToAggroUntil = now();
    wraithHoundCreature.notReadyToAttackUntil = now();
    wraithHoundCreature.attackCooldown = 5000; // time in ms after having damaged player before hound can attack again
    wraithHoundCreature.aggroCooldown = wraithHoundCreature.attackCooldown; // time in ms after having damaged player before hound will aggro again
    return wraithHoundCreature;
}

function getCreaturePacingFireball(creatureType) {
    var xScale = yScale = 1.15;
    var pacingFireballSprite = new SimpleSprite(fireballAnimation, 0, 0, 0, 0, xScale, yScale);
    pacingFireballSprite.type = creatureType;
    pacingFireballSprite.collides = true;
    pacingFireballSprite.pacing = true;
    pacingFireballSprite.flying = true;
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
    pacingFireballSprite.msBetweenFrames = 50;
    pacingFireballSprite.rotationPerFrame = 5;
    pacingFireballSprite.scaleOscillation = true;
    pacingFireballSprite.xScaleMax = 1.33;
    pacingFireballSprite.xScaleMin = 1;
    pacingFireballSprite.yScaleMax = 1.33;
    pacingFireballSprite.yScaleMin = 1;
    pacingFireballSprite.xScalePerFrame = 0.01;
    pacingFireballSprite.yScalePerFrame = 0.01;
    pacingFireballSprite.hasContrail = true;
    pacingFireballSprite.framesBetweenContrailParticles = 3;
    return pacingFireballSprite;
}

function getCreatureSentinelEye(x, y) {
    hitBox = new Rectangle(-24, -48, 48, 48);
    xScale = yScale = 1;
    var eye = new SimpleSprite(sentinelEyeMovingAnimation, x, y, 0, 0, xScale, yScale);
    eye.type = CREATURE_TYPE_SENTINEL_EYE;
    eye.hitBox = hitBox;
    eye.facesDirectionOfAcceleration = true;
    eye.movingAnimation = sentinelEyeMovingAnimation;
    eye.idlingAnimation = sentinelEyeIdlingAnimation;
    eye.attackStartupAnimation = sentinelEyeAttackStartupAnimation;
    eye.attackAnimation = sentinelEyeAttackAnimation;
    eye.attackRecoveryAnimation = sentinelEyeAttackRecoveryAnimation;
    eye.defeatAnimation = sentinelEyeDefeatAnimation;
    eye.animation = sentinelEyeMovingAnimation;
    eye.flying = true;
    eye.wandering = true;
    eye.dx = 0;
    eye.dy = 0;
    eye.bobs = false; // WRONG: should be true, but bobbing doesn't work with moving creatures right now.
    eye.beamWidthScale = 0.25;
    eye.msBetweenWanderingDirectionChangeMin = 1500;
    eye.msBetweenWanderingDirectionChangeMax = 4500;
    eye.wanderingAccelerationXScale = 0.33;
    eye.wanderingAccelerationYScale = 0.115;
    eye.wanderingChanceOfIdling = 0.33;
    eye.homingAcceleration = 0.15;
    eye.fleeingAcceleration = 0.15;
    eye.collides = true;
    eye.msBetweenFrames = 90;
    eye.aggroRadius = 200;  // not being used right now--just fires on line of sight.
    eye.persistentAggroTime = 2000; //time after target has left aggro radius during which hound will remain aggroed
    eye.maxSpeedPeaceful = 0.5;
    eye.maxSpeedAggroed = 6.5;
    eye.maxSpeed = 0.5;
    eye.maxAcceleration = 0.189;
    eye.notReadyToAttackUntil = now();
    eye.attackingUntil = now();
    eye.attackCooldownInMs = 3000;
    eye.maxBeamDamage = 2;
    eye.minBeamDamage = 1;
    eye.maxBeamChargeTimeInMs = 2000;
    eye.minBeamChargeTimeInMs = 750;
    eye.delayBetweenFiringTargetingDummiesInMs = 200; // eye will fire a targeting dummy every 200 ms.
    eye.targetingDummyMaxSpeed = 16; // WRONG: Needs to be faster, but 16 is the fastest speed that won't skip a whole tile in one frame of checks without special collision checks.
    eye.doNotFireTargetingDummyProjectileUntil = now();
    return eye;
}

function getProjectileSentinelBeam(originX, originY, length, width, rotation, damage, duration, target, parent) {
	// WRONG: giving this a hitBox seems to give it no hit box, where taking it away seems to give it a hit box,
	//		as visible while holding 'Y' in-game. This may have something to do with something automatically assigning  a hit
	//		based on the sprite (sans rotation).
    var spriteXSize = 32,
        spriteYSize = 32,
        xScale = length / spriteXSize,
        yScale = width,
        hitBox = new Rectangle(originX, originY, length, width * 2 * spriteYSize);
    var beam = new SimpleSprite(sentinelBeamAnimationRed, originX, originY, 0, 0, xScale, yScale);
    beam.damage = damage;
    beam.rotation = rotation;
    beam.parent = parent;
    beam.justCreated = true;
    beam.hitBox = hitBox;
    beam.target = target;
    beam.duration = duration;
    beam.flying = true; // otherwise gravity will affect it
    beam.type = PROJECTILE_TYPE_SENTINEL_BEAM;
    beam.noBeamSparksUntil = now();
    beam.msBetweenSparks = 100;
    localSprites.push(beam);
}

function getProjectileSentinelBeamCharging(originX, originY, length, width, rotation, parent) {
	// WRONG: giving this a hitBox seems to give it no hit box, where taking it away seems to give it a hit box,
	//		as visible while holding 'Y' in-game. This may have something to do with something automatically assigning  a hit
	//		based on the sprite (sans rotation).
    var spriteXSize = 32,
		spriteYSize = 32,
        xScale = length / spriteXSize,
        yScale = width * 0.125,
        hitBox = new Rectangle(originX, originY, length, width * 2 * spriteYSize);
    var beam = new SimpleSprite(sentinelBeamAnimationBlue, originX, originY, 0, 0, xScale, yScale);
    beam.rotation = rotation;
    beam.justCreated = true;
	beam.hitBox = hitBox;
    beam.parent = parent;
    beam.flying = true; // otherwise gravity will affect it
    beam.type = PROJECTILE_TYPE_SENTINEL_BEAM_CHARGING;
    localSprites.push(beam);
}

function getProjectileSentinelTargetingDummy(x, y, vx, vy, target, parent) {
    var hitBox = new Rectangle(0, 0, 8, 8);
    var dummy = new SimpleSprite(sentinelTargetingDummyAnimation, x, y, vx, vy, 0.25, 0.25); // change animation to fireballAnimation to visualize.
    dummy.hitBox = hitBox;
    dummy.collides = true;
    dummy.removedOnCollision = true;
    dummy.maxSpeed = parent.targetingDummyMaxSpeed;
    dummy.target = target;
    dummy.parent = parent;
    dummy.flying = true;
    dummy.framesToLive = 75;
    dummy.type = PROJECTILE_TYPE_SENTINEL_TARGETING_DUMMY;
    localSprites.push(dummy);
}
function getNormalizedVector(originX, targetX, originY, targetY) {
    // WRONG(?) yielding x and y values that together equal magnitudes greater than 1.
    var vectorX = targetX - originX,
        vectorY = targetY - originY,
        normalizedVector = [],
        magnitude = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
		vectorX /= magnitude;
		vectorY /= magnitude;
        normalizedVector.push(vectorX, vectorY);
        return normalizedVector;
}

function addParticle(parent, decayFrames, parentPreScalingXSize, parentPreScalingYSize, type) {
    var hitBox = new Rectangle(0, 0, 8, 8);
    var frames = [
        $.extend(new Rectangle(0, 0, 8, 8), {image: fireballContrailAImage, hitBox}),
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
    var particle = new SimpleSprite({frames}, randomX, randomY, 0, 0, 1.25, 2.5);
    particle.type = type;
    particle.framesToLive = decayFrames;
    particle.flying = true;
    particle.scaleOscillation = true;
    particle.xScalePerFrame = particle.xScale / particle.framesToLive;
    particle.yScalePerFrame = particle.yScale / particle.framesToLive;
    particle.xScaleMin = 0;
    particle.yScaleMin = 0;
    particle.rotationPerFrame = 50;
    //particle.msBetweenFrames = Math.round((decayFrames * 50 /*or framerate*/) / frames.length) + 1; //'+1' hopefully keeps the animation from starting to loop just before the pariticle dies.  //would be better to also have a continuous alpha fade happen during this time. Could also scale down if that weren't build into the animation frames already.
    //parent.contrailParticles.push(particle);
    if (particle.type === PARTICLE_TYPE_FIREBALL_CONTRAIL) {
        particle.vy = -3;
        localSprites.push(particle); //WRONG: Should push to parent.contrailParticles, but then render.js should render things in that array. I don't know the syntax for that yet, I don't think.
    }
    if (particle.type === PARTICLE_TYPE_FIREBALL_COLLISION) {   //WRONG: I think collision particles should be redder, like dull ember sparks.
        var randomVX,
        randomVY;
        if (Math.random() < 0.5) {
            randomVX = -(Math.random() * 5);
        } else {
            randomVX = Math.random() * 5;
        }
        if (Math.random() < 0.5) {
            randomVY = -(Math.random() * 3);
        } else {
            randomVY = Math.random() * 3;
        }
        particle.vx = randomVX;
        particle.vy = randomVY + 2;
        localSprites.push(particle);
    }
}

function addParticleAtLocation(x, y, decayFrames, parentPreScalingXSize, parentPreScalingYSize, type) {
    var hitBox = new Rectangle(0, 0, 8, 8);
    var frames = [
        $.extend(new Rectangle(0, 0, 8, 8), {image: fireballContrailAImage, hitBox}),
    ];
    var particle = new SimpleSprite({frames}, x, y, 0, 0, 1.25, 2.5);
    particle.type = type;
    particle.framesToLive = decayFrames;
    particle.flying = true;
    particle.scaleOscillation = true;
    particle.xScalePerFrame = particle.xScale / particle.framesToLive;
    particle.yScalePerFrame = particle.yScale / particle.framesToLive;
    particle.xScaleMin = 0;
    particle.yScaleMin = 0;
    particle.rotationPerFrame = 50;
    //particle.msBetweenFrames = Math.round((decayFrames * 50 /*or framerate*/) / frames.length) + 1; //'+1' hopefully keeps the animation from starting to loop just before the pariticle dies.  //would be better to also have a continuous alpha fade happen during this time. Could also scale down if that weren't build into the animation frames already.
    //parent.contrailParticles.push(particle);
    if (particle.type === PARTICLE_TYPE_FIREBALL_CONTRAIL) {
        particle.vy = -3;
        localSprites.push(particle); //WRONG: Should push to parent.contrailParticles, but then render.js should render things in that array. I don't know the syntax for that yet, I don't think.
    }
    if (particle.type === PARTICLE_TYPE_FIREBALL_COLLISION) {   //WRONG: I think collision particles should be redder, like dull ember sparks.
        var randomVX,
        randomVY;
        if (Math.random() < 0.5) {
            randomVX = -(Math.random() * 5);
        } else {
            randomVX = Math.random() * 5;
        }
        if (Math.random() < 0.5) {
            randomVY = -(Math.random() * 3);
        } else {
            randomVY = Math.random() * 3;
        }
        particle.vx = randomVX;
        particle.vy = randomVY + 2;
        localSprites.push(particle);
    }
    if (particle.type === PARTICLE_TYPE_BEAM_IMPACT) {   //WRONG: Beam impact particles should bounce away from the surface they impact
        var randomVX,
        randomVY;
        if (Math.random() < 0.5) {
            randomVX = -(Math.random() * 5);
        } else {
            randomVX = Math.random() * 5;
        }
        if (Math.random() < 0.5) {
            randomVY = -(Math.random() * 3);
        } else {
            randomVY = Math.random() * 3;
        }
        particle.vx = randomVX;
        particle.vy = randomVY - 5;
        particle.flying = false;
        localSprites.push(particle);
    }
}

function addFireballDetonation(parent, numberOfFragments, parentPreScalingXSize, parentPreScalingYSize) {
    for (var i = 0; i < numberOfFragments; i++) {
        addParticle(parent, 30, parentPreScalingXSize, parentPreScalingYSize, PARTICLE_TYPE_FIREBALL_COLLISION);
    }
}

function getBeamImpactSparks(x, y, numberOfFragments, parentPreScalingXSize, parentPreScalingYSize) {
    for (var i = 0; i < numberOfFragments; i++) {
        addParticleAtLocation(x, y, 30, parentPreScalingXSize, parentPreScalingYSize, PARTICLE_TYPE_BEAM_IMPACT);
    }
}


function isCharacterInsideRadius(radiusOriginX, radiusOriginY, radiusMagnitude, character) { // note: this checks the center of the character, not anywhere in its hibox
    var distanceBetweenRadiusOriginAndCharacterCenterX = Math.abs((getGlobalSpriteHitBox(character).left + (getGlobalSpriteHitBox(character).width / 2)) - radiusOriginX),
        distanceBetweenRadiusOriginAndCharacterCenterY = Math.abs((getGlobalSpriteHitBox(character).top + (getGlobalSpriteHitBox(character).height / 2)) - radiusOriginY),
        distanceBetweenRadiusOriginAndCharacterCenter = Math.sqrt(
            (distanceBetweenRadiusOriginAndCharacterCenterX * distanceBetweenRadiusOriginAndCharacterCenterX) +
            (distanceBetweenRadiusOriginAndCharacterCenterY * distanceBetweenRadiusOriginAndCharacterCenterY)
        );
        if (distanceBetweenRadiusOriginAndCharacterCenter <= radiusMagnitude) return true;
        else return false;
}

function isObjectCollidingWithNonInvulnerableTarget(object, target) {
    var invulnerableTime,
        invulnerableState;
        if (target.invulnerableUntil) invulnerableTime = target.invulnerableUntil > now();
        else invulnerableTime = false;
        if (target.invulnerable) invulnerableState = target.invulnerable;
        else invulnerableState = false;
    return getGlobalSpriteHitBox(object).overlapsRectangle(getGlobalSpriteHitBox(target)) && !invulnerableTime && !invulnerableState;
}
