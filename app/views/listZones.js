var getZones = require('../../src/zones.js');

exports.getMustacheData = () => {
    return {
        styleSheets: [],
        zones: getZones(),
    };
};

exports.getTemplate = () => {
    return fs.readFileSync(`app/templates/listZones.mustache`).toString();
};
