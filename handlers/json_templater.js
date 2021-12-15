//fork by json-templater/string  https://github.com/lightsofapollo/json-templater
/**
Convert a dotted path to a location inside an object.

@private
@example

  // returns xfoo
  extractValue('wow.it.works', {
    wow: {
      it: {
        works: 'xfoo'
      }
    }
  });

  // returns undefined
  extractValue('xfoo.bar', { nope: 1 });

@param {String} path dotted to indicate levels in an object.
@param {Object} view for the data.
*/

const DB_BEGIN = "__DB__";
function extractValue(path, view, safe = true) {
    path = path.trim();
    // Short circuit for direct matches.
    if (view && view[path]) return safe ? JSON.stringify(view[path], null, 2).replace(/\//g, '\\/')
        .replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029") : view[path];

    var parts = path.split('.');

    while (
        // view should always be truthy as all objects are.
        view &&
        // must have a part in the dotted path
        (part = parts.shift())
    ) {
        view = (typeof view === 'object' && part in view) ?
            view[part] :
            undefined;
    }

    if (view === undefined && path.startsWith(DB_BEGIN)) {
        view = "{{ " + path + " }}";
    }

    return safe ? JSON.stringify(view, null, 2).replace(/\//g, '\\/')
        .replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029") : view;
}

var REGEX = new RegExp('{{(\\s*?[a-zA-Z.-_0-9]+\\s*?)}}', 'g');
var REGEX2 = new RegExp('{!(\\s*?[a-zA-Z.-_0-9]+\\s*?)!}', 'g');
var TEMPLATE_OPEN = '{{';
var TEMPLATE_OPEN2 = '{!';

/**
NOTE: I also wrote an implementation that does not use regex but it is actually slower
      in real world usage and this is easier to understand.

@param {String} input template.
@param {Object} view details.
*/
function replace(input, view) {
    // optimization to avoid regex calls (indexOf is strictly faster)
    if (input.indexOf(TEMPLATE_OPEN) === -1 && input.indexOf(TEMPLATE_OPEN2) === -1) return input;
    var result;
    var replaced = input.replace(REGEX, function (original, path) {
        var value = extractValue(path, view);
        if (undefined === value || null === value) {
            return original;
        }

        if (typeof value === 'object') {
            result = value;
            return;
        }

        return value;
    });
    replaced = replaced.replace(REGEX2, function (original, path) {
        var value = extractValue(path, view, false);
        if (undefined === value || null === value) {
            return original;
        }

        if (typeof value === 'object') {
            result = value;
            return;
        }

        return value;
    });
    return (undefined !== result) ? result : replaced;
}

module.exports = replace;