
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
        for (var id in data.players) {
            if (id === publicId) continue;
            otherCharacters[id] = initializeTTCharacter(data.players[id]);
        }
        currentMap = data.map;
        setItId(publicId);
        return;
    }
    if (data.playerJoined) {
        otherCharacters[data.playerJoined.id] = initializeTTCharacter(data.playerJoined);
        setItId(data.playerJoined.id);
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
        if (data.player.deathTime) delete otherCharacters[data.player.id].deathTime;
    }
    if (data.tagged) {
        setItId(data.tagged);
    }
    if (typeof(data.tileData) !== 'undefined') {
        applyTileToMap(currentMap, data.tileData, data.position);
    }
    if (data.mapObject) {
        applyObjectToMap(currentMap, data.mapObject, data.position);
    }
});
var setItId = (id) => {
    //console.log('was tagged', id);
    var allCharacters = $.extend({}, otherCharacters, {[publicId]: mainCharacter});
    for (var key in allCharacters) {
        var character = allCharacters[key];
        // Player who tagged someone cannot be tagged for 2 seconds.
        if (character.isIt) character.untaggableUntil = now() + 2000;
        character.isIt = (key === id);
        // Player who was tagged cannot move for 2 seconds.
        if (character.isIt) character.stuckUntil = now() + 2000;
    }
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
