var express = require(`express`);
var path = require(`path`);
var bodyParser = require(`body-parser`);
var WebSocketServer = require('websocket').server;
var crypto = require('crypto');
var mustache = require('mustache');
var _ = require('lodash');
var fs = require('fs');

var colors = ['red', 'blue', 'yellow', 'green', 'purple', 'white', 'grey', 'orange', 'brown'];


var makeEmptyMap = require('./src/map.js');
var tiles = require('./app/public/js/tiles.js');

var app = express();
// needed for heroku to work right
var PORT = process.env.PORT || 3000;

// All dynamic routes need to be added before any static routes.

function sendResponse(response, responseString) {
    response.set("Connection", "close");
    response.write(responseString);
    response.end();
}

var lastActiveZoneId = 'main';

// This route creates the index page from views/index.js and templates/index.mustache.
app.get('/', (request, response, next) => {
    var indexView = require('./app/views/index.js');
    var markup = mustache.render(indexView.getTemplate(), indexView.getMustacheData(lastActiveZoneId));
    sendResponse(response, markup);
});

app.get('/zones', (request, response, next) => {
    var listZonesView = require('./app/views/listZones.js');
    var markup = mustache.render(listZonesView.getTemplate(), listZonesView.getMustacheData());
    sendResponse(response, markup);
});

var zonesInMemory = {};

var writeZoneToFile = (zoneId, map) => {
    if (!fs.existsSync('data')) fs.mkdirSync('data','0777', true);
    if (!fs.existsSync('data/zones')) fs.mkdirSync('data/zones','0777', true);
    // Make sure we can't just write files infinitely to the disk.
    var files = fs.readdirSync('data/zones');
    if (files.length > 100) {
        return;
    }
    fs.writeFile(`data/zones/${zoneId}.json`, JSON.stringify(map), function(err) {
        if(err) {
            return console.log(err);
        }
    });
};

var readZoneFromFile = (zoneId, width, height) => {
    if (!fs.existsSync(`data/zones/${zoneId}.json`)) {
        return makeEmptyMap(width, height);
    }
    var map = JSON.parse(fs.readFileSync(`data/zones/${zoneId}.json`).toString());
    // Old map files just stored the grid
    if (!map.composite) {
        return {
            entities: [],
            tileSize: 32,
            width: map[0].length,
            height: map.length,
            composite: map
        };
    } else {
        // New map files store all map data.
        return map;
    }
}

// Every ten seconds, write all updated files to disk and mark them as not updated.
setInterval(() => {
    for (var zoneId in zonesInMemory) {
        var map = zonesInMemory[zoneId]
        if (map.isDirty) {
            writeZoneToFile(zoneId, map);
            map.isDirty = false;
        }
    }
}, 10000);

var getZone = (zoneId, width, height) => {
    if (!zonesInMemory[zoneId]) {
        zonesInMemory[zoneId] = readZoneFromFile(zoneId, width, height);
        zonesInMemory[zoneId].id = zoneId;
        // Remove zones once we hit 20. This may remove an active zone,
        // but active zones will be reloaded so only the inactive ones
        // will stay culled. This obviously won't work well if more
        // than 20 zones are active at once.
        var allLoadedIds = Object.keys(zonesInMemory);
        while (allLoadedIds.length > 20) {
            var idToRemove = allLoadedIds.shift();
            var map = zonesInMemory[idToRemove];
            // Write zone to file before deleting it from memory.
            if (map.isDirty) {
                writeZoneToFile(idToRemove, map);
            }
            delete zonesInMemory[idToRemove];
        }
    }
    return zonesInMemory[zoneId];
}

app.get('/zones/:zoneId', (request, response, next) => {
    var zoneId = request.params.zoneId;
    if (zoneId.length > 32) {
        return sendResponse(response, 'Zone Id must be less than 32 characters.');
    }
    // If w/h are specified the first time a map is requested, it will spawn with the given width+height.
    var width = parseInt(request.query.w);
    var height = parseInt(request.query.h);
    if (!isNaN(width) && !isNaN(height)) {
        var map = getZone(zoneId, width, height);
    }
    var indexView = require('./app/views/index.js');
    lastActiveZoneId = zoneId;
    var markup = mustache.render(indexView.getTemplate(), indexView.getMustacheData(zoneId));
    sendResponse(response, markup);
})

// local external files
app.use(express.static('app/public'));

// Sets up the Express app to handle data parsing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.text());
app.use(bodyParser.json({ type: "application/vnd.api+json" }));

// call routing code
// htmlRoutes.htmlRoutes(app, data);

// Starts the server to begin listening
// =============================================================
var server = app.listen(PORT, function() {
  console.log("App listening on PORT " + PORT);
});


wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}

// Maps privateId => publicId
var privateIdMap = {};
// Maps publicId => playerObject
var players = {};
// Maps privateId => web socket connection (used for broadcasting to all players).
var connections = {};

function broadcast(zoneId, data) {
    for (var id in connections) {
        // Only broadcast messages to players in the same zone.
        var player = players[privateIdMap[id]];
        if (player.zoneId !== zoneId) continue;
        connections[id].sendUTF(JSON.stringify(data));
    }
}

var updatePlayer = (playerId, playerData) => {
    for (var key in playerData) players[playerId][key] = playerData[key];
}

// We track which player is it on the server by setting 'taggedId' for that
// zone. The server only uses this to detect when the currently tagged player
// logs out so it can automatically mark another existing player as it.
var tagPlayer = (id) => {
    var player = players[id];
    if (player) getZone(player.zoneId).taggedId = id;
}

