'use strict';

var fs   = require('mocks').fs;
var path = require('path');
var _    = require('underscore');

exports.create = function(structure) {
  var mockFs = fs.create.apply(this, arguments);

  mockFs.existsSync = function(filePath) {
    var current = structure;
    var paths   = filePath.split(path.sep);

    if (paths[0] === '')
      paths.shift();

    return paths.every(function(p) {
      return Boolean(current = _.has(current, p) ? current[p] : null);
    });
  };

  return mockFs;
};
