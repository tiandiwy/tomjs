const require2 = require('tomjs/handlers/require2');
const { readFile } = require2('tomjs/handlers/tools');
const all_files = {};

module.exports = async function files(filename, options) {
    if (all_files[filename]) {
        return all_files[filename];
    }
    else {
        all_files[filename] = await readFile(filename, options);
        return all_files[filename];
    }
}
