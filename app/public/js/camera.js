/**
 * Usage:
 * queueCameraTarget({x: 600, y: 300, maxSpeed: 4});
 * queueCameraTarget({x: 600, y: 200, maxSpeed: 1});
 * queueCameraTarget({x: 200, y: 200, maxSpeed: 5});
 */
var cameraX = 0, cameraY = 0, cameraVx = 0, cameraVy = 0, cameraAcceleration = 0.1, cameraFriction = 0.96, cameraMaxSpeed = 2, cameraTarget;
var cameraTargetQueue = [];

var setCameraTarget = ({x, y, maxSpeed, accelertion}) => {
    cameraTarget = {x, y};
    cameraMaxSpeed = maxSpeed || cameraMaxSpeed;
    cameraAcceleration = accelertion || cameraAcceleration;
};

var clearCameraTarget = () => {
    cameraTarget = null;
};

var queueCameraTarget = (target) => {
    if (!cameraTarget) {
        setCameraTarget(target);
    } else {
        cameraTargetQueue.push(target);
    }
}

var cameraReachedTarget = () => {
    if (cameraTargetQueue.length) {
        setCameraTarget(cameraTargetQueue.shift());
    } else {
        clearCameraTarget();
    }
};

var updateCamera = () => {
    if (cameraTarget) {
        // If a target is set, accelerate towards it.
        var dy = cameraTarget.y - cameraY;
        var dx = cameraTarget.x - cameraX;
        var mag = Math.sqrt(dx * dx + dy * dy);
        cameraVx += cameraAcceleration * dx / mag;
        cameraVy += cameraAcceleration * dy / mag;
        cameraVx *= cameraFriction;
        cameraVy *= cameraFriction;
        mag = Math.sqrt(cameraVx * cameraVx + cameraVy * cameraVy);
        var max = cameraMaxSpeed * cameraVx / mag;
        if (Math.abs(cameraVx) > Math.abs(max)) cameraVx = max;
        max = cameraMaxSpeed * cameraVy / mag;
        if (Math.abs(cameraVy) > Math.abs(max)) cameraVy = max;

        cameraX += cameraVx;
        cameraY += cameraVy;

        dx = cameraX - cameraTarget.x;
        dy = cameraY - cameraTarget.y;

        if (dx * dx + dy * dy <= cameraMaxSpeed * cameraMaxSpeed * 2) {
            cameraReachedTarget();
        }
        return;
    } else {
        // By default, follow the player's movement with some easing if they get too close to the edge of the screen.
        if (cameraX + 800 < mainCharacter.x + 300) cameraX = (cameraX + mainCharacter.x - 500) / 2;
        if (cameraX > mainCharacter.x - 300) cameraX = (cameraX + (mainCharacter.x - 300)) / 2;
        if (cameraY + 600 < mainCharacter.y + 300) cameraY = (cameraY + mainCharacter.y - 300) / 2;
        if (cameraY > mainCharacter.y - 300) cameraY = (cameraY + (mainCharacter.y - 300)) / 2;
    }

    // Confine the camera to the edges of the map.
    boundCameraToMap();
}

var centerCameraOnPlayer = () => {
    cameraX = mainCharacter.x - 400;
    cameraY = mainCharacter.y - 300;
    boundCameraToMap();
};

var boundCameraToMap = () => {
    if (!currentMap) return;
    areaRectangle = new Rectangle(0, 0, currentMap.width, currentMap.height).scale(currentMap.tileSize);
    // Normally we don't let the camera go past the edges of the map, but when the map is too
    // short or narrow to do this, we center the map vertically/horizontally.
    if (areaRectangle.width >= mainCanvas.width) {
        cameraX = Math.max(0, Math.min(areaRectangle.width - mainCanvas.width, cameraX));
    } else {
        cameraX = -(mainCanvas.width - areaRectangle.width) / 2;
    }
    if (areaRectangle.height >= mainCanvas.height) {
        cameraY = Math.max(0, Math.min(areaRectangle.height - mainCanvas.height, cameraY));
    } else {
        cameraY = -(mainCanvas.height - areaRectangle.height) / 2;
    }
};