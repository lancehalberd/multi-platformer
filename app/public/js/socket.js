
var privateId, publicId, connected = false;
var taggedId = null;
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
        // The new player is always tagged by default.
        setTaggedId(publicId);
        return;
    }
    // Don't process any messages from the server until we have the character data.
    if (!privateId) return;
    if (data.playerJoined) {
        otherCharacters[data.playerJoined.id] = initializeTTCharacter(data.playerJoined);
        setTaggedId(data.playerJoined.id);
    }
    if (data.playerLeft) {
        delete otherCharacters[data.playerLeft];
        if (_.isEmpty(otherCharacters)) {
            taggedId = null;
        }
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
    if (data.tagged) {
        setTaggedId(data.tagged);
    }
    if (typeof(data.tileData) !== 'undefined') {
        applyTileToMap(currentMap, data.tileData, data.position);
    }
    if (data.mapObject) {
        applyObjectToMap(currentMap, data.mapObject, data.position);
    }
});
var getPlayerById = (id) => {
    if (id === publicId) return mainCharacter;
    return otherCharacters[id];
}
var setTaggedId = (id) => {
    // Everyone gets full life when a new player is tagged.
    if (id !== taggedId) mainCharacter.health = mainCharacter.maxHealth;
    // No one should be tagged if only one player is present
    if (_.isEmpty(otherCharacters)) {
        taggedId = null;
        return;
    }
    // The player who tagged the other player cannot be tagged for 5 seconds.
    var currentlyTaggedPlayer = getPlayerById(taggedId);
    if (currentlyTaggedPlayer) currentlyTaggedPlayer.untaggableUntil = now() + 5000;
    // It is hard to keep 'stuck' players in sync, and maybe not necessary for the
    // game to work.
    // var newlyTaggedPlayer = getPlayerById(id);
    // if (newlyTaggedPlayer) newlyTaggedPlayer.stuckUntil = now() + 2000;
    taggedId = id;
}
var currentMap = null;
var sendData = data => socket.readyState === socket.OPEN && socket.send(JSON.stringify(data));
var serializePlayer = player => ({
    x: player.x, y: player.y, vx: player.vx, vy: player.vy, isCrouching: player.isCrouching,
    hair: player.hair, skin: player.skin, weapon: player.weapon,
    zoneId: player.zoneId,
});
var sendTaggedPlayer = (id) => {
    //console.log('tagging', id);
    privateId && sendData({privateId, action: 'tagged', id: id})
};
var sendPlayerJoined = () => connected && sendData({privateId, action: 'join', player: serializePlayer(mainCharacter)});
var sendPlayerMoved = () => privateId && sendData({privateId, action: 'move', player: _.omit(serializePlayer(mainCharacter), ['hair','skin'])});
var sendPlayerAttacked = () => privateId && sendData({privateId, action: 'attack'});
var sendTileUpdate = (tileData, position) => privateId && sendData({privateId, action: 'updateTile', tileData, position});
var sendMapObject = (mapObject, position) => privateId && sendData({privateId, action: 'createMapObject', mapObject, position});
