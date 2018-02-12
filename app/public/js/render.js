
var mainCanvas = $('.js-mainCanvas')[0];
var mainContext = mainCanvas.getContext('2d');
mainContext.imageSmoothingEnabled = false;
var bufferCanvas = createCanvas(mainCanvas.width, mainCanvas.height);
var bufferContext = bufferCanvas.getContext('2d');

/////////////////
// lighting

var pointLights = [];

var lightingPixelsPerRow = 100,
	lightingPixelsPerColumn = Math.round(
		mainCanvas.height / mainCanvas.width * lightingPixelsPerRow
	), // WRONG shouldn't stretch things because we get a half-cell
	lightingPixelsPerGrid = lightingPixelsPerRow * lightingPixelsPerColumn,
	lightingScaledPixelSize = mainCanvas.width / lightingPixelsPerRow, // WRONG not quite right if we're stretching cells vertically to avoid half-cells
    lightingCanvas = $(`<canvas width="${lightingPixelsPerRow}" height="${lightingPixelsPerColumn}" />`)[0],
    lightingContext = lightingCanvas.getContext('2d'),
    lightingData = lightingContext.createImageData(lightingPixelsPerRow, lightingPixelsPerColumn),
	lightingPixelArray = lightingData.data,
    lightingCanvas = document.createElement('canvas'),
    lightingContext = lightingCanvas.getContext('2d'),
    pointLights = [];

lightingCanvas.width = lightingPixelsPerRow;
lightingCanvas.height = lightingPixelsPerColumn;
    
// distance lookup tables
// access distances like: lightingDistanceFromIndexToIndex[indexA][indexB], or,
//		for distance between coordinates, with accuracy at a resolution equal to that of the lighting array, like:
// 		lightingDistanceFromIndexToIndex[lightingIndexOfCoordinates[xA][yA]][lightingIndexOfCoordinates[xB][yB]],
//      in which case MAKE SURE TO SEND POSITIVE INTEGERS--you are just sending, in the end, array indicies.
var lightingDistanceFromIndexToIndex = [],
	lightingXDistanceFromIndexToIndex = [],
	lightingYDistanceFromIndexToIndex = [],
	lightingIndexOfCoordinates = [],
	lightingCoordinatesOfIndex = [];

// fills out distance lookup tables,
// 		and a lookup table to convert integer coordinates into lighting array indices
function initializeLighting() {
	lightingInitializeXDistancesFromIndexToIndex();
	lightingInitializeYDistancesFromIndexToIndex();
	lightingInitializeDistancesFromIndexToIndex();
	lightingInitializeIndexOfCoordinates();
	lightingInitializeCoordinatesOfIndex();
}
	
function lightingInitializeIndexOfCoordinates() {
	for (var i = 0; i < mainCanvas.width; i++) {
		lightingIndexOfCoordinates.push([]);
		for (var j = 0; j < mainCanvas.height; j++) {
			lightingIndexOfCoordinates[i].push(
				Math.round(
					i / mainCanvas.height * (lightingPixelsPerRow - 1) +
					Math.floor(j / mainCanvas.height * lightingPixelsPerColumn) * lightingPixelsPerRow
				)
			);
		}
	}
}

function lightingInitializeCoordinatesOfIndex() {
	for (var i = 0; i < lightingPixelsPerGrid; i++) {
		lightingCoordinatesOfIndex.push({
			'x': i % lightingPixelsPerRow * lightingScaledPixelSize + 0.5 * lightingScaledPixelSize,
			'y': Math.floor(i / lightingPixelsPerRow) * lightingScaledPixelSize + 0.5 * lightingScaledPixelSize
		});
	}
}

function lightingInitializeXDistancesFromIndexToIndex() {
	for (var i = 0; i < lightingPixelsPerGrid; i++) {
		lightingXDistanceFromIndexToIndex.push([]);
		for (var j = 0; j < lightingPixelsPerGrid; j++) {
			lightingXDistanceFromIndexToIndex[i].push(
				j % lightingPixelsPerRow - i % lightingPixelsPerRow
			);
		}
	}
}

function lightingInitializeYDistancesFromIndexToIndex() {
	for (var i = 0; i < lightingPixelsPerGrid; i++) {
		lightingYDistanceFromIndexToIndex.push([]);
		for (var j = 0; j < lightingPixelsPerGrid; j++) {
			lightingYDistanceFromIndexToIndex[i].push(
				(j - j % lightingPixelsPerRow) / lightingPixelsPerRow - (i - i % lightingPixelsPerRow) / lightingPixelsPerRow
			);
		}
	}
}

function lightingInitializeDistancesFromIndexToIndex() {
	for (var i = 0; i < lightingPixelsPerGrid; i++) {
		lightingDistanceFromIndexToIndex.push([]);
		for (var j = 0; j < lightingPixelsPerGrid; j++) {
			lightingDistanceFromIndexToIndex[i].push(
				Math.sqrt(
				    lightingXDistanceFromIndexToIndex[i][j] * lightingXDistanceFromIndexToIndex[i][j] +
					lightingYDistanceFromIndexToIndex[i][j] * lightingYDistanceFromIndexToIndex[i][j]
				)
			);
		}
	}
}

initializeLighting();
function removeFinishedPointLights() {
    // This just gets rid of all the point lights that have shouldBeRemoved set to true on them.
    // For now, this will work with point lights that are localSprites.
    pointLights = pointLights.filter(pointLight => !pointLight.shouldBeRemoved);
}

