var fs = require('fs');
var crypto = require('crypto');
var getZones = require('../../src/zones.js');

exports.getMustacheData = (zoneId) => {
    var mustacheData = {
        assetVersion: '0.0.1',
        scripts: [],
        styleSheets: [],
        zoneId: zoneId,
        zones: getZones(zoneId),
    };
    var addScripts = scriptNames => {
        for (var scriptName of scriptNames) {
            // Path that the browser will use to access the file.
            // These start at `/public/` which is specified as static root in express.
            var staticPath = `/js/${scriptName}.js`;
            var fileContents = fs.readFileSync(`app/public/${staticPath}`).toString();
            var fileHash = crypto.createHash('md5').update(fileContents).digest("hex");
            mustacheData.scripts.push({
                staticPath,
                fileHash
            });
        }
    };
    addScripts([
        'utils', 'Rectangle', 'mouse', 'keyboard', 'draw', 'drawSprite', 'images', 'animations',
        'editor/hashObject', 'editor/convertMapToTileSet',
        'tiles', 'main', 'localSprites', 'ttPerson',
        'update', 'updateActor', 'render', 'socket', 'editor/StretchNine', 'SimpleAnimation',
        // Entity is currently defined in Trigger.js, so all Entities need to be loaded after it.
        'Trigger', 'Powerup', 'Spawner', 'CheckPoint',
        'editor/brushes/TileBrush', 'editor/brushes/CloneBrush',
        'editor/brushes/InsertRowBrush', 'editor/brushes/DeleteRowBrush',
        'editor/brushes/InsertColumnBrush', 'editor/brushes/DeleteColumnBrush',
        'editor/brushes/EntityBrush', 'editor/brushes/PointEntityBrush',
        // TriggerBrush extends EntityBrush
        'editor/brushes/TriggerBrush', 'editor/brushes/DoorTriggerBrush',
        'editor/brushes/ObjectBrush',
        'editor/ZonePalette',
        // editor/serialize need to be loaded after most entities.
        'editor/editor', 'serialize', 'TagGame', 'zoneSelect',
    ]);
    var addStyleSheets = fileNames => {
        for (var fileName of fileNames) {
            // Path that the browser will use to access the file.
            // These start at `/public/` which is specified as static root in express.
            var staticPath = `/styles/${fileName}.css`;
            var fileContents = fs.readFileSync(`app/public/${staticPath}`).toString();
            var fileHash = crypto.createHash('md5').update(fileContents).digest("hex");
            mustacheData.styleSheets.push({
                staticPath,
                fileHash
            });
        }
    };
    addStyleSheets([
        'styles'
    ]);
    return mustacheData;
};

exports.getTemplate = () => {
    return fs.readFileSync(`app/templates/index.mustache`).toString();
};
