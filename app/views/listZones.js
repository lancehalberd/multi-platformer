var fs = require('fs');
var crypto = require('crypto');

exports.getMustacheData = () => {
    var zones = [];
    if (!fs.existsSync('data')) fs.mkdirSync('data','0777', true);
    if (!fs.existsSync('data/zones')) fs.mkdirSync('data/zones','0777', true);
    var files = fs.readdirSync('data/zones');
    for (var file of files) {
        var zoneId = file.split('.')[0];
        zones.push({url: `/zones/${zoneId}`, name: `Zone ${zoneId}`});
    }
    return {
        styleSheets: [],
        zones,
    };
};

exports.getTemplate = () => {
    return fs.readFileSync(`app/templates/listZones.mustache`).toString();
};
