// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"MDxB":[function(require,module,exports) {
/**
 * Copyright 2020 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
"use strict";
/**
 * return a string representing the full type of the variable
 * @param {*} variable 
 * @returns {String} - Object, Array, Number, String, Boolean, Null, Undefined, BigInt, Symbol, Date ...
 */

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.realtypeof = realtypeof;
exports.simpleClone = simpleClone;
exports.splitPath = splitPath;
exports.evalPath = evalPath;

function realtypeof(variable) {
  var rawType = Object.prototype.toString.call(variable); //[object Object], [object Array], [object Number] ...

  return rawType.substring(8, rawType.length - 1);
}
/**
 * check if variable is a number or a string of a number
 * @param {*} variable 
 */

/*export function isNumeric(variable) {
	if(typeof variable === 'string' && variable === '') return false;
	else return !isNaN(variable);
}*/

/**
 * recursively clones objects and array
 * @param {Proxy|Object|Array} proxy 
 */


var simpleCloneSet = new WeakSet();

function simpleClone(obj) {
  var typeofobj = realtypeof(obj);
  var cloned;

  if (typeofobj === 'Object') {
    simpleCloneSet.add(obj);
    cloned = {};
    var keys = Object.keys(obj);

    for (var _i = 0, _keys = keys; _i < _keys.length; _i++) {
      var key = _keys[_i];

      if (simpleCloneSet.has(obj[key])) {
        cloned[key] = obj[key];
      } else {
        cloned[key] = simpleClone(obj[key]);
      }
    }
  } else if (typeofobj === 'Array') {
    simpleCloneSet.add(obj);
    cloned = [];

    for (var i = 0; i < obj.length; i++) {
      if (simpleCloneSet.has(obj[i])) {
        cloned[i] = obj[i];
      } else {
        cloned[i] = simpleClone(obj[i]);
      }
    }
  } else {
    //hopefully a primitive
    cloned = obj;

    if (typeofobj !== 'Undefined' && typeofobj !== 'Null' && typeofobj !== 'Boolean' && typeofobj !== 'Number' && typeofobj !== 'BigInt' && typeofobj !== 'String') {
      console.warn("Can't clone a variable of type ".concat(typeofobj));
    }
  }

  return cloned;
}
/**
 * splits a path to an array of properties
 * (benchmarked and is faster than regex and split())
 * @param {String} path 
 */


function splitPath(path) {
  if (typeof path !== 'string' || path === '') {
    return [];
  }

  var i = 0,
      betweenBrackets = false,
      onlyDigits = false; //loop will skip over openning '.' or '['

  if (path[0] === '.') {
    i = 1;
  } else if (path[0] === '[') {
    i = 1;
    betweenBrackets = true;
    onlyDigits = true;
  }

  var resultsArr = [];
  var tmp = '';

  for (; i < path.length; i++) {
    var char = path[i];

    if (betweenBrackets) {
      if (char === ']') {
        if (onlyDigits) resultsArr.push(parseInt(tmp, 10));else resultsArr.push(tmp);
        betweenBrackets = false;
        onlyDigits = false;
        tmp = '';
      } else {
        if (onlyDigits) {
          var code = char.charCodeAt(0);

          if (code < 48 || code > 57) {
            //less than '0' char or greater than '9' char
            onlyDigits = false;
          }
        }

        tmp += char;
      }
    } else {
      if (char === '[') {
        betweenBrackets = true;
        onlyDigits = true;
      } //check if starting a new property but avoid special case of [prop][prop]


      if (char === '.' || char === '[') {
        if (tmp !== '') {
          resultsArr.push(tmp);
          tmp = '';
        }
      } else {
        tmp += char;
      }
    }
  }

  if (tmp !== '') {
    resultsArr.push(tmp);
  }

  return resultsArr;
}
/**
 * evaluate a long path and return the designated object and its referred property
 * @param {Object} obj
 * @param {String} path
 * @returns {Object} - returns {object, property, value}
 */


