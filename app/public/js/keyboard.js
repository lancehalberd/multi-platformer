var KEY_LEFT = 37;
var KEY_RIGHT = 39;
var KEY_UP = 38;
var KEY_DOWN = 40;
var KEY_SPACE = 32;

var KEY_MAPPINGS = {
    ['A'.charCodeAt(0)]: KEY_LEFT,
    ['D'.charCodeAt(0)]: KEY_RIGHT,
    ['W'.charCodeAt(0)]: KEY_UP,
    ['S'.charCodeAt(0)]: KEY_DOWN,
};

// This mapping assumes a canonical gamepad setup as seen in:
// https://w3c.github.io/gamepad/#remapping
// Which seems to work well with my xbox 360 controller.
// I based this code on examples from:
// https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API
var GAME_PAD_MAPPINGS = {
    [KEY_UP]: 0,// Could change this to KEY_JUMP
    [KEY_SPACE]: 2,
    //12: KEY_UP,// Right now up => jump, but on a game pad we don't want that. We should probably make up not jump and uncomment this.
    [KEY_DOWN]: 13,
    [KEY_LEFT]: 14,
    [KEY_RIGHT]: 15,
};

var physicalKeysDown = {};
var keysDown = {};

// Apparently, depending on the button type, either button.pressed or button == 1.0 indicates the button is pressed.
function buttonIsPressed(button) {
  if (typeof(button) == "object") return button.pressed;
  return button == 1.0;
}
function isKeyDown(keyCode) {
    if (keysDown[keyCode]) return true;
    // If a mapping exists for the current key code to a gamepad button,
    // check if that gamepad button is pressed.
    var buttonIndex = GAME_PAD_MAPPINGS[keyCode];
    if (typeof(buttonIndex) !== 'undefined') {
        // There can be multiple game pads connected. For now, let's just check all of them for the button.
        var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
        for (var gamepad of gamepads) {
            if (!gamepad) continue;
            if (buttonIsPressed(gamepad.buttons[buttonIndex])) return true;
        }
    }
}


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