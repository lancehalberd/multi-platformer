
var mainCanvas = $('.js-mainCanvas')[0];
var mainContext = mainCanvas.getContext('2d');
mainContext.imageSmoothingEnabled = false;
var bufferCanvas = createCanvas(mainCanvas.width, mainCanvas.height);
var bufferContext = bufferCanvas.getContext('2d');

var render = () => {
    try {
    if (!gameHasBeenInitialized || !currentMap) {
        window.requestAnimationFrame(render);
        return;
    }

    //var bgSourceRectangle = new Rectangle(0, 0, 1920, 1080);
    var bgSourceRectangle = new Rectangle(0, 0, 800, 608);    
    var target = bgSourceRectangle.scale(1.2);
    var xPercent = (cameraX / (Math.max(areaRectangle.width, target.width) - mainCanvas.width)) || 0;
    if (areaRectangle.width < mainCanvas.width) xPercent = 0;
    var yPercent = (cameraY / (Math.max(areaRectangle.height, target.height) - mainCanvas.height)) || 0;
    if (areaRectangle.height < mainCanvas.height) yPercent = 0;
    target = target.moveTo(- xPercent * (target.width - mainCanvas.width), - yPercent * (target.height - mainCanvas.height));

    var taggedPlayer = TagGame.getTaggedPlayer();
    draw.fillRectangle(mainContext, new Rectangle(0, 0, mainCanvas.width, mainCanvas.height), 0);
    //if (taggedPlayer) {
    //    draw.tintedImage(mainContext, requireImage('/gfx/backgrounds/yellowMountains.png'), taggedPlayer.color, .5, bgSourceRectangle, target)
    //} else {
//    draw.image(mainContext, requireImage('/gfx/backgrounds/yellowMountains.png'), bgSourceRectangle, target);
    draw.image(mainContext, requireImage('/gfx/backgrounds/desertBackgroundA.png'), bgSourceRectangle, target);
    //}

    drawMap();
    mainContext.save();
    mainContext.translate(Math.round(-cameraX), Math.round(-cameraY));
    // Update all the sprites that the game keeps track of
    for (var sprite of
        [
            // All the characters from other clients.
            ...Object.values(otherCharacters),
            // The main character for the client is drawn after the other characters
            // so that it will always appear in front of them.
            mainCharacter,
            // Other sprite objects like fireballs, particles, explosions and triggers.
            ...localSprites,
        ]
    ) {
        sprite.render(sprite);
    }
    mainContext.restore();
    if (isEditing) {
        renderEditor();
        window.requestAnimationFrame(render);
        return;
    }

    // Draw HUD elements here like the life display for the main character.
    mainContext.save();
    mainContext.translate(10, 10);
    var heartImage = requireImage('/gfx/heart.png');
    var heartRectangle = new Rectangle(0, 0, 50, 50);
    for (var i = 0; i < mainCharacter.maxHealth; i++) {
        if (i < mainCharacter.health) draw.image(mainContext, heartImage, heartRectangle, heartRectangle);
        else draw.solidTintedImage(mainContext, heartImage, '#444', heartRectangle, heartRectangle);
        mainContext.translate(60, 0);
    }
    mainContext.restore();

    TagGame.render();

    // Considering calculating hit box from the animation. But do I want to worry about rotation with this?
    /*var frame = mainCharacter.walkingAnimation.frames[0];
    var hitBox = frame.hitBox;
    hitBox = rectangle(mainCharacter.x - frame.width / 2 + hitBox.left)*/

    // Draw a rectangle where we expect the sprite to be displayed for the main character.
    // draw.fillRectangle(mainContext, rectangle(mainCharacter.x - 2, mainCharacter.y - 2, 4, 4), 'white');



    window.requestAnimationFrame(render);
    } catch (e) {
        console.log(e);
        debugger;
    }
};
var drawMap = () => {
    var topRow = Math.floor(cameraY / currentMap.tileSize);
    var bottomRow = Math.ceil((cameraY + mainCanvas.height) / currentMap.tileSize);
    var leftColumn = Math.floor(cameraX / currentMap.tileSize);
    var rightColumn = Math.ceil((cameraX + mainCanvas.width) / currentMap.tileSize);
    mainContext.save();
    mainContext.translate(Math.round(-cameraX), Math.round(-cameraY));
    mainContext.translate(0, currentMap.tileSize * topRow + currentMap.tileSize / 2);
    for (var row = topRow; row < bottomRow; row++) {
        if (!currentMap.composite[row]) {
            mainContext.translate(0, currentMap.tileSize);
            continue;
        }
        mainContext.save();
        mainContext.translate(currentMap.tileSize * leftColumn + currentMap.tileSize / 2, 0);
        for (var col = leftColumn; col < rightColumn; col++) {
            var tile = currentMap.uniqueTiles[currentMap.composite[row][col]];
            if (tile) {
                var image = requireImage(tile.image);
                mainContext.save();
                mainContext.scale(tile.xScale, tile.yScale);
                draw.image(mainContext, image,
                    new Rectangle(tile.x, tile.y, 1, 1).scale(tile.size),
                    new Rectangle(-1 / 2, -1 / 2, 1, 1).scale(currentMap.tileSize)
                );
                mainContext.restore();
            }
            mainContext.translate(currentMap.tileSize, 0);
        }
        mainContext.restore();
        mainContext.translate(0, currentMap.tileSize);
    }
    mainContext.restore();
}
render();
