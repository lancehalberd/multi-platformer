var assetVersion = ifdefor(assetVersion, '0.4');
var images = {};
function loadImage(source, callback) {
    images[source] = new Image();
    images[source].onload = () => callback();
    images[source].src = source + '?v=' + assetVersion;
    return images[source];
}
var numberOfImagesLeftToLoad = 0;
function requireImage(imageFile) {
    if (images[imageFile]) return images[imageFile];
    numberOfImagesLeftToLoad++;
    return loadImage(imageFile, () => numberOfImagesLeftToLoad--);
}
var initialImagesToLoad = [
    // Original images from project contributors:
    '/gfx/person/personSprite.png', '/gfx/person/monsterPeople.png', '/gfx/person/hair.png', '/gfx/person/equipment.png', '/gfx/person/weapons.png',
    '/gfx/backgrounds/yellowMountains.png'
];
for (var initialImageToLoad of initialImagesToLoad) {
    requireImage(initialImageToLoad);
}


