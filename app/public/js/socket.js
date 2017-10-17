
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
        return;
    }
    if (data.playerJoined) {
        otherCharacters[data.playerJoined.id] = initializeTTCharacter(data.playerJoined);
        return;
    }
    if (data.playerLeft) {
        delete otherCharacters[data.playerLeft];
        return;
    }
    if (data.playerAttacked) {
        if (data.playerAttacked === publicId) return;
        otherCharacters[data.playerAttacked].attackTime = now();
        otherCharacters[data.playerAttacked].attacking = true;
        return;
    }
    if (data.player) {
        if (data.player.id === publicId) return;
        for (var i in data.player) {
            otherCharacters[data.player.id][i] = data.player[i];
        }
        return;
    }
    if (typeof(data.tileData) !== 'undefined') {
        applyTileToMap(currentMap, data.tileData, data.position);
    }
    if (data.mapObject) {
        applyObjectToMap(currentMap, data.mapObject, data.position);
    }
});
var currentMap = null;
var sendData = data => socket.readyState === socket.OPEN && socket.send(JSON.stringify(data));
var serializePlayer = player => ({
    x: player.x, y: player.y, vx: player.vx, vy: player.vy, isCrouching: player.isCrouching,
    hair: player.hair, skin: player.skin, weapon: player.weapon,
    zoneId: player.zoneId,
});
var sendPlayerJoined = () => connected && sendData({privateId, action: 'join', player: serializePlayer(mainCharacter)});
var sendPlayerMoved = () => privateId && sendData({privateId, action: 'move', player: _.omit(serializePlayer(mainCharacter), ['hair','skin'])});
var sendPlayerAttacked = () => privateId && sendData({privateId, action: 'attack'});
var sendTileUpdate = (tileData, position) => privateId && sendData({privateId, action: 'updateTile', tileData, position});
var sendMapObject = (mapObject, position) => privateId && sendData({privateId, action: 'createMapObject', mapObject, position});
