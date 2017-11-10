var fs = require('fs');

module.exports = (selectedId) => {
    var zones = [];
    if (!fs.existsSync('data')) fs.mkdirSync('data','0777', true);
    if (!fs.existsSync('data/zones')) fs.mkdirSync('data/zones','0777', true);
    var files = fs.readdirSync('data/zones');
    for (var file of files) {
        var zoneId = file.split('.')[0];
        zones.push({id: zoneId, url: `/zones/${zoneId}`, name: `Zone ${zoneId}`, selected: selectedId === zoneId});
    }
    return zones;
};
