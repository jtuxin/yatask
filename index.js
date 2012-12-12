'use strict';

var fs    = require('fs');
var path  = require('path');
var _     = require('underscore');

module.exports = exports = (function() {

  /**
   * @module yatask
   * @chainable
   */
  function yatask(overrides, changeWorkingDir) {
    var hasProp = Object.prototype.hasOwnProperty;
    var task = yatask.task, overridesPath;

    switch (typeof overrides) {
      case 'string':
        overridesPath = findOverrides(overrides);
        overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8')); break;

      case 'object':
        overrides = overrides; break;

      default:
        overrides = null; break;
    }
    
    _.each(overrides, function(value, key) {
      task.overrides[key] = task.overrides[key] || {};

      _.extend(task.overrides[key], value);
    });

    if (overridesPath && changeWorkingDir)
      process.chdir(path.dirname(overridesPath));
    
    return yatask;
  }

  yatask.Task = require('./lib/Task');
  yatask.taskRunner = require('./lib/task-runner');

  return yatask;
})();

function findOverrides(from) {
  var paths = process.cwd().split(path.sep), testPath;

  while (paths.length) {
    testPath = path.join(paths.join(path.sep), from);
    
    if (fs.existsSync(testPath))
      return testPath;

    paths.pop();
  }

  throw new Error(
    'Can\'t set the working directory. Do you have a '+from+' for the project?'
  );
}