function evalPath(obj, path) {
  if (path === '') {
    return {
      object: obj,
      property: undefined,
      value: obj
    };
  }

  var segments = splitPath(path);
  var i;

  for (i = 0; i <= segments.length - 2; i++) {
    //iterate until one before last property because they all must exist
    obj = obj[segments[i]];

    if (typeof obj === 'undefined') {
      throw new Error("Invalid path was given - \"".concat(path, "\""));
    }
  }

  return {
    object: obj,
    property: segments[i],
    value: obj[segments[i]]
  };
}
},{}],"tgn0":[function(require,module,exports) {
/**
 * Copyright 2020 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.property2path = property2path;
exports.add2emitQueue = add2emitQueue;
exports.add2emitQueue_bubble = add2emitQueue_bubble;
exports.add2emitQueue_capture = add2emitQueue_capture;
exports.emit = emit;
exports.unproxify = unproxify;
exports.createDataNode = createDataNode;
exports.statuses = exports.acceptableEvents = exports.acceptableTypes = void 0;

var _generalFunctions = require("./general-functions.js");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

var acceptableTypes = ['Object', 'Array', 'Map']; //acceptable types to be proxied

exports.acceptableTypes = acceptableTypes;
var acceptableEvents = ['change', 'create', 'update', 'delete'];
exports.acceptableEvents = acceptableEvents;
var statuses = ['active', 'stopped', 'blocked']; //statuses of proxies

exports.statuses = statuses;
var ND = Symbol.for('proxserve_node_data'); //key for the data of a node

var NID = Symbol.for('proxserve_node_inherited_data'); //key for the inherited data of a node

/**
 * Convert property name to valid path segment
 * @param {*} obj 
 * @param {String} property 
 */

function property2path(obj, property) {
  if (_typeof(property) === 'symbol') {
    throw new Error("property of type \"symbol\" isn't path'able");
  }

  var typeofobj = (0, _generalFunctions.realtypeof)(obj);

  switch (typeofobj) {
    case 'Object':
      return ".".concat(property);

    case 'Array':
      return "[".concat(property, "]");

    default:
      console.warn("Not Implemented (type of '".concat(typeofobj, "')"));
      return property;
  }
}
/**
 * add change-events to a queue and then emits them immediately or later as a batch
 * @param {Number} delay 
 * @param {Object} dataNode 
 * @param {String} path
 * @param {*} oldValue 
 * @param {*} value 
 * @param {String} changeType
 */


function add2emitQueue(delay, dataNode, path, oldValue, value, changeType) {
  if (dataNode[ND].listeners && dataNode[ND].listeners.length > 0) {
    var change = {
      'path': path,
      'value': value,
      'oldValue': oldValue,
      'type': changeType
    };
    dataNode[ND].eventPool.push(change);

    if (delay <= 0) {
      emit(dataNode); //emit immediately
    } else if (dataNode[ND].eventPool.length === 1) {
      setTimeout(emit, delay, dataNode); //initiate timeout once, when starting to accumulate events
    }
  }
}
/**
 * bubbles up the data tree for 'add2emitQueue'
 * @param {Number} delay
 * @param {Object} dataNode
 * @param {String} property
 * @param {*} oldValue
 * @param {Boolean} wasOldValueProxy
 * @param {*} value
 * @param {Boolean} isValueProxy
 */


function add2emitQueue_bubble(delay, dataNode, property, oldValue, wasOldValueProxy, value, isValueProxy) {
  if (oldValue === value
  /*no new change was made*/
  || dataNode[ND].objects.isDeleted
  /*altered a deleted or detached proxy*/
  ) {
      return;
    }

  var changeType = acceptableEvents[2]; //update

  if (value === undefined) changeType = acceptableEvents[3]; //delete
  else if (oldValue === undefined) changeType = acceptableEvents[1]; //create

  var path;

  if (dataNode[property]) {
    //changed a property which has its own data node on the tree
    dataNode = dataNode[property];
    path = '';

    if (wasOldValueProxy || isValueProxy) {
      add2emitQueue_capture(delay, dataNode, oldValue, value, changeType);
    }
  } else {
    path = property2path(dataNode[ND].objects.target, property);
  }

  while (true) {
    if (dataNode[NID].status === statuses[1]) {
      //stop and don't propagate
      return;
    } else {
      add2emitQueue(delay, dataNode, path, oldValue, value, changeType);
    }

    if (!dataNode[ND].parentNode.isTreePrototype) {
      //we are not on root node yet
      path = dataNode[ND].propertyPath + path;
      dataNode = dataNode[ND].parentNode;
    } else {
      break;
    }
  }
}
/**
 * capturing phase - going down the data tree for 'add2emitQueue'
 * @param {Number} delay 
 * @param {Object} dataNode - traverse down this node
 * @param {*} oldValue 
 * @param {*} value 
 */


function add2emitQueue_capture(delay, dataNode, oldValue, value) {
  var keys = Object.keys(dataNode);

  for (var _i = 0, _keys = keys; _i < _keys.length; _i++) {
    var key = _keys[_i];
    var subValue = _typeof(value) === 'object' && value !== null ? value[key] : undefined;
    var subOldValue = _typeof(oldValue) === 'object' && oldValue !== null ? oldValue[key] : undefined;

    if (subValue !== subOldValue) {
      //if not both undefined or same primitive or the same object
      //TODO - both will never be the same object because 'oldValue' is the target object while 'value' is the proxy,
      //			but can a concerning scenario even happen?
      var changeType = acceptableEvents[2]; //update

      if (subValue === undefined) changeType = acceptableEvents[3]; //delete
      else if (subOldValue === undefined) changeType = acceptableEvents[1]; //create

      add2emitQueue(delay, dataNode[key], '', subOldValue, subValue, changeType);
      add2emitQueue_capture(delay, dataNode[key], subOldValue, subValue);
    }
  }
}

function emit(dataNode) {
  //save a reference to the event-pool because we are about to immediately empty it, so all future changes, even those
  //that can occur now because of the listeners, will go to a new event-pool and will be emitted next round (after delay).
  //NOTICE - an event listener for one path can still manipulate event-pools of other path's that are next on this cycle
  var listeners = dataNode[ND].listeners;
  var eventPool = dataNode[ND].eventPool;
  dataNode[ND].eventPool = [];

  if (!listeners || !eventPool) {
    //rare case where an event triggers a listener that removed-all-listeners and also causes a new event
    //before all emits of this loop have finished
    return;
  } //FIFO - first event in, first event out. listeners will be called by their turn according to which event fires first


  var _iterator = _createForOfIteratorHelper(eventPool),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var change = _step.value;

      for (var _i2 = listeners.length - 1; _i2 >= 0; _i2--) {
        var _listener = listeners[_i2]; //listener = [event, function, id, once]

        if (_listener[0] === change.type) {
          //will invoke only create/update/delete listeners
          if (_listener[3] === true) {
            //first delete the one-time listener, so the upcoming listener's-function won't meddle with it
            listeners.splice(_i2, 1);
          }

          _listener[1].call(dataNode[ND].objects.proxy, change);
        }
      }
    } //iterate over all 'change' listeners and emit with an (ordered) array of all events

  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  for (var i = listeners.length - 1; i >= 0; i--) {
    var listener = listeners[i]; //listener = [event, function, id, once]

    if (listener[0] === acceptableEvents[0]) {
      // 'change'
      if (listener[3] === true) {
        //first delete the one-time listener, so the upcoming listener's-function won't meddle with it
        listeners.splice(i, 1);
      }

      listener[1].call(dataNode[ND].objects.proxy, eventPool); //on(change) is always called with an array of one or more changes
    }
  }
}
/**
 * recursively switch between all proxies to their original targets.
 * note: original targets should never hold proxies under them,
 * thus altering the object references (getting from 'value') should be ok.
 * if the programmer decided to
 * 	1. create a proxy with children (sub-proxies)
 * 	2. create a regular object
 * 	3. adding sub-proxies to the regular object
 * 	4. attaching the regular object to the proxy
 * then this regular object will be altered.
 * @param {*} value
 */


function unproxify(value) {
  var typeofvalue = (0, _generalFunctions.realtypeof)(value);

  if (acceptableTypes.includes(typeofvalue)) {
    var target = value;

    try {
      target = value.$getOriginalTarget();
    } catch (error) {}

    switch (typeofvalue) {
      case 'Object':
        var keys = Object.keys(target);

        for (var _i3 = 0, _keys2 = keys; _i3 < _keys2.length; _i3++) {
          var key = _keys2[_i3];
          target[key] = unproxify(target[key]); //maybe alters target and maybe returning the exact same object
        }

        break;

      case 'Array':
        for (var i = 0; i < target.length; i++) {
          target[i] = unproxify(target[i]); //maybe alters target and maybe returning the exact same object
        }

        break;

      default:
        console.warn("Not Implemented (type of '".concat(typeofobj, "')"));
    }

    return target;
  } else {
    return value; //primitive
  }
}
/**
 * create a node in a tree that mimics the proxserve's object and holds meta-data
 * @param {Object} parentNode 
 * @param {String|Number} property 
 */


function createDataNode(parentNode, property) {
  var propertyPath;

  if (parentNode[ND] && parentNode[ND].objects && parentNode[ND].objects.target) {
    propertyPath = property2path(parentNode[ND].objects.target, property);
  } else {
    propertyPath = property2path({}, property); //if parent doesn't have target then treat it as object
  }

  var node = parentNode[property];

  if (!node) {
    var _node;

    node = (_node = {}, _defineProperty(_node, NID, Object.create(parentNode[NID])), _defineProperty(_node, ND, {
      'parentNode': parentNode
    }), _node);
    parentNode[property] = node;
  }

  delete node[NID].status; //clears old status in case a node previously existed
  //updates path (for rare case where parent was array and then changed to object or vice versa)
  //and also makes a new and clean 'objects' property

  Object.assign(node[ND], {
    'path': parentNode[ND].path + propertyPath,
    'propertyPath': propertyPath,
    'objects': Object.assign(Object.create(parentNode[ND].objects), {
      'target': null,
      'proxy': null
    })
  });
  return node;
}
},{"./general-functions.js":"MDxB"}],"IDhP":[function(require,module,exports) {
/**
 * Copyright 2020 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.stop = stop;
exports.block = block;
exports.activate = activate;
exports.on = on;
exports.once = once;
exports.removeListener = removeListener;
exports.removeAllListeners = removeAllListeners;
exports.getOriginalTarget = getOriginalTarget;
exports.getProxserveObjects = getProxserveObjects;
exports.getProxserveDataNode = getProxserveDataNode;
exports.getProxserveInstance = getProxserveInstance;

var _supportingFunctions = require("./supporting-functions.js");

var _generalFunctions = require("./general-functions.js");

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var ND = Symbol.for('proxserve_node_data'); //key for the data of a node

var NID = Symbol.for('proxserve_node_inherited_data'); //key for the inherited data of a node

/**
 * stop object and children from emitting change events
 * @param {Object} dataNode
 */

function stop(dataNode) {
  dataNode[NID].status = _supportingFunctions.statuses[1];
}
/**
 * block object and children from any changes.
 * user can't set nor delete any property
 * @param {Object} dataNode
 */


function block(dataNode) {
  dataNode[NID].status = _supportingFunctions.statuses[2];
}
/**
 * resume default behavior of emitting change events, inherited from parent
 * @param {Object} dataNode
 * @param {Object} objects
 * @param {Boolean} [force] - force being active regardless of parent
 */


function activate(dataNode, objects) {
  var force = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  if (force || dataNode === this.dataTree) {
    //force activation or we are on root proxy
    dataNode[NID].status = _supportingFunctions.statuses[0];
  } else {
    delete dataNode[NID].status;
  }
}
/**
 * add event listener on a proxy or on a descending path
 * @param {Object} dataNode
 * @param {Object} objects
 * @param {String|Array.String} events
 * @param {String} [path] - path selector
 * @param {Function} listener 
 * @param {String} [id] - identifier for removing this listener
 * @param {Boolean} [once] - whether this listener will run only once or always
 */


function on(dataNode, objects, events, path, listener, id) {
  var once = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : false;
  if (!Array.isArray(events)) events = [events];

  var _iterator = _createForOfIteratorHelper(events),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var event = _step.value;

      if (!_supportingFunctions.acceptableEvents.includes(event)) {
        throw new Error("".concat(event, " is not a valid event. valid events are ").concat(_supportingFunctions.acceptableEvents.join(',')));
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  if (typeof path === 'function') {
    //if called without path
    id = listener;
    listener = path;
    path = '';
  } else if (typeof listener !== 'function') {
    throw new Error("invalid arguments were given. listener must be a function");
  }

  var segments = (0, _generalFunctions.splitPath)(path); //traverse down the tree. create data-nodes if needed

  var _iterator2 = _createForOfIteratorHelper(segments),
      _step2;

  try {
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      var property = _step2.value;

      if (!dataNode[property]) {
        (0, _supportingFunctions.createDataNode)(dataNode, property);
      }

      dataNode = dataNode[property];
    }
  } catch (err) {
    _iterator2.e(err);
  } finally {
    _iterator2.f();
  }

  if (!dataNode[ND].listeners) {
    dataNode[ND].listeners = [];
    dataNode[ND].eventPool = [];
  }

  var _iterator3 = _createForOfIteratorHelper(events),
      _step3;

  try {
    for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
      var _event = _step3.value;
      dataNode[ND].listeners.push([_event, listener, id, once]);
    }
  } catch (err) {
    _iterator3.e(err);
  } finally {
    _iterator3.f();
  }
}
/**
 * add event listener on a proxy or on a descending path which will run only once
 * @param {Object} dataNode
 * @param {Object} objects
 * @param {String|Array.String} events
 * @param {String} [path] - path selector
 * @param {Function} listener 
 * @param {String} [id] - identifier for removing this listener
 */


function once(dataNode, objects, events, path, listener, id) {
  on.call(this, dataNode, objects, events, path, listener, id, true);
}
/**
 * removes a listener from a path by an identifier (can have multiple listeners with the same ID)
 * or by the listener function itself
 * @param {Object} dataNode
 * @param {Object} objects
 * @param {String} [path] - path selector
 * @param {String} id - the listener(s) identifier or listener-function
 */


function removeListener(dataNode, objects, path, id) {
  if (arguments.length === 3) {
    //if called without path
    id = path;
    path = '';
  }

  var fullPath = "".concat(dataNode[ND].path).concat(path);
  var segments = (0, _generalFunctions.splitPath)(path); //traverse down the tree

  var _iterator4 = _createForOfIteratorHelper(segments),
      _step4;

  try {
    for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
      var property = _step4.value;

      if (!dataNode[property]) {
        console.warn("can't remove listener from a non-existent path '".concat(fullPath, "'"));
        return;
      }

      dataNode = dataNode[property];
    }
  } catch (err) {
    _iterator4.e(err);
  } finally {
    _iterator4.f();
  }

  if (dataNode[ND].listeners) {
    var listeners = dataNode[ND].listeners;

    for (var i = listeners.length - 1; i >= 0; i--) {
      if (typeof id !== 'function' && listeners[i][2] === id || typeof id === 'function' && listeners[i][1] === id) {
        listeners.splice(i, 1);
      }
    }

    if (listeners.length === 0) {
      delete dataNode[ND].listeners;
      delete dataNode[ND].eventPool;
    }
  }
}
/**
 * removing all listeners of a path
 * @param {Object} dataNode
 * @param {Object} objects
 * @param {String} [path] - path selector
 */


