var fs = require('fs');
var crypto = require('crypto');

exports.getMustacheData = () => {
    var mustacheData = {
        assetVersion: '0.0.1',
        scripts: [],
        styleSheets: [],
    };
    var addScripts = scriptNames => {
        for (var scriptName of scriptNames) {
            // Path that the browser will use to access the file.
            // These start at `/public/` which is specified as static root in express.
            var staticPath = `js/${scriptName}.js`;
            var fileContents = fs.readFileSync(`app/public/${staticPath}`).toString();
            var fileHash = crypto.createHash('md5').update(fileContents).digest("hex");
            mustacheData.scripts.push({
                staticPath,
                fileHash
            });
        }
    };
    addScripts([
        'utils', 'mouse', 'keyboard', 'draw', 'drawSprite', 'images', 'main', 'ttPerson', 'tiles',
        'update', 'updateActor', 'render', 'socket', 'StretchNine', 'localSprites',
    ]);
    var addStyleSheets = fileNames => {
        for (var fileName of fileNames) {
            // Path that the browser will use to access the file.
            // These start at `/public/` which is specified as static root in express.
            var staticPath = `styles/${fileName}.css`;
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