function renderLighting() {
    removeFinishedPointLights();
    //lightingContext.clearRect(0, 0, lightingCanvas.width, lightingCanvas.height); // Is this necessary? If we used a fadeout/decay effect and '+=' at the end (when the actual pixel values are affected) instead of '=' like I do in my "pure sim," we might get more interesting effects, like afterimages and flickering.
	for (var i = 0; i < lightingPixelsPerGrid; i++) { // for each pixel in the lighting grid
		// brightness decay
		// WRONG: eventually this will need to decay toward the precalculated lightmap values, instead of toward 0
		for (var pc = 0; pc < 4; pc++) { // 'pc' means 'pixel channel'
			lightingPixelArray[i * 4 + pc] *= 0.88;
		}
		var r = 0,
			g = 0,
			b = 0,
			a = 0;
		// pointLights
		/*if (pointLights.length > 0) { // if there are point lights active
				for (var j = 0; j < pointLights.length; j++) { // for each point light
					var lightX = pointLights[j].x,
						lightY = pointLights[j].y;
					// rounding light coordinates, which is necessary for using the distance lookup tables
					// avoiding Math.round() function calls:
					// maybe there's a more elegant way to do this.
					if (lightX % 1 >= 0.5) lightX += 1 - lightX % 1;
					if (lightX % 1 < 0.5 && lightX % 1 > -0.5) lightX -= lightX % 1;
					if (lightX % 1 <= -0.5) lightX -= 1 + lightX % 1;
					if (lightY % 1 >= 0.5) lightY += 1 - lightY % 1;
					if (lightY % 1 < 0.5 && lightY % 1 > -0.5) lightY -= lightY % 1;
					if (lightY % 1 <= -0.5) lightY -= 1 + lightY % 1;
					if (frameCounter % 15 === 0 && j === 0 && i === 0) {
						console.log(
							
						);
					}
					r = 0;
					g = 0;
					b = 0;
					a = 0;
					// WRONG: Should express these values as proportions of the first so that all this calculation doesn't have to happen repeatedly.
					//      The speed gain might not be worth it, but it's really important that the lighting be efficient, so maybe it really is worth it.
					// WRONG: eventually I'll transplant my neighborsOfIndexInRadius[][] array in from my pixel project and we can set
					//		a limited radius to which cells a point light affects.
					r += 768 / lightingDistanceFromIndexToIndex[i][lightingIndexOfCoordinates[lightX][lightY]];
					g += 384 / lightingDistanceFromIndexToIndex[i][lightingIndexOfCoordinates[lightX][lightY]];
					b += 64;//384 / lightingDistanceFromIndexToIndex[i][lightingIndexOfCoordinates[light.x][light.y]];
					a += 128 / lightingDistanceFromIndexToIndex[i][lightingIndexOfCoordinates[lightX][lightY]];
				}
			}*/
		// sun point light
		var sun = {x: 500, y: 150};
		r += 768 / lightingDistanceFromIndexToIndex[i][lightingIndexOfCoordinates[sun.x][sun.y]];
		g += 384 / lightingDistanceFromIndexToIndex[i][lightingIndexOfCoordinates[sun.x][sun.y]];
		b += 64;//384 / lightingDistanceFromIndexToIndex[i][lightingIndexOfCoordinates[light.x][light.y]];
		a += 128 / lightingDistanceFromIndexToIndex[i][lightingIndexOfCoordinates[sun.x][sun.y]];
		
		// haze
		var maxHaze = mainCanvas.height - lightingCoordinatesOfIndex[i].y;
		if (maxHaze > 80) maxHaze = 80;
		if (maxHaze < 10) maxHaze = 10;
		r += 128 / maxHaze;
		g += 128 / maxHaze;
		b += 64 / maxHaze;
		a += 128 / maxHaze;
		
		// logging
		if (frameCounter % 15 === 0 && i === 0) {
			console.log(
				
			);
		}

		// for each pixel, add the sum of all dynamic lighting this frame
		lightingPixelArray[i * 4 + 0] += r;
		lightingPixelArray[i * 4 + 1] += g;
		lightingPixelArray[i * 4 + 2] += b;
		lightingPixelArray[i * 4 + 3] += a;
	}
	// draw pixelArray
    lightingContext.putImageData(lightingData, 0, 0);
    // turn on antialiasing just for the lighting grid
    mainContext.imageSmoothingEnabled = true;
    // scale pixelArray up to canvas size
    mainContext.drawImage(lightingCanvas, 0, 0, lightingCanvas.width, lightingCanvas.height, 0, 0, mainCanvas.width, mainCanvas.height);
    // turning off antialiasing for everything else
    mainContext.imageSmoothingEnabled = false;
}
// end lighting
///////////////////

var render = () => {
    //countFps(5, 30, FPSRENDER); // just comment this in for an FPS display in the console.
    try {
    if (!gameHasBeenInitialized || !currentMap) {
        window.requestAnimationFrame(render);
        return;
    }

    //var bgSourceRectangle = new Rectangle(0, 0, 1920, 1080);
    var bgSourceRectangle = new Rectangle(0, 0, 800, 608);
    var target = bgSourceRectangle.scale(1.2); // used to be 0.6 when the background pic was yellowMountains.png
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

    if (mainCharacter.changingZones) {
        mainContext.save();
        mainContext.globalAlpha = (now() - mainCharacter.changingZones) / 500;
        draw.fillRectangle(mainContext, new Rectangle(0, 0, mainCanvas.width, mainCanvas.height), 0);
        mainContext.restore();
    }

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
    renderLighting();
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