wsServer.on('request', function(request) {
    var privateId, publicId;
    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
    }

    var connection = request.accept(null, request.origin);
    // console.log((new Date()) + ' Connection accepted.');
    connection.on('message', function(message) {
        // We only handle utf8 encoded json messages.
        if (message.type !== 'utf8') return;
        // console.log('Received Message: ' + message.utf8Data);
        try {
            var data = JSON.parse(message.utf8Data);
        } catch (e) {
            connection.sendUTF(JSON.stringify({errorMessage: 'Could not parse json'}));
            return;
        }
        if (!data.privateId) {
            do {
                privateId = crypto.createHash('md5').update('' + Math.random()).digest("hex");
            } while (privateIdMap[privateId]);
            do {
                publicId = crypto.createHash('md5').update('' + Math.random()).digest("hex");
            } while (players[publicId]);
            privateIdMap[privateId] = publicId;
            var playersInZone = _.pickBy(players, player => player.zoneId === data.player.zoneId);
            var usedColors = _.values(playersInZone).map(player => player.color);

            players[publicId] = {
                id: publicId,
                name: data.player.name || 'Incognito' + publicId.substring(0, 6),
                skin: data.player.skin || 0,
                hair: data.player.hair || 0,
                weapon: data.player.weapon || 'sword',
                x: data.player.x || 200,
                y: data.player.y || 800,
                vx: data.player.vx || 0,
                vy: data.player.vy || 0,
                isCrouching: data.player.isCrouching || false,
                zoneId: data.player.zoneId,
                color: _.sample(_.difference(colors, usedColors)),
            };
            // console.log("Added player");
            // console.log(players);
            // When a player first logs in we send them their public/private ids and the full list of player data for the current zone.
            connection.sendUTF(JSON.stringify({
                privateId, publicId, color: players[publicId].color,
                players: playersInZone,
                map: getZone(data.player.zoneId)
            }));
            // Broadcast to all other players that the new player has joined.
            broadcast(data.player.zoneId, {playerJoined: players[publicId]});
            connections[privateId] = connection;
            return;
        }
        if (privateIdMap[data.privateId]) {
            privateId = data.privateId;
            publicId = privateIdMap[data.privateId];
            player = players[publicId];
            // If a new connection is opened for an existing player, close the
            // old connection and store the new one.
            if (connections[privateId] !== connection) {
                // Close the previous connection if it exists.
                if (connections[privateId]) connections[privateId].close();
                connections[privateId] = connection;
            }
            if (data.action === 'attack') {
                broadcast(player.zoneId, {playerAttacked: publicId});
                // console.log(`Player ${publicId} attacked`);
                return;
            }
            if (data.action === 'move') {
                updatePlayer(publicId, data.player);
                broadcast(player.zoneId, {player: players[publicId]});
                // console.log(`Player ${publicId} moved`);
                return;
            }
            var map = getZone(player.zoneId);
            if (data.action === 'updateTile') {
                tiles.applyTileToMap(map, data.tileData, data.position);
                broadcast(player.zoneId, {tileData: data.tileData, position: data.position});
                map.isDirty = true;
                return;
            }
            if (data.action === 'createMapObject') {
                tiles.applyObjectToMap(map, data.mapObject, data.position);
                broadcast(player.zoneId, {mapObject: data.mapObject, position: data.position});
                map.isDirty = true;
                return;
            }
            if (data.action === 'createEntity') {
                map.entities = map.entities || [];
                map.entities.push(data.entity);
                broadcast(player.zoneId, {createdEntity: data.entity});
                map.isDirty = true;
            }
            if (data.action === 'updateEntity') {
                var index = _.findIndex(map.entities, {id: data.entity.id});
                if (index >= 0) {
                    map.entities[index] = data.entity;
                    broadcast(player.zoneId, {updatedEntity: data.entity});
                } else {
                    // Tell the player that send this update that the object doesn't exist on the server.
                    connection.sendUTF(JSON.stringify({deletedEntityId: data.entity.id}));
                }
                map.isDirty = true;
            }
            if (data.action === 'deleteEntity') {
                // This returns the first index of entities that has an object that matches
                // all properties of data.entity. Note that it could have additional properties
                // so this isn't an exact match.
                var index = _.findIndex(map.entities, {id: data.entityId});
                if (index >= 0) map.entities.splice(index, 1);
                broadcast(player.zoneId, {deletedEntityId: data.entityId});
                map.isDirty = true;
            }
            if (data.action === 'entityOnCooldown') {
                broadcast(player.zoneId, {entityOnCooldown: data.entityId});
            }
            if (data.action === 'tagged') {
                tagPlayer(data.id);
                broadcast(player.zoneId, {tagged: data.id});
                return;
            }
            return;
        }
        connection.sendUTF(JSON.stringify({errorMessage: `Player id ${data.privateId} not found.`}));
    });
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
        // If the most recent connection for a private id closes, purge it from memory
        if (connections[privateId] === connection) {
            var player = players[publicId];
            delete connections[privateId];
            delete players[publicId];
            delete privateIdMap[privateId];
            console.log(`Player ${publicId} left`);
            // console.log(players);
            if (player) {
                var message = {playerLeft: publicId}
                // Tag a random player if the player who is it leaves and there are
                // still at least 2 players left in the zone.
                if (publicId === getZone(player.zoneId).taggedId) {
                    var playersInZone = _.filter(players, {zoneId: player.zoneId});
                    if (playersInZone.length > 1) {
                        var taggedPlayer = _.sample(playersInZone);
                        tagPlayer(taggedPlayer.id);
                        message.tagged = taggedPlayer.id;
                    }
                }
                broadcast(player.zoneId, message);
            }
        }
    });
});
