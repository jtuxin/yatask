'use strict';

var async = require('async');
var EventEmitter = require('events').EventEmitter;

var pop   = Function.prototype.call.bind(Array.prototype.pop);
var slice = Function.prototype.call.bind(Array.prototype.slice);

/**
 * @module taskRunner
 */
module.exports = exports = new EventEmitter;

/**
 * @method runTasks
 */
exports.runTasks = function(tasks, done) {
  var lastArg = arguments[arguments.length - 1];

  done  = typeof lastArg === 'function' ? pop(arguments) : function() {};
  tasks = Array.isArray(tasks) ? tasks : slice(arguments);

  async.series(tasks.filter(isTask).map(wrapTaskInRunner), done);
};

function isTask(task) {
  return task && task.run;
}

function wrapTaskInRunner(task) {
  return function(done) {
    var returned;

    var delayedDone = function() {
      async.nextTick(done.apply.bind(done, this, arguments));
    };

    if (task.run.isAsync)
      task.run(delayedDone.bind(task));

    else
      try {
        delayedDone.call(task, null, task.run());
      }
      catch (err) {
        delayedDone.call(task, err);
      }
  };
}
