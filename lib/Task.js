'use strict';

var EventEmitter = require('events').EventEmitter;
var _ = require('underscore');

var slice   = Function.prototype.call.bind(Array.prototype.slice);
var unshift = Function.prototype.call.bind(Array.prototype.unshift);
var concat  = Function.prototype.apply.bind(Array.prototype.concat);

module.exports = exports = Task;

/**
 * Task
 * ----
 *
 * Task interface with helper methods to assist in implementing tasks. It really
 * does three things:
 *
 *   1. Exposes methods for registering events as functions instead of using
 *      strings.
 *
 *   2. A couple of "magic" properties that help in generating task configs
 *
 *     * ### defaults
 *         Automatically freezes and then chains the passed object to its
 *         parents defaults object (or null if not present) to help with nesting
 *         tasks.
 *
 *     * ### config
 *         Chains this.overrides[this.name] on top of the defaults object. The
 *         property caches the result so multiple calls return the same mutable
 *         object.
 *
 *   3. Exposes a "run" method decorator that helps wrap the passed method in
 *      beforerun and afterrun events.
 *
 * @class Task
 * @extends EventEmitter
 */
function Task(run) {
  if (!Task.prototype.isPrototypeOf(this))
    return new Task(run);
  
  var runEventHandler = function run() { return this.name || 'task' };

  EventEmitter.apply(this, arguments);

  this.createEvent('before_#{run}', runEventHandler);
  this.createEvent('after_#{run}', runEventHandler);
  
  if (typeof run === 'function')
    this.run = 'isAsync' in run ? run : Task.run(run);
}

/**
 * A simple function decorator that wraps the passed in callback in beforerun
 * and afterrun events.
 *
 * @static
 * @method run
 * @param {Boolean} [isAsync=false] option to indicate that a "done" function
 *                  should be passed as the last argument to signal when the
 *                  method has finished running
 * @param {Function} wrapped callback thats wrapped
 * @param {Array|any} [boundArgs]* will be bound to the passed function
 * @return value returned by passed in function or itself if it's asynchronous
 */
Task.run = function(isAsync, wrapped, boundArgs) {
  var args = slice(arguments), lastArg;

  isAsync = typeof args[0] === 'boolean' ? args.shift() : false;

  wrapped = typeof args[0] === 'function' ? args.shift() : (function noCb() {
    throw new Error('pass a function to wrap');
  })();

  lastArg   = args[args.length - 1];
  boundArgs = Array.isArray(lastArg) ? lastArg : args;

  var returnedFunction = isAsync ?
    function asyncRun() {
      var that = this;
      var args = concat(boundArgs, arguments);
      var lastArg  = args[args.length - 1];
      var callback = _.isFunction(lastArg) ? lastArg : _.identity;

      that.event_before_run();

      args[args.length - (_.isFunction(lastArg) ? 1 : 0)] = function() {
        callback.apply(that, arguments);
        that.event_after_run.apply(that, arguments);
      };

      wrapped.apply(that, args);

      return that;
    } :

    function syncRun() {
      this.event_before_run();

      var args   = concat(boundArgs, arguments);
      var result = wrapped.apply(this, args);

      this.event_after_run.call(this, result);

      return result;
    };

  returnedFunction.isAsync = isAsync;
  
  return returnedFunction;
};

Task.prototype = Object.create(EventEmitter.prototype, {
  constructor: { value: Task },

  /**
   * @property config
   */
  config: {
    enumerable: true,

    get: _.memoize(
      function generateConfig() {
        var parent   = Object.create(this.defaults || Object.prototype);
        var override = this.overrides && this.overrides[this.name] || {};

        return copyAllOwn(override, parent);
      },

      function configPropertyHasher() {
        return this.name || (function WhyYouNoSetAName() {
          throw new Error('Your task needs a name to generate a config object');
        })();
      }
    )
  },
  
  /**
   * @property defaults
   */
  defaults: {
    enumerable: true,

    set: function set(defaults) {
      var prototype = this.defaults || null;
      var parent    = Object.create(prototype);
      
      Object.defineProperty(this, 'defaults', {
        enumerable: true,

        get: function get() {
          return _.has(get, 'cached') ?
            get.cached :
            get.cached = deepFreeze(copyAllOwn(defaults, parent));
        },

        set: set
      });
    }
  },
  
  /**
   * mirrors the constructor name property
   * @property name
   */
  name: {
    get: function() {
      return this.constructor && this.constructor.name &&
             this.constructor.name.toLowerCase() || undefined;
    }
  },

  /**
   * @property overrides
   */
  overrides: {
    writable: true, enumerable: true,

    value: {}
  }
});

/**
 * Helper to create events on the task object that chained tasks can listen to.
 *
 * @method createEvent
 * @param {String} name string to indicate the name of the event
 * @param {Object|Function*|Array[Function]} bindings to map
 */
Task.prototype.createEvent = (function() {
  var bindingTags = /[#][{](.+?)[}]/g;
  var stripTags   = /(^\d)?([^\w\_\$])/g;
  
  return function(eventName, bindings) {
    bindings =
      _.isArray(bindings) ? bindings.reduce(namesToObj, {}) :
      _.isObject(bindings) && !_.isFunction(bindings) ? bindings :
      slice(arguments, 1).reduce(namesToObj, {});

    var simpleName = eventName.replace(stripTags, '');
    
    if (!_.every(bindings, _.isFunction))
      throw new Error('All passed bindings should be functions');

    if (!arguments.length)
      throw new Error('createEvent must at least be called with an event name');
    
    if (this['event_'+simpleName] || this['event_on_'+simpleName])
      throw new Error('Event '+simpleName+' already exists');
    
    this['event_'+simpleName] = fromBindings(eventName, 'emit', bindings);
    this['event_on_'+simpleName] = fromBindings(eventName, 'on', bindings);
    this['event_once_'+simpleName] = fromBindings(eventName, 'once', bindings);

    return this;
  };

  function fromBindings(eventName, to, bindings) {
    return function() {
      var that = this;
      var boundArgs = slice(arguments);

      var event = eventName.replace(bindingTags, function(whole, match) {
        var args = slice(boundArgs);

        return _.has(bindings, match) && bindings[match].apply(that, args) ||
          (function() {
            throw new Error('couldn\'t process binding function for ' + match);
          })();
      });

      unshift(arguments, event);

      return that[to].apply(that, arguments);
    };
  }
})();

/**
 * Removes event with name from task.
 *
 * @method removeEvent
 * @param {String} name event to remove
 */
Task.prototype.removeEvent = function(name) {
  this.removeAllListeners(name);

  var that = this;

  do {
    delete that['event_'+name];
    delete that['event_on_'+name];
    delete that['event_once_'+name];

  } while (that && (that =
    Object.getPrototypeOf(that))
  );

  return this;
};

function copyAllOwn(from, to) {
  Object.keys(from).forEach(function(key) {
    Object.defineProperty(to, key, Object.getOwnPropertyDescriptor(from, key));
  });

  return to;
}

function deepFreeze(obj) {
  Object.keys(obj).forEach(function(field) {
    if (typeof obj[field] === 'object' && obj[field])
      obj[field] = deepFreeze(obj[field]);
  });

  return Object.freeze(obj);
}

function namesToObj(memo, func) {
  if (!func || !func.name)
    throw new Error('Passed function needs to be named');

  memo[func.name] = func;

  return memo;
}
