'use strict';

var normalize  = require('path').normalize;
var workingDir = '/';

exports.chdir = function(dir) {
  dir = normalize(typeof dir === 'string' ? dir : '/');
  workingDir = dir;
};

exports.cwd = function() {
  return workingDir;
};
