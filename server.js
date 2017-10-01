var express = require(`express`);
var path = require(`path`);
var bodyParser = require(`body-parser`);
var WebSocketServer = require('websocket').server;
var crypto = require('crypto');
var mustache = require('mustache');


var app = express();
// needed for heroku to work right
var PORT = process.env.PORT || 3000;

// All dynamic routes need to be added before any static routes.

// This route creates the index page from views/index.js and templates/index.mustache.
app.get('/', (request, response, next) => {
    var indexView = require('./app/views/index.js');
    var mustacheData = indexView.getMustacheData();
    var markup = mustache.render(indexView.getTemplate(), indexView.getMustacheData());
    response.set("Connection", "close");
    response.write(markup);
    response.end();
});

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

function broadcast(data) {
    for (var id in connections) connections[id].sendUTF(JSON.stringify(data));
}

var updatePlayer = (playerId, playerData) => {
    for (var key in playerData) players[playerId][key] = playerData[key];
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
            players[publicId] = {
                id: publicId,
                name: data.player.name || 'Incognito' + publicId.substring(0, 6),
                skin: data.player.skin || 0,
                hair: data.player.hair || 0,
                x: data.player.x || 200,
                y: data.player.y || 800,
                vx: data.player.vx || 0,
                vy: data.player.vy || 0,
            };
            // console.log("Added player");
            // console.log(players);
            // When a player first logs in we send them their public/private ids and the full list of player data.
            connection.sendUTF(JSON.stringify({privateId, publicId, players}));
            // Broadcast to all other players that the new player has joined.
            broadcast({playerJoined: players[publicId]});
            connections[privateId] = connection;
            return;
        }
        if (privateIdMap[data.privateId]) {
            privateId = data.privateId;
            publicId = privateIdMap[data.privateId];
            // If a new connection is opened for an existing player, close the
            // old connection and store the new one.
            if (connections[privateId] !== connection) {
                // Close the previous connection if it exists.
                if (connections[privateId]) connections[privateId].close();
                connections[privateId] = connection;
            }
            if (data.action === 'attack') {
                broadcast({playerAttacked: publicId});
                // console.log(`Player ${publicId} attacked`);
                return;
            }
            if (data.action === 'move') {
                updatePlayer(publicId, data.player);
                broadcast({player: players[publicId]});
                // console.log(`Player ${publicId} moved`);
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
            delete connections[privateId];
            delete players[publicId];
            delete privateIdMap[privateId];
            console.log(`Player ${publicId} left`);
            // console.log(players);
            broadcast({playerLeft: publicId});
        }
    });
});
