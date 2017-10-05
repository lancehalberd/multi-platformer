// Create WebSocket connection.
// const socket = new WebSocket(`ws://${window.location.host}`);

let socket, privateId, publicId, players;

$(`#close`).on(`click`, function(){
    socket.close(1000, `User left`);
    privateId = publicId = null, players = {};
    $(`#point`).hide();
    $(`#open`).show();
    $(`#close`).hide();
    $('.players').hide();
});

$(`#point`).on(`click`, () => socket.send(JSON.stringify({privateId, action: 'score'})));

$(`#open`).on(`click`, function(){
    console.log(`Open the connection...`);

    // Create WebSocket connection.
    socket = new WebSocket(`ws://${window.location.host}`);

    // Connection opened
    socket.addEventListener('open', function (event) {
        // If privateId isn't set yet, the server will generate a new pair
        // for us.
        socket.send(JSON.stringify({privateId, name: $('#name').val()}));
        $(`#point`).show();
        $(`#close`).show();
        $(`#open`).hide();
    });

    // Listen for messages
    socket.addEventListener('message', function (event) {
        console.log('Message from server ', event.data);
        var data = JSON.parse(event.data);
        if (data.errorMessage) {
            console.log(new Error(data.errorMessage));
            return;
        }
        if (data.privateId) {
            privateId = data.privateId;
            publicId = data.publicId;
            players = data.players;
            $('.players').show();
            updatePlayers();
            return;
        }
        if (data.playerJoined) {
            players[data.playerJoined.id] = data.playerJoined;
            updatePlayers();
            return;
        }
        if (data.playerLeft) {
            delete players[data.playerLeft];
            updatePlayers();
            return;
        }
        if (data.playerUpdate) {
            players[data.playerUpdate.id].score = data.playerUpdate.score;
            updatePlayers();
            return;
        }
    });
});

function updatePlayers() {
    $('.players').empty();
    for (var id in players) {
        var player = players[id];
        var playerDiv = $(`<div>${player.name} - ${player.score}</div>`);
        if (id === publicId) playerDiv.addClass('currentPlayer');
        $('.players').append(playerDiv);
    }
}
