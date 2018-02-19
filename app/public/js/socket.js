
var privateId, publicId, connected = false;
// Create WebSocket connection.
socket = new WebSocket(`ws://${window.location.host}`);
// Connection opened
socket.addEventListener('open', event => connected = true);

// Listen for messages
socket.addEventListener('message', event => {
    // console.log('Message from server ', event.data);
    var data = JSON.parse(event.data);
    if (data.errorMessage) {
        console.log(new Error(data.errorMessage));
        return;
    }
    if (data.privateId) {
        privateId = data.privateId;
        publicId = data.publicId;
        mainCharacter.id = publicId;
        mainCharacter.color = data.color;
    }
    if (data.zoneId) {
        zoneId = data.zoneId;
        mainCharacter.zoneId = data.zoneId;
        $('.js-zoneSelect').val(zoneId);
    }
    // This will be returned when a player enters a zone, either on first connecting or changing zones.
    if (data.map) {
        selectedEntity = null;
        mainCharacter.checkPoint = null;
        mainCharacter.changingZones = false;
        currentMap = data.map;
        loadedZonesById[currentMap.id] = currentMap;
        if (currentMap.respawnPoint) {
            // This will only be used if a check point doesn't override it.
            mainCharacter.x = mainCharacter.originalX = currentMap.respawnPoint.x;
            mainCharacter.y = mainCharacter.originalY = currentMap.respawnPoint.y;
        } else {
            // This is the legacy default starting location, used if there is no respawnPoint
            // data on the map itself and no check points.
            mainCharacter.x = 200;
            mainCharacter.y = 800;
        }
        localSprites = [];
        var firstCheckPoint = null, selectedCheckPoint = null;
        // Create initial set of entities from the map definition.
        // Originally these just consisted of Triggers.
        for (var entityData of (currentMap.entities || [])) {
            var entity = unserializeEntity(entityData);
            localSprites.push(entity);
            if (!firstCheckPoint && entity instanceof CheckPoint) {
                firstCheckPoint = entity;
            }
            if (entity.id === data.checkPointId) {
                selectedCheckPoint = entity;
            }
        }
        // If the player entered at a specific check point that exists, start them there,
        // otherwise start them at the explicit target x/y coords if present,
        // otherwise start them at the first check point found,
        // otherwise they will default to the global spawn point for the map (set above).
        if (selectedCheckPoint) {
            mainCharacter.checkPoint = selectedCheckPoint;
            mainCharacter.x = selectedCheckPoint.x;
            mainCharacter.y = selectedCheckPoint.y;
        } else if(typeof(data.targetX) === 'number' && typeof(data.targetY) === 'number') {
            mainCharacter.x = mainCharacter.originalX = data.targetX;
            mainCharacter.y = mainCharacter.originalY = data.targetY;
        } else if (firstCheckPoint) {
            mainCharacter.checkPoint = firstCheckPoint;
            mainCharacter.x = firstCheckPoint.x;
            mainCharacter.y = firstCheckPoint.y;
        }
        if (!isEditing) centerCameraOnPlayer();
        else {
            mainPalette.updateBrushes(true);
            foreignPalette.updateBrushes(true);
        }
    }
    // This will be returned when a player enters a zone, either on first connecting or changing zones.
    if (data.players) {
        otherCharacters = {};
        for (var id in data.players) {
            if (id === publicId) continue;
            otherCharacters[id] = initializeTTCharacter(data.players[id]);
        }
    }
    // Don't process any messages from the server until we have the character data.
    if (!privateId) return;
    if (data.playerJoined && data.playerJoined.id !== publicId) {
        otherCharacters[data.playerJoined.id] = initializeTTCharacter(data.playerJoined);
    }
    if (data.playerLeft) {
        delete otherCharacters[data.playerLeft];
    }
    if (data.playerAttacked) {
        if (data.playerAttacked === publicId) return;
        otherCharacters[data.playerAttacked].attackTime = now();
        otherCharacters[data.playerAttacked].attacking = true;
    }
    if (data.player) {
        if (data.player.id === publicId) return;
        for (var i in data.player) {
            otherCharacters[data.player.id][i] = data.player[i];
        }
    }
    if (typeof(data.tileData) !== 'undefined') {
        applyTileToMap(currentMap, data.tileData, data.position);
        currentMap.isDirty = true;
    }
    if (data.updatedTile) {
        updateTilePalette(currentMap, data.oldKey, data.updatedTile);
        updateTilePropertiesPreview();
        // Check if we need to update the graphic for this tile
        var newKey = hashObject(data.updatedTile);
        var index = currentMap.hash[newKey];
        if (index && index < mainPalette.$tileBrushes.children().length) {
            var canvas = mainPalette.$tileBrushes.children()[index];
            updateBrushPreviewElement(canvas, currentBrush);
        }
        currentMap.isDirty = true;
    }
    if (data.newTile) {
        addTileToPalette(currentMap, data.newTile);
        currentMap.isDirty = true;
    }
    if (data.deletedUniqueTileIndex) {
        if (deleteTileFromPalette(currentMap, data.deletedUniqueTileIndex)) {
            // The local tile brushes don't check for missing brushes on update,
            // so explicitly remove the element for the delete brush when a
            // brush is deleted.
            mainPalette.$tileBrushes.children()[data.deletedUniqueTileIndex].remove();
            foreignPalette.updateBrushes(true);
            currentMap.isDirty = true;
        }
    }
    if (data.brushData) {
        // If the palette is updated, it will automatically be added to the UI
        // when the editor checks if the main palette has been updated.
        addBrushToPalette(currentMap, data.brushData);
        currentMap.isDirty = true;
    }
    if (data.deletedBrushIndex >= 0) {
        removeBrushFromPalette(currentMap, data.deletedBrushIndex);
        mainPalette.$specialBrushes.children()[data.deletedBrushIndex].remove();
        foreignPalette.updateBrushes(true);
        currentMap.isDirty = true;
    }
    if (data.mapObject) {
        applyObjectToMap(currentMap, data.mapObject, data.position);
        currentMap.isDirty = true;
    }
    if (data.createdEntity) {
        //console.log("created entity", data.createdEntity);
        var entity = unserializeEntity(data.createdEntity);
        localSprites.push(entity);
        // Change selected Trigger to the version we created from the server
        // rather than the locall created copy.
        if (selectedEntity && selectedEntity.id === entity.id) {
            selectedEntity = entity;
        }
        currentMap.isDirty = true;
    }
    if (data.deletedEntityId) {
        //console.log("deleted entity", data.deletedEntityId);
        var index = _.findIndex(localSprites, {id: data.deletedEntityId});
        if (index >= 0) {
            localSprites.splice(index, 1);
        } else {
            console.log(`Couldn't find entity to delete: ${data.deletedEntityId}`);
        }
        if (selectedEntity && selectedEntity.id === data.deletedEntityId) {
            selectedEntity = null;
        }
        currentMap.isDirty = true;
    }
    if (data.updatedEntity) {
        //console.log("updated entity", data.updatedEntity);
        var index = _.findIndex(localSprites, {id: data.updatedEntity.id});
        if (index >= 0 ) {
            localSprites[index] = unserializeEntity(data.updatedEntity);
        } else {
            console.log(`Couldn't find entity to update: ${data.updatedEntity.id}`);
        }
        if (selectedEntity && selectedEntity.id === data.updatedEntity.id) {
            selectedEntity = localSprites[index];
        }
        currentMap.isDirty = true;
    }
    if (data.entityOnCooldown) {
        var index = _.findIndex(localSprites, {id: data.entityOnCooldown});
        if (index >= 0 ) {
            localSprites[index].putOnCooldown();
        }
    }
    if (data.zone && isEditing) {
        loadedZonesById[data.zone.id] = data.zone;
        if (data.zone.id === $('.js-zoneSelectField select').val()) {
            updateLocationSelect();
        }
        if (data.zone.id === foreignPalette.zoneId) {
            foreignPalette.updateBrushes(true);
        }
    }
    if (data.savedMap) {
        currentMap.isDirty = false;
    }
    // Show the save button if the map has been updated.
    updateSaveButton();

    TagGame.handleServerData(data);
});
var loadedZonesById = {};
var getPlayerById = (id) => {
    if (id === publicId) return mainCharacter;
    return otherCharacters[id];
}
var currentMap = null;
var sendData = (data, force) => {
    // Unless force is set, don't send any messages until this client has received its private id.
    if (!force && !privateId) return;
    // We can't send message if the socket is open (either because this is too early, or maybe the connection broke)
    if (socket.readyState !== socket.OPEN) return;
    if (privateId) data.privateId = privateId;
    socket.send(JSON.stringify(data));
}
var serializePlayer = player => _.pick(player, ['x', 'y', 'vx', 'vy', 'isCrouching', 'hair', 'skin', 'weapon', 'zoneId', 'score', 'coins']);
var sendPlayerJoined = () => connected && sendData({action: 'join', player: serializePlayer(mainCharacter)}, true);
var sendPlayerMoved = () =>  sendData({action: 'move', player: _.omit(serializePlayer(mainCharacter), ['hair','skin'])});
var sendPlayerAttacked = () => sendData({action: 'attack'});
var sendTileUpdate = (tileData, position) => sendData({action: 'updateTile', tileData, position});
var sendMapObject = (mapObject, position) => sendData({action: 'createMapObject', mapObject, position});
var sendEntityOnCooldown = (entityId) => sendData({action: 'entityOnCooldown', entityId});
var sendCreateEntity = (entity) => {
    if (!privateId) return;
    // Set a unique entity id before sending it to the server. This will be used when updating/deleting this entity in the future.
    entity.id = getUniqueEntityId();
    sendData({privateId, action: 'createEntity', entity: serializeEntity(entity)});
};
var sendUpdateEntity = (entity) => sendData({action: 'updateEntity', entity: serializeEntity(entity)});
var sendDeleteEntity = (entityId) => sendData({action: 'deleteEntity', entityId});
var requestZoneData = (zoneId) => sendData({action: 'getZoneData', zoneId});

// Creates an entity id that is not currently in use and cannot be simultaneously created by another player.
// This second condition is enforced by using the current player's publicId as a prefix for this id.
var getUniqueEntityId = () => {
    var uniqueId;
    do {
        uniqueId = publicId + randomString(5);
    } while (_.find(localSprites, {id: uniqueId}));
    return uniqueId
}

function randomString(length) {
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split('');
    choices = [];
    while (choices.length < length) choices.push(_.sample(possible));
    return choices.join('');
}
