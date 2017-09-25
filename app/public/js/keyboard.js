var KEY_LEFT = 37
var KEY_RIGHT = 39
var KEY_UP = 38
var KEY_DOWN = 40

var KEY_MAPPINGS = {
    ['A'.charCodeAt(0)]: KEY_LEFT,
    ['D'.charCodeAt(0)]: KEY_RIGHT,
    ['W'.charCodeAt(0)]: KEY_UP,
    ['S'.charCodeAt(0)]: KEY_DOWN,
};

var physicalKeysDown = {};
var keysDown = {};

$(document).on('keydown', event => {
    // Don't process this if the key is already down.
    if (physicalKeysDown[event.which]) return;
    physicalKeysDown[event.which] = true;
    var mappedKeyCode = KEY_MAPPINGS[event.which] || event.which;
    keysDown[mappedKeyCode] = (keysDown[mappedKeyCode] || 0) + 1;
    //console.log(keysDown[mappedKeyCode]);
});

$(document).on('keyup', event => {
    physicalKeysDown[event.which] = false;
    var mappedKeyCode = KEY_MAPPINGS[event.which] || event.which;
    keysDown[mappedKeyCode] = Math.max(0, (keysDown[mappedKeyCode] || 0) - 1);
    //console.log(keysDown[mappedKeyCode]);
});