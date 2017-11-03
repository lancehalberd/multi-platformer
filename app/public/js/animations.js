// We define a bunch of animations globally here that are used in various places.
// If an animation is only needed in one place, it can be defined locally, but
// we should move animations here that get reused.
var fireballContrailAImage = requireImage('/gfx/fireball/fireballContrailA.png'),
    creatureAdorabilisImage = requireImage('/gfx/creatures/creatureAdorabilis.png'),
    effectJumpDustImage = requireImage('/gfx/effects/effectJumpDust.png'),
    effectRunDustImage = requireImage('/gfx/effects/effectRunDust.png');

// This needs to be defined near the top of this file since several other animations reference it.
var fireballAnimation = {frames: rectangleToFrames(new Rectangle(0, 0, 32, 32), requireImage('/gfx/fireball/fireballB.png'), 5)};

// Teleporter Trigger animations.
var allTeleporterFrames = rectangleToFrames(new Rectangle(0, 0, 32, 32), requireImage('/gfx/environment/teleporterA.png'), 24);
var portalAnimation = {frames: allTeleporterFrames.slice(0, 9)};
var sparkleAnimation = {frames: allTeleporterFrames.slice(9, 24)};

// Mystery Character animations.
var allMysteryFrames = rectangleToFrames(new Rectangle(0, 0, 32, 32), requireImage('/gfx/person/characterMystery.png'), 8)
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
