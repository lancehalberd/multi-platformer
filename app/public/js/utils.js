
var Random = {
    /**
     * @param {Number} min  The smallest returned value
     * @param {Number} max  The largest returned value
     */
    range(A, B) {
        var min = Math.min(A, B);
        var max = Math.max(A, B);
        return Math.floor(Math.random() * (max + 1 - min)) + min;
    },

    /**
     * @param {Array} array  The array of elements to return random element from
     */
    element(collection) {
        if (collection.constructor == Object) {
            var keys = Object.keys(collection);
            return collection[this.element(keys)];
        }
        if (collection.constructor == Array) {
            return collection[this.range(0, collection.length - 1)];
        }
        console.log("Warning @ Random.element: "+ collection + " is neither Array or Object");
        return null;
    },

    /**
     * @param {Array} array  The array of elements to return random element from
     */
    removeElement(collection) {
        if (collection.constructor == Object) {
            var keys = Object.keys(collection);
            var key = this.element(keys);
            var value = collection[key];
            delete collection[key]
            return value;
        }
        if (collection.constructor == Array) {
            var spliced = collection.splice(this.range(0, collection.length - 1), 1);
            return spliced[0];
        }
        console.log("Warning @ Random.removeElement: "+ collection + " is neither Array or Object");
        return null;
    },

    /**
     * Shuffles an array.
     *
     * Knuth algorithm found at:
     * http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
     *
     * @param {Array} array  The array of elements to shuffle
     */
    shuffle(array) {
        array = array.slice();
        var currentIndex = array.length, temporaryValue, randomIndex;
        // While there remain elements to shuffle...
        while (0 !== currentIndex) {
          // Pick a remaining element...
          randomIndex = Math.floor(Math.random() * currentIndex);
          currentIndex -= 1;
          // And swap it with the current element.
          temporaryValue = array[currentIndex];
          array[currentIndex] = array[randomIndex];
          array[randomIndex] = temporaryValue;
        }
        return array;
    }
};

/**
 * Makes a deep copy of an object. Note that this will not make deep copies of
 * objects with prototypes.
 */
function copy(object) {
    if (typeof(object) === 'undefined' || object === null) {
        return null;
    }
    if (typeof(object) === 'string' || typeof(object) === 'number' || typeof(object) === 'boolean') {
        return object;
    }
    if (object.constructor == Array) {
        return jQuery.extend(true, [], object);
    }
    return jQuery.extend(true, {}, object);
}

function shallowCopy(object) {
    if (typeof(object) === 'undefined' || object === null) {
        return null;
    }
    if (typeof(object) === 'string' || typeof(object) === 'number' || typeof(object) === 'boolean') {
        return object;
    }
    if (object.constructor == Array) {
        return jQuery.extend([], object);
    }
    return jQuery.extend({}, object);
}

function properCase(string) {
    return string.split(' ').map(function (word) {return word.charAt(0).toUpperCase() + word.substring(1)}).join(' ');
}

/**
 * Returns the angle from (x1, y1) to (x2,y2) which when given an image facing
 * right at angle 0, will point the image from x1,y1 towards x2,y2 when
 * context.rotate(angle) is used.
 *
 * @param {Number} x1
 * @param {Number} y1
 * @param {Number} x2
 * @param {Number} y2
 * @return {Number}
 */
function atan2(x1, y1, x2, y2) {
    if (x1 == x2) {
        return(y2 > y1) ? Math.PI / 2 : -Math.PI / 2;
    }
    return Math.atan((y2 - y1) / (x2 - x1)) + (x2 < x1 ? Math.PI : 0);
}

function ifdefor(value, defaultValue) {
    if (value !== undefined && !(typeof value === 'number' && isNaN(value))) {
        return value;
    }
    if (defaultValue !== undefined) {
        return defaultValue;
    }
    return null;
}


function tag(type, classes, content) {
    return '<' + type + ' class="' + ifdefor(classes, '') + '">' + ifdefor(content, '') + '</' + type + '>';
}

function $tag(type, classes, content) {
    return $(tag(type, classes, content));
}

var now = () => Date.now();

function isMouseOver($div) {
    var x = $('.js-mouseContainer').offset().left + mousePosition[0];
    var y = $('.js-mouseContainer').offset().top + mousePosition[1];
    return Rectangle.defineFromElement($div).containsPoint(x, y);
}

function collision($div1, $div2) {
    var A = Rectangle.defineFromElement($div1);
    var B = Rectangle.defineFromElement($div2);
    return A.overlapsRectangle(B);
}

// returns the area overlap between two divs.
function getCollisionArea($div1, $div2) {
    var A = Rectangle.defineFromElement($div1);
    var B = Rectangle.defineFromElement($div2);
    return Math.max(Math.min(A.bottom - B.top, B.bottom - a.top), 0) *
         Math.max(Math.min(A.right - B.left, B.right - A.left), 0);
}

/**
 * @param {Number} width
 * @param {Number} height
 * @return {Element}
 */
function createCanvas(width, height, classes) {
    classes = ifdefor(classes, '');
    return $('<canvas class="' + classes + '"width="' + width + '" height="' + height + '"></canvas>')[0];
}

function resize(element, width, height, left, top) {
    var $element = $(element);
    $element.css('width', width + 'px').css('height', height + 'px');
    if (ifdefor(left) != null) {
        $element.css('left', left + 'px');
    }
    if (ifdefor(top) != null) {
        $element.css('top', top + 'px');
    }
}

function constrain(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function drawRunningAnts(context, rectangle) {
    context.save();
    context.strokeStyle = 'black';
    var frame = Math.floor(now() / 80) % 10;
    if (frame < 5) {
        context.setLineDash([frame, 5, 5 - frame, 0]);
    } else {
        context.setLineDash([0, frame - 5, 5, 10 - frame]);
    }
    context.strokeRect(rectangle.left, rectangle.top, rectangle.width, rectangle.height);
    context.strokeStyle = 'white';
    frame = (frame + 5) % 10;
    if (frame < 5) {
        context.setLineDash([frame, 5, 5 - frame, 0]);
    } else {
        context.setLineDash([0, frame - 5, 5, 10 - frame]);
    }
    context.strokeRect(rectangle.left, rectangle.top, rectangle.width, rectangle.height);
    context.restore();
}

function objectIndexOf(object, value, defaultValue) {
    for (var key of Object.keys(object)) {
        if (object[key] === value) {
            return key;
        }
    }
    return ifdefor(defaultValue);
}

function arrMod(array, index) {
    return array[(index + array.length) % array.length];
}

function fixFloat(f) {
    return Math.round(1000000 * f) / 1000000;
}

function removeElementFromArray(array, element, throwErrorIfMissing) {
    var index = array.indexOf(element);
    if (index < 0) {
        if (throwErrorIfMissing) throw new Error("Element was not found to remove from array.");
        return;
    }
    array.splice(index, 1);
}
function countInstancesOfElementInArray(array, element) {
    var count = 0;
    for (var arrayElement of array) {
        if (arrayElement === element) count++;
    }
    return count;
}


var rectangleToFrames = (rectangle, image, numberOfFrames) => {
    var frames = [];
    for (var i = 0; i < numberOfFrames; i++) {
        frames[i] = rectangle.moveTo(i * rectangle.width, 0);
        frames[i].image = image;
    }
    return frames;
}
