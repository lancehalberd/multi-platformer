class StretchNine {
    constructor(source, rectangle) {
        this.source = source;
        this.rectangle = rectangle;
    }

    applyToMap(map) {
        for (var row = this.rectangle.top; row < this.rectangle.bottom; row++) {
            if (row < 0 || row >= map.height) continue;
            var dy = 1;
            if (row === this.rectangle.top) dy = 0;
            else if (row === this.rectangle.bottom - 1) dy = 2;
            map.composite[row] = map.composite[row] || [];
            for (var col = this.rectangle.left; col < this.rectangle.right; col++) {
                if (col < 0 || col >= map.width) continue;
                var dx = 1;
                if (col === this.rectangle.left) dx = 0;
                else if (col === this.rectangle.right - 1) dx = 2;
                map.composite[row][col] = {
                    image: this.source.image,
                    size: this.source.size,
                    x: this.source.x + dx, y: this.source.y + dy,
                    xScale: this.source.xScale || 1,
                    yScale: this.source.yScale || 1,
                    properties: this.source.properties };
            }
        }
    }
}

if (typeof(module) !== 'undefined') {
    module.exports = StretchNine;
}