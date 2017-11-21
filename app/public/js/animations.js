// We define a bunch of animations globally here that are used in various places.
// If an animation is only needed in one place, it can be defined locally, but
// we should move animations here that get reused.
var fireballContrailAImage = requireImage('/gfx/fireball/fireballContrailA.png'),
    creatureAdorabilisImage = requireImage('/gfx/creatures/creatureAdorabilis.png'),
    effectJumpDustImage = requireImage('/gfx/effects/effectJumpDust.png'),
    effectRunDustImage = requireImage('/gfx/effects/effectRunDust.png'),
	creatureHauntedMaskImage = requireImage('/gfx/creatures/creatureHauntedMask.png'),
	creatureWraithHoundImage = requireImage('/gfx/creatures/creatureWraithHound.png');

// This needs to be defined near the top of this file since several other animations reference it.
var fireballAnimation = {frames: rectangleToFrames(new Rectangle(0, 0, 32, 32), requireImage('/gfx/fireball/fireballB.png'), 5)};

// Teleporter Trigger animations.
var allTeleporterFrames = rectangleToFrames(new Rectangle(0, 0, 32, 32), requireImage('/gfx/environment/teleporterA.png'), 24);
var portalAnimation = {frames: allTeleporterFrames.slice(0, 9)};
var sparkleAnimation = {frames: allTeleporterFrames.slice(9, 24)};

// PLAYER CHARACTER ANIMATIONS

// Mystery Character animations.
var allMysteryFrames = rectangleToFrames(new Rectangle(0, 0, 32, 32), requireImage('/gfx/person/characterMystery.png'), 8);
var characterMysteryWalkAnimation = {frames: allMysteryFrames.slice(0, 4)};
var characterMysteryJumpAnimation = {frames: allMysteryFrames.slice(0, 1)};
var characterMysteryIdleAnimation = {frames: allMysteryFrames.slice(4, 8)};
var characterMysteryUncontrolledFallAnimation = fireballAnimation;
var characterMysteryAttackAnimation = fireballAnimation;


// Alien Character animations
var allAlienFrames = rectangleToFrames(new Rectangle(0, 0, 32, 36), requireImage('/gfx/person/characterAlien.png'), 9);
var characterAlienWalkAnimation = {frames: allAlienFrames};
var characterAlienIdleAnimation = sparkleAnimation;
var characterAlienJumpAnimation = {frames: allAlienFrames.slice(1, 2)};
var characterAlienUncontrolledFallAnimation = fireballAnimation;
var characterAlienAttackAnimation = fireballAnimation;


// CREATURE ANIMATIONS
// haunted mask animations
var allHauntedMaskFrames = rectangleToFrames(new Rectangle(0, 0, 56, 48), requireImage('/gfx/creatures/creatureHauntedMask.png'), 12);
var hauntedMaskAnimation = {frames: allHauntedMaskFrames.slice(0, 5)};
var hauntedMaskSmokePlume = {frames: allHauntedMaskFrames.slice(5, 11)};

// Get the current frame for a given set of frames assuming that it is looping at fps based on now().
var getAnimationFrame = (frames, fps) => frames[Math.floor(now() * fps / 1000) % frames.length];

// wraith hound animations
var allWraithHoundFrames = rectangleToFrames(new Rectangle(0, 0, 80, 48), requireImage('/gfx/creatures/creatureWraithHound.png'), 16);
var wraithHoundRunningAnimation = {frames: allWraithHoundFrames.slice(0, 8)};
var wraithHoundWalkingAnimation = {frames: allWraithHoundFrames.slice(0, 8)};
var wraithHoundJumpingAnimation = {frames: allWraithHoundFrames.slice(0, 8)};
var wraithHoundAirborneAnimation = {frames: allWraithHoundFrames.slice(0, 8)};
var wraithHoundKnockDownAnimation = {frames: allWraithHoundFrames.slice(0, 8)};
var wraithHoundGroundedAnimation = {frames: allWraithHoundFrames.slice(0, 8)};
var wraithHoundStandingUpAnimation = {frames: allWraithHoundFrames.slice(0, 8)};
var wraithHoundBarkingAnimation = {frames: allWraithHoundFrames.slice(0, 8)};
var wraithHoundSittingAnimation = {frames: allWraithHoundFrames.slice(0, 8)};
var wraithHoundAttackAnimation = {frames: allWraithHoundFrames.slice(0, 8)};
var wraithHoundRunningGhostTrailAnimation = {frames: allWraithHoundFrames.slice(8, 16)};