function removeAllListeners(dataNode, objects) {
  var path = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
  var fullPath = "".concat(dataNode[ND].path).concat(path);
  var segments = (0, _generalFunctions.splitPath)(path); //traverse down the tree

  var _iterator5 = _createForOfIteratorHelper(segments),
      _step5;

  try {
    for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
      var property = _step5.value;

      if (!dataNode[property]) {
        console.warn("can't remove all listeners from a non-existent path '".concat(fullPath, "'"));
        return;
      }

      dataNode = dataNode[property];
    }
  } catch (err) {
    _iterator5.e(err);
  } finally {
    _iterator5.f();
  }

  if (dataNode[ND].listeners) {
    delete dataNode[ND].listeners;
    delete dataNode[ND].eventPool;
  }
}
/**
 * the following functions (getOriginalTarget, getProxserveObjects, getProxserveDataNode, getProxserveInstance) seem silly
 * because they could have been written directly on the handler's get() method but it's here as part of the convention of
 * exposing proxy-"inherited"-methods
 */

/**
 * get original target that is behind the proxy
 * @param {Object} dataNode
 * @param {Object} objects
 */


function getOriginalTarget(dataNode, objects) {
  return objects.target;
}
/**
 * get 'objects' (which hold all related objects) of a proxy
 * @param {Object} dataNode
 * @param {Object} objects
 */


