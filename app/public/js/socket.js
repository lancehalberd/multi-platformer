
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
        for (var id in data.players) {
            if (id === publicId) continue;
            otherCharacters[id] = initializeTTCharacter(data.players[id]);
        }
        currentMap = data.map;
        if (currentMap.respawnPoint) {
            mainCharacter.x = mainCharacter.originalX = currentMap.respawnPoint.x;
            mainCharacter.y = mainCharacter.originalY = currentMap.respawnPoint.y;
        }
        // Create initial set of entities from the map definition.
        // Originally these just consisted of Triggers.
        for (var entityData of (currentMap.entities || [])) {
            var entity = unserializeEntity(entityData);
            localSprites.push(entity);
            if (!mainCharacter.checkPoint && entity instanceof CheckPoint) {
                mainCharacter.checkPoint = entity;
                mainCharacter.x = entity.x;
                mainCharacter.y = entity.y;
            }
        }
    }
    // Don't process any messages from the server until we have the character data.
    if (!privateId) return;
    if (data.playerJoined) {
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
    }
    if (data.mapObject) {
        applyObjectToMap(currentMap, data.mapObject, data.position);
    }
    if (data.createdEntity) {
        //console.log("created entity", data.createdEntity);
        var entity = unserializeEntity(data.createdEntity);
        localSprites.push(entity);
        // Change selected Trigger to the version we created from the server
        // rather than the locall created copy.
        if (selectedTrigger && selectedTrigger.id === entity.id) {
            selectedTrigger = entity;
        }
    }
    if (data.deletedEntityId) {
        //console.log("deleted entity", data.deletedEntityId);
        var index = _.findIndex(localSprites, {id: data.deletedEntityId});
        if (index >= 0) {
            localSprites.splice(index, 1);
        } else {
            console.log(`Couldn't find entity to delete: ${data.deletedEntityId}`);
        }
        if (selectedTrigger && selectedTrigger.id === data.deletedEntityId) {
            selectedTrigger = null;
        }
    }
    if (data.updatedEntity) {
        //console.log("updated entity", data.updatedEntity);
        var index = _.findIndex(localSprites, {id: data.updatedEntity.id});
        if (index >= 0 ) {
            localSprites[index] = unserializeEntity(data.updatedEntity);
        } else {
            console.log(`Couldn't find entity to update: ${data.updatedEntity.id}`);
        }
        if (selectedTrigger && selectedTrigger.id === data.updatedEntity.id) {
            selectedTrigger = localSprites[index];
        }
    }
    if (data.entityOnCooldown) {
        var index = _.findIndex(localSprites, {id: data.entityOnCooldown});
        if (index >= 0 ) {
            localSprites[index].putOnCooldown();
        }
    }

    TagGame.handleServerData(data);
});
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
var sendTileUpdate = (tileData, position) => sendData({privateId, action: 'updateTile', tileData, position});
var sendMapObject = (mapObject, position) => sendData({privateId, action: 'createMapObject', mapObject, position});
var sendEntityOnCooldown = (entityId) => sendData({privateId, action: 'entityOnCooldown', entityId});
var sendCreateEntity = (entity) => {
    if (!privateId) return;
    // Set a unique entity id before sending it to the server. This will be used when updating/deleting this entity in the future.
    entity.id = getUniqueEntityId();
    sendData({privateId, action: 'createEntity', entity: serializeEntity(entity)});
};
var sendUpdateEntity = (entity) => sendData({privateId, action: 'updateEntity', entity: serializeEntity(entity)});
var sendDeleteEntity = (entityId) => sendData({privateId, action: 'deleteEntity', entityId});

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
