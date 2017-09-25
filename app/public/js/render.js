
var mainCanvas = $('.js-mainCanvas')[0];
var mainContext = mainCanvas.getContext('2d');
var bufferCanvas = createCanvas(mainCanvas.width, mainCanvas.height);
var bufferContext = bufferCanvas.getContext('2d');

var render = () => {
    try {
    if (!gameHasBeenInitialized) {
        window.requestAnimationFrame(render);
        return;
    }

    var xPercent = cameraX / (areaRectangle.width - mainCanvas.width);
    var yPercent = cameraY / (areaRectangle.height - mainCanvas.height);
    var target = rectangle(0, 0, 1920 * .6, 1080 *.6);
    target.left = - xPercent * (target.width - mainCanvas.width);
    target.top = - yPercent * (target.height - mainCanvas.height);
    //console.log(target.x);
    draw.image(mainContext, requireImage('gfx/backgrounds/yellowMountains.png'), rectangle(0, 0, 1920, 1080), target);

    mainContext.save();
    mainContext.translate(-cameraX, -cameraY);
    /*draw.fillRectangle(mainContext, rectangle(cameraX, groundY, mainCanvas.width, areaRectangle.height - groundY), '#403020');
    draw.fillRectangle(mainContext, rectangle(500 * Math.floor(cameraX / 500), groundY, 200, areaRectangle.height - groundY), '#504030');
    draw.fillRectangle(mainContext, rectangle(500 * Math.ceil(cameraX / 500), groundY, 200, areaRectangle.height - groundY), '#504030');
    draw.fillRectangle(mainContext, rectangle(500 * Math.ceil(cameraX / 500 + 1), groundY, 200, areaRectangle.height - groundY), '#504030');*/
    drawMap();
    for (var actor of [...otherCharacters, mainCharacter]) {
        /*draw.fillRectangle(mainContext, rectangle(
            actor.x + actor.hitBox.left,
            actor.y + actor.hitBox.top,
            actor.hitBox.width,
            actor.hitBox.height), 'red');*/
        drawSprite(mainContext, actor);
    }

    // Considering calculating hit box from the animation. But do I want to worry about rotation with this?
    /*var frame = mainCharacter.walkAnimation.frames[0];
    var hitBox = frame.hitBox;
    hitBox = rectangle(mainCharacter.x - frame.width / 2 + hitBox.left)*/

    // Draw a rectangle where we expect the sprite to be displayed for the main character.
    // draw.fillRectangle(mainContext, rectangle(mainCharacter.x - 2, mainCharacter.y - 2, 4, 4), 'white');
    mainContext.restore();


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
    for (var row = topRow; row < bottomRow; row++) {
        if (!currentMap.composite[row]) continue;
        for (var col = leftColumn; col < rightColumn; col++) {
            var tile = currentMap.composite[row][col];
            if (!tile) continue;
            draw.image(mainContext, tile.image,
                rectangle(tile.size * tile.x, tile.size * tile.y, tile.size, tile.size),
                rectangle(currentMap.tileSize * col, currentMap.tileSize * row, currentMap.tileSize, currentMap.tileSize)
            );
        }
    }
}
render();