function getProxserveObjects(dataNode, objects) {
  return objects;
}
/**
 * get the data-node of the proxy or sub-proxy
 * @param {Object} dataNode
 */


function getProxserveDataNode(dataNode) {
  return dataNode;
}
/**
 * get the Proxserve's instance that created this proxy
 */


function getProxserveInstance() {
  return this;
}
},{"./supporting-functions.js":"tgn0","./general-functions.js":"MDxB"}],"Focm":[function(require,module,exports) {
/**
 * Copyright 2020 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
"use strict";

var _supportingFunctions = require("./supporting-functions.js");

var reservedMethods = _interopRequireWildcard(require("./reserved-methods.js"));

var _generalFunctions = require("./general-functions.js");

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var ND = Symbol.for('proxserve_node_data'); //key for the data of a node

var NID = Symbol.for('proxserve_node_inherited_data'); //key for the inherited data of a node

/**
 * save an array of all reserved function names
 * and also add synonyms to these functions
 */

var reservedMethodsNames = Object.keys(reservedMethods);

for (var i = reservedMethodsNames.length - 1; i >= 0; i--) {
  var name = reservedMethodsNames[i];
  var synonym = '$' + name;
  reservedMethods[synonym] = reservedMethods[name];
  reservedMethodsNames.push(synonym);
}

var Proxserve = /*#__PURE__*/function () {
  /**
   * construct a new proxserve instance
   * @param {Object|Array} target 
   * @param {Object} [options] 
   * 	@property {Number} [options.delay] - delay change-event emitting in milliseconds, letting them pile up and then fire all at once
   * 	@property {Boolean} [options.strict] - should destroy detached child-objects or deleted properties automatically
   * 	@property {Boolean} [options.emitReference] - events emit new/old values. true: reference to original objects, false: deep clones that are created on the spot
   */
  function Proxserve(target) {
    var _createDataNode;

    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, Proxserve);

    this.delay = options.delay !== undefined ? options.delay : 10;
    this.strict = options.strict !== undefined ? options.strict : true;
    this.emitReference = options.emitReference !== undefined ? options.emitReference : false;
    this.dataTree = (0, _supportingFunctions.createDataNode)((_createDataNode = {}, _defineProperty(_createDataNode, NID, {
      'status': _supportingFunctions.statuses[0]
    }), _defineProperty(_createDataNode, ND, {
      'objects': {
        'isDeleted': false
      }
    }), _defineProperty(_createDataNode, 'isTreePrototype', true), _createDataNode), '');
    this.dataTree[ND].path = '';
    this.dataTree[ND].propertyPath = '';
    this.dataTree[ND].objects.target = target;
    return this.createProxy(this.dataTree);
  }
  /**
   * create a new proxy and a new node for a property of the parent's target-object
   * @param {Object} parentNode
   * @param {String} [targetProperty]
   */


  _createClass(Proxserve, [{
    key: "createProxy",
    value: function createProxy(parentNode, targetProperty) {
      var _this = this;

      var dataNode;

      if (targetProperty === undefined) {
        //refering to own node and not a child property (meaning root object)
        dataNode = parentNode;
      } else {
        dataNode = (0, _supportingFunctions.createDataNode)(parentNode, targetProperty); //either creates new or returns an existing one with cleaned properties

        dataNode[ND].objects.target = parentNode[ND].objects.target[targetProperty]; //assign said 'target' to the dataNode
      }

      var objects = dataNode[ND].objects; //a new one for every iteration

      var target = objects.target;
      var typeoftarget = (0, _generalFunctions.realtypeof)(target);

      if (_supportingFunctions.acceptableTypes.includes(typeoftarget)) {
        var revocable = Proxy.revocable(target, {
          get: function get(target
          /*same as parent scope 'target'*/
          , property, proxy) {
            //can access a function (or its synonym) if their keywords isn't used
            if (reservedMethodsNames.includes(property) && typeof target[property] === 'undefined') {
              return reservedMethods[property].bind(_this, dataNode, objects);
            } else if (!target.propertyIsEnumerable(property) || _typeof(property) === 'symbol') {
              return target[property]; //non-enumerable or non-path'able aren't proxied
            } else if (dataNode[property] //there's a child node
            && dataNode[property][ND].objects.proxy //it holds a proxy
            && Object.getPrototypeOf(dataNode[property][ND].objects) === objects) {
              //is child of this proxy, and not a ghost object left there after deletion
              return dataNode[property][ND].objects.proxy;
            } else {
              return target[property];
            }
          },
          set: function set(target
          /*same as parent scope 'target'*/
          , property, value, proxy) {
            //'receiver' is proxy

            /**
             * property can be a regular object because of 3 possible reasons:
             * 1. proxy is deleted from tree but user keeps accessing it then it means he saved a reference
             * 2. it is a non-enumerable property which means it was intentionally hidden
             * 3. property is a symbol and symbols can't be proxied because we can't create a normal path for them.
             *    these properties are not proxied and should not emit change-event.
             *    except for: length
             * TODO - make a list of all possible properties exceptions (maybe function 'name'?)
             */
            if (dataNode[NID].status === _supportingFunctions.statuses[2]) {
              //blocked from changing values
              console.error("can't change value of property '".concat(property, "'. object is blocked."));
              return true;
            } else if (_typeof(property) === 'symbol') {
              target[property] = value;
              return true;
            } else if (property !== 'length' && !target.propertyIsEnumerable(property)) {
              //if setting a whole new property then it is non-enumerable (yet) so a further test is needed
              var descriptor = Object.getOwnPropertyDescriptor(target, property);

              if (_typeof(descriptor) === 'object' && descriptor.enumerable === false) {
                //property was previously set
                target[property] = value;
                return true;
              }
            }

            var oldValue;
            var emitOldValue = target[property]; //should not be proxy

            var shouldDestroy = false;

            if (dataNode[property] !== undefined && dataNode[property][ND].objects.proxy !== undefined) {
              //about to overwrite an existing property which is a proxy (about to detach a proxy)
              oldValue = dataNode[property][ND].objects.proxy; //the sub-proxy

              dataNode[property][ND].objects.isDeleted = true;

              if (_this.strict) {
                shouldDestroy = true;
              }
            }

            value = (0, _supportingFunctions.unproxify)(value);
            target[property] = value; //assign new value

            var emitValue = value; //currently not a proxy but this might change later

            var isValueProxy = false;
            var typeofvalue = (0, _generalFunctions.realtypeof)(value);

            if (_supportingFunctions.acceptableTypes.includes(typeofvalue)) {
              _this.createProxy(dataNode, property); //if trying to add a new value which is an object then make it a proxy


              emitValue = dataNode[property][ND].objects.proxy; //is a proxy

              isValueProxy = true;
            }

            if (!_this.emitReference) {
              //deep copy with no proxies inside
              emitValue = (0, _generalFunctions.simpleClone)(emitValue);
              emitOldValue = (0, _generalFunctions.simpleClone)(emitOldValue);
            }

            (0, _supportingFunctions.add2emitQueue_bubble)(_this.delay, dataNode, property, emitOldValue, oldValue !== undefined, emitValue, isValueProxy);

            if (shouldDestroy) {
              setTimeout(function () {
                Proxserve.destroy(oldValue);
              }, _this.delay + 1000); //postpone this cpu intense function for later, probably when proxserve is not is use
            }

            return true;
          },

          /**
           * TODO - this function is incomplete and doesn't handle all of 'descriptor' scenarios
           */
          defineProperty: function defineProperty(target
          /*same as parent scope 'target'*/
          , property, descriptor) {
            if (_typeof(property) === 'symbol') {
              Object.defineProperty(target, property, descriptor);
              return true;
            }

            var oldValue;
            var emitOldValue = target[property]; //should not be proxy

            var shouldDestroy = false;

            if (dataNode[property] !== undefined && dataNode[property][ND].objects.proxy !== undefined) {
              //about to overwrite an existing property which is a proxy (about to detach a proxy)
              oldValue = dataNode[property][ND].objects.proxy; //the sub-proxy

              dataNode[property][ND].objects.isDeleted = true;

              if (_this.strict) {
                shouldDestroy = true;
              }
            }

            descriptor.value = (0, _supportingFunctions.unproxify)(descriptor.value);
            Object.defineProperty(target, property, descriptor); //defining the new value

            var value = descriptor.value;
            var emitValue = value; //currently not a proxy but this might change later

            var isValueProxy = false; //excluding non-enumerable properties from being proxied

            var typeofvalue = (0, _generalFunctions.realtypeof)(descriptor.value);

            if (_supportingFunctions.acceptableTypes.includes(typeofvalue) && descriptor.enumerable === true) {
              _this.createProxy(dataNode, property); //if trying to add a new value which is an object then make it a proxy


              value = dataNode[property][ND].objects.proxy; //value is now the proxy, not the target

              isValueProxy = true;
              emitValue = value; //is a proxy

              if (!_this.emitReference) {
                emitValue = (0, _generalFunctions.simpleClone)(emitValue);
                emitOldValue = (0, _generalFunctions.simpleClone)(emitOldValue); //deep copy with no proxies inside
              }
            }

            (0, _supportingFunctions.add2emitQueue_bubble)(_this.delay, dataNode, property, emitOldValue, oldValue !== undefined, emitValue, isValueProxy);

            if (shouldDestroy) {
              setTimeout(function () {
                Proxserve.destroy(oldValue);
              }, _this.delay + 1000); //postpone this cpu intense function for later, probably when proxserve is not is use
            }

            return true;
          },
          deleteProperty: function deleteProperty(target
          /*same as parent scope 'target'*/
          , property) {
            if (!target.propertyIsEnumerable(property) || _typeof(property) === 'symbol') {
              //non-proxied properties simply get deleted and nothing more
              delete target[property];
              return true;
            }

            if (dataNode[NID].status === _supportingFunctions.statuses[2]) {
              //blocked from changing values
              console.error("can't delete property '".concat(property, "'. object is blocked."));
              return true;
            }

            if (property in target) {
              var oldValue;
              var emitOldValue = target[property]; //should not be proxy

              if (!_this.emitReference) {
                emitOldValue = (0, _generalFunctions.simpleClone)(emitOldValue); //deep copy with no proxies inside
              }

              var shouldDestroy = false;

              if (dataNode[property] !== undefined && dataNode[property][ND].objects.proxy !== undefined) {
                //about to overwrite an existing property which is a proxy (about to detach a proxy)
                oldValue = dataNode[property][ND].objects.proxy; //the sub-proxy

                dataNode[property][ND].objects.isDeleted = true;

                if (_this.strict) {
                  shouldDestroy = true;
                }
              }

              delete target[property]; //actual delete

              (0, _supportingFunctions.add2emitQueue_bubble)(_this.delay, dataNode, property, emitOldValue, oldValue !== undefined, undefined, false);

              if (shouldDestroy) {
                setTimeout(function () {
                  Proxserve.destroy(oldValue);
                }, _this.delay + 1000); //postpone this cpu intense function for later, probably when proxserve is not is use
              }

              return true;
            } else {
              return true; //do nothing because there's nothing to delete
            }
          }
        });
        dataNode[ND].objects.proxy = revocable.proxy;
        dataNode[ND].objects.revoke = revocable.revoke;

        if (typeoftarget === 'Object') {
          var keys = Object.keys(target);

          for (var _i = 0, _keys = keys; _i < _keys.length; _i++) {
            var key = _keys[_i];
            var typeofproperty = (0, _generalFunctions.realtypeof)(target[key]);

            if (_supportingFunctions.acceptableTypes.includes(typeofproperty)) {
              this.createProxy(dataNode, key); //recursively make child objects also proxies
            }
          }
        } else if (typeoftarget === 'Array') {
          for (var _i2 = 0; _i2 < target.length; _i2++) {
            var _typeofproperty = (0, _generalFunctions.realtypeof)(target[_i2]);

            if (_supportingFunctions.acceptableTypes.includes(_typeofproperty)) {
              this.createProxy(dataNode, _i2); //recursively make child objects also proxies
            }
          }
        } else {
          console.warn('Not Implemented');
        }

        return revocable.proxy;
      } else {
        throw new Error('Must observe an ' + _supportingFunctions.acceptableTypes.join('/'));
      }
    }
    /**
     * Recursively revoke proxies, allowing them to be garbage collected.
     * this functions delays by delay+1000 milliseconds to let time for all events to finish
     * @param {*} proxy 
     */

  }], [{
    key: "destroy",
    value: function destroy(proxy) {
      var objects;

      try {
        objects = proxy.$getProxserveObjects();
      } catch (error) {
        return; //proxy variable isn't a proxy
      }

      if (!objects.isDeleted) {
        objects.isDeleted = true;
      }

      var typeofproxy = (0, _generalFunctions.realtypeof)(proxy);

      if (_supportingFunctions.acceptableTypes.includes(typeofproxy)) {
        if (typeofproxy === 'Object') {
          var keys = Object.keys(proxy);

          for (var _i3 = 0, _keys2 = keys; _i3 < _keys2.length; _i3++) {
            var key = _keys2[_i3];

            try {
              var typeofproperty = (0, _generalFunctions.realtypeof)(proxy[key]);

              if (_supportingFunctions.acceptableTypes.includes(typeofproperty)) {
                Proxserve.destroy(proxy[key]);
              }
            } catch (error) {
              console.error(error); //don't throw and kill the whole process just if this iteration fails
            }
          }
        } else if (typeofproxy === 'Array') {
          for (var _i4 = proxy.length - 1; _i4 >= 0; _i4--) {
            try {
              var _typeofproperty2 = (0, _generalFunctions.realtypeof)(proxy[_i4]);

              if (_supportingFunctions.acceptableTypes.includes(_typeofproperty2)) {
                Proxserve.destroy(proxy[_i4]);
              }
            } catch (error) {
              console.error(error); //don't throw and kill the whole process just if this iteration fails
            }
          }
        } else {
          console.warn('Not Implemented');
        }

        objects.revoke();
        objects.proxy = null;
      }
    }
  }, {
    key: "splitPath",
    value: function splitPath(path) {
      return (0, _generalFunctions.splitPath)(path);
    }
  }, {
    key: "evalPath",
    value: function evalPath(obj, path) {
      return (0, _generalFunctions.evalPath)(obj, path);
    }
  }]);

  return Proxserve;
}();

module.exports = exports = Proxserve; //makes ParcelJS expose this globally (for all platforms) after bundling everything
},{"./supporting-functions.js":"tgn0","./reserved-methods.js":"IDhP","./general-functions.js":"MDxB"}]},{},["Focm"], "Proxserve")
//# sourceMappingURL=proxserve.js.map