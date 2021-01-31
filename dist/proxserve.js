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
})({"global-vars.js":[function(require,module,exports) {
/**
 * Copyright 2021 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NID = exports.ND = exports.eventNames = exports.proxyStatuses = exports.nodeStatuses = exports.proxyTypes = void 0;
let proxyTypes = ['Object', 'Array']; //acceptable types to be proxied

exports.proxyTypes = proxyTypes;
proxyTypes.OBJECT = proxyTypes[0];
proxyTypes.ARRAY = proxyTypes[1];
let nodeStatuses = ['active', 'stopped', 'blocked', 'splicing']; //statuses of data-nodes

exports.nodeStatuses = nodeStatuses;
nodeStatuses.ACTIVE = nodeStatuses[0];
nodeStatuses.STOPPED = nodeStatuses[1];
nodeStatuses.BLOCKED = nodeStatuses[2];
nodeStatuses.SPLICING = nodeStatuses[3];
let proxyStatuses = ['alive', 'deleted', 'revoked']; //statuses of proxies

exports.proxyStatuses = proxyStatuses;
proxyStatuses.ALIVE = proxyStatuses[0];
proxyStatuses.DELETED = proxyStatuses[1];
proxyStatuses.REVOKED = proxyStatuses[2];
let eventNames = ['create', 'update', 'delete', 'splice', 'shift', 'unshift'];
exports.eventNames = eventNames;
eventNames.CREATE = eventNames[0];
eventNames.UPDATE = eventNames[1];
eventNames.DELETE = eventNames[2];
eventNames.SPLICE = eventNames[3];
eventNames.SHIFT = eventNames[4];
eventNames.UNSHIFT = eventNames[5];
let ND = Symbol.for('proxserve_node_data'); //key for the data of a node

exports.ND = ND;
let NID = Symbol.for('proxserve_node_inherited_data'); //key for the inherited data of a node

exports.NID = NID;
},{}],"general-functions.js":[function(require,module,exports) {
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
  let rawType = Object.prototype.toString.call(variable); //[object Object], [object Array], [object Number] ...

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


let simpleCloneSet = new WeakSet();

function simpleClone(obj) {
  let typeofobj = realtypeof(obj);
  let cloned;

  if (typeofobj === 'Object') {
    simpleCloneSet.add(obj);
    cloned = {};
    let keys = Object.keys(obj);

    for (let key of keys) {
      if (simpleCloneSet.has(obj[key])) {
        cloned[key] = obj[key];
      } else {
        cloned[key] = simpleClone(obj[key]);
      }
    }
  } else if (typeofobj === 'Array') {
    simpleCloneSet.add(obj);
    cloned = [];

    for (let i = 0; i < obj.length; i++) {
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
      console.warn(`Can't clone a variable of type ${typeofobj}`);
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

  let i = 0,
      betweenBrackets = false,
      onlyDigits = false; //loop will skip over openning '.' or '['

  if (path[0] === '.') {
    i = 1;
  } else if (path[0] === '[') {
    i = 1;
    betweenBrackets = true;
    onlyDigits = true;
  }

  let resultsArr = [];
  let tmp = '';

  for (; i < path.length; i++) {
    let char = path[i];

    if (betweenBrackets) {
      if (char === ']') {
        if (onlyDigits) resultsArr.push(parseInt(tmp, 10));else resultsArr.push(tmp);
        betweenBrackets = false;
        onlyDigits = false;
        tmp = '';
      } else {
        if (onlyDigits) {
          let code = char.charCodeAt(0);

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

  let segments = splitPath(path);
  let i;

  for (i = 0; i <= segments.length - 2; i++) {
    //iterate until one before last property because they all must exist
    obj = obj[segments[i]];

    if (typeof obj === 'undefined') {
      throw new Error(`Invalid path was given - "${path}"`);
    }
  }

  return {
    object: obj,
    property: segments[i],
    value: obj[segments[i]]
  };
}
},{}],"supporting-functions.js":[function(require,module,exports) {
/**
 * Copyright 2021 Noam Lin <noamlin@gmail.com>
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
exports.unproxify = unproxify;
exports.createNodes = createNodes;

var _globalVars = require("./global-vars.js");

var _generalFunctions = require("./general-functions.js");

/**
 * Convert property name to valid path segment
 * @param {*} obj 
 * @param {String} property 
 */
function property2path(obj, property) {
  if (typeof property === 'symbol') {
    throw new Error(`property of type "symbol" isn't path'able`);
  }

  let typeofobj = (0, _generalFunctions.realtypeof)(obj);

  switch (typeofobj) {
    case 'Object':
      return `.${property}`;

    case 'Array':
      return `[${property}]`;

    default:
      console.warn(`Not Implemented (type of '${typeofobj}')`);
      return property;
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
  let typeofvalue = (0, _generalFunctions.realtypeof)(value);

  if (_globalVars.proxyTypes.includes(typeofvalue)) {
    let target = value;

    try {
      target = value.$getOriginalTarget();
    } catch (error) {}

    switch (typeofvalue) {
      case 'Object':
        let keys = Object.keys(target);

        for (let key of keys) {
          target[key] = unproxify(target[key]); //maybe alters target and maybe returning the exact same object
        }

        break;

      case 'Array':
        for (let i = 0; i < target.length; i++) {
          target[i] = unproxify(target[i]); //maybe alters target and maybe returning the exact same object
        }

        break;

      default:
        console.warn(`Not Implemented (type of '${typeofobj}')`);
    }

    return target;
  } else {
    return value; //primitive
  }
}
/**
 * create or reset a node in a tree of meta-data (mainly path related)
 * and optionally create a node in a tree of proxy data (mainly objects related)
 * @param {Object} parentDataNode 
 * @param {Object} [parentProxyNode] 
 * @param {String|Number} property 
 * @param {*} [target] 
 */


function createNodes(parentDataNode, parentProxyNode, property, target) {
  //handle property path
  let propertyPath;

  if (parentProxyNode && parentProxyNode[_globalVars.ND].target) {
    propertyPath = property2path(parentProxyNode[_globalVars.ND].target, property);
  } else {
    propertyPath = property2path({}, property); //if parent doesn't have target then treat it as object
  } //handle data node


  let dataNode = parentDataNode[property]; //try to receive existing data-node

  if (!dataNode) {
    dataNode = {
      [_globalVars.NID]: Object.create(parentDataNode[_globalVars.NID]),
      [_globalVars.ND]: {
        parentNode: parentDataNode,
        listeners: {
          shallow: [],
          deep: []
        }
      }
    };
    parentDataNode[property] = dataNode;
  }

  delete dataNode[_globalVars.NID].status; //clears old status in case a node previously existed
  //updates path (for rare case where parent was array and then changed to object or vice versa)

  if (!parentDataNode[_globalVars.ND].isTreePrototype) {
    Object.assign(dataNode[_globalVars.ND], {
      path: parentDataNode[_globalVars.ND].path + propertyPath,
      propertyPath
    });
  } else {
    Object.assign(dataNode[_globalVars.ND], {
      path: '',
      propertyPath: ''
    });
  } //handle proxy node


  let proxyNode;

  if (parentProxyNode) {
    proxyNode = {
      [_globalVars.NID]: Object.create(parentProxyNode[_globalVars.NID]),
      [_globalVars.ND]: {
        target
      }
    };
    parentProxyNode[property] = proxyNode; //attach nodes to each other

    dataNode[_globalVars.ND].proxyNode = proxyNode;
    proxyNode[_globalVars.ND].dataNode = dataNode;
  }

  return [dataNode, proxyNode];
}
},{"./global-vars.js":"global-vars.js","./general-functions.js":"general-functions.js"}],"pseudo-methods.js":[function(require,module,exports) {
/**
 * Copyright 2021 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
// Pseudo methods are methods that aren't really on the object - not as a property nor via its prototype
// thus they will not be retrieved via "for..in" and etcetera. Their property name is actually undefined, but
// calling it will return the method via the JS proxy's "get" handler.
// (i.e. someProxserve.pseudoFunction will return the pseudoFunction)
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
exports.getProxserveNodes = getProxserveNodes;
exports.getProxserveInstance = getProxserveInstance;

var _globalVars = require("./global-vars.js");

var _supportingFunctions = require("./supporting-functions.js");

var _generalFunctions = require("./general-functions.js");

/**
 * stop object and children from emitting change events
 * automatically filled param {Object} dataNode
 */
function stop(dataNode) {
  dataNode[_globalVars.NID].status = _globalVars.nodeStatuses.STOPPED;
}
/**
 * block object and children from any changes.
 * user can't set nor delete any property
 * automatically filled param {Object} dataNode
 */


function block(dataNode) {
  dataNode[_globalVars.NID].status = _globalVars.nodeStatuses.BLOCKED;
}
/**
 * resume default behavior of emitting change events, inherited from parent
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} proxyNode
 * @param {Boolean} [force] - force being active regardless of parent
 */


function activate(dataNode, proxyNode, force = false) {
  if (force || dataNode === this.dataTree) {
    //force activation or we are on root proxy
    dataNode[_globalVars.NID].status = _globalVars.nodeStatuses.ACTIVE;
  } else {
    delete dataNode[_globalVars.NID].status;
  }
}
/**
 * add event listener on a proxy or on a descending path
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} proxyNode
 * @param {String|Array.String} events
 * @param {String} [path] - path selector
 * @param {Function} listener
 * @param {Object} [options]
 * 	@property {Boolean} [options.deep] - should listen for event emitted by sub-objects or not
 * 	@property {Boolean} [options.id] - identifier for removing this listener later
 * 	@property {Boolean} [options.once] - whether this listener will run only once or always
 */


function on(dataNode, proxyNode, events, path, listener, {
  deep = false,
  id = undefined,
  once = false
} = {}) {
  if (events === 'change') events = _globalVars.eventNames.slice(0); //will listen to all events
  else if (!Array.isArray(events)) events = [events];

  for (let event of events) {
    if (!_globalVars.eventNames.includes(event)) {
      throw new Error(`${event} is not a valid event. valid events are ${_globalVars.eventNames.join(',')}`);
    }
  }

  if (typeof path === 'function') {
    //if called without path
    if (typeof listener === 'object') {
      //listener is options
      if (typeof listener.deep === 'boolean') deep = listener.deep;
      if (listener.id !== undefined) id = listener.id;
      if (typeof listener.once === 'boolean') once = listener.once;
    }

    listener = path;
    path = '';
  } else if (typeof listener !== 'function') {
    throw new Error(`invalid arguments were given. listener must be a function`);
  }

  let segments = (0, _generalFunctions.splitPath)(path);

  for (let property of segments) {
    //traverse down the tree
    if (!dataNode[property]) {
      //create data-nodes if needed
      (0, _supportingFunctions.createNodes)(dataNode, undefined, property);
    }

    dataNode = dataNode[property];
  }

  let listenersPool = dataNode[_globalVars.ND].listeners.shallow;
  if (deep) listenersPool = dataNode[_globalVars.ND].listeners.deep;
  let listenerObj = {
    type: events,
    once: once,
    func: listener
  };

  if (id !== undefined) {
    listenerObj.id = id;
  }

  listenersPool.push(listenerObj);
}
/**
 * add event listener on a proxy or on a descending path which will run only once
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} proxyNode
 * @param {String|Array.String} events
 * @param {String} [path] - path selector
 * @param {Function} listener 
 * @param {String} [options]
 */


function once(dataNode, proxyNode, events, path, listener, options) {
  if (typeof options !== 'object') options = {};
  options.once = true;
  on.call(this, dataNode, proxyNode, events, path, listener, options);
}
/**
 * removes a listener from a path by an identifier (can have multiple listeners with the same ID)
 * or by the listener function itself
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} proxyNode
 * @param {String} [path] - path selector
 * @param {String|Function} id - the listener(s) identifier or listener-function
 */


function removeListener(dataNode, proxyNode, path, id) {
  if (arguments.length === 3) {
    //if called without path
    id = path;
    path = '';
  }

  let fullPath = `${dataNode[_globalVars.ND].path}${path}`;
  let segments = (0, _generalFunctions.splitPath)(path); //traverse down the tree

  for (let property of segments) {
    if (!dataNode[property]) {
      console.warn(`can't remove listener from a non-existent path '${fullPath}'`);
      return;
    }

    dataNode = dataNode[property];
  }

  function removeById(listenersArr, id) {
    for (let i = listenersArr.length - 1; i >= 0; i--) {
      let listenerObj = listenersArr[i];

      if (id !== undefined && listenerObj.id === id || listenerObj.func === id) {
        listenersArr.splice(i, 1);
      }
    }
  }

  removeById(dataNode[_globalVars.ND].listeners.shallow, id);
  removeById(dataNode[_globalVars.ND].listeners.deep, id);
}
/**
 * removing all listeners of a path
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} proxyNode
 * @param {String} [path] - path selector
 */


function removeAllListeners(dataNode, proxyNode, path = '') {
  let fullPath = `${dataNode[_globalVars.ND].path}${path}`;
  let segments = (0, _generalFunctions.splitPath)(path); //traverse down the tree

  for (let property of segments) {
    if (!dataNode[property]) {
      console.warn(`can't remove all listeners from a non-existent path '${fullPath}'`);
      return;
    }

    dataNode = dataNode[property];
  }

  dataNode[_globalVars.ND].listeners.shallow = [];
  dataNode[_globalVars.ND].listeners.deep = [];
}
/**
 * the following functions (getOriginalTarget, getProxserveNodes, getProxserveInstance) seem silly
 * because they could have been written directly on the handler's get() method but it's here as part of the convention of
 * exposing proxy-"inherited"-methods
 */

/**
 * get original target that is behind the proxy
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} proxyNode
 */


function getOriginalTarget(dataNode, proxyNode) {
  return proxyNode[_globalVars.ND].target;
}
/**
 * get the data-node of a proxy (which holds all meta data)
 * and also get proxy-node of a proxy (which holds all related objects)
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} proxyNode
 */


function getProxserveNodes(dataNode, proxyNode) {
  return [dataNode, proxyNode];
}
/**
 * get the Proxserve's instance that created this proxy
 */


function getProxserveInstance() {
  return this;
}
},{"./global-vars.js":"global-vars.js","./supporting-functions.js":"supporting-functions.js","./general-functions.js":"general-functions.js"}],"event-emitter.js":[function(require,module,exports) {
/**
 * Copyright 2021 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.initEmitEvent = initEmitEvent;
exports.initFunctionEmitEvent = initFunctionEmitEvent;

var _globalVars = require("./global-vars.js");

var _supportingFunctions = require("./supporting-functions.js");

var _generalFunctions = require("./general-functions.js");

/**
 * try to get the proxy-object from a data-node. if can't then from it's parent's proxy
 * @param {Object} dataNode 
 * @param {String} property - the property as the dataNode is assigned on its parent
 */
function getProxyValue(dataNode, property) {
  if (dataNode[_globalVars.ND].proxyNode && dataNode[_globalVars.ND].proxyNode[_globalVars.NID].status === _globalVars.proxyStatuses.ALIVE) {
    return dataNode[_globalVars.ND].proxyNode[_globalVars.ND].proxy; //actual proxy of child node
  } else {
    if (!property) {
      //my property on the parent
      property = (0, _generalFunctions.splitPath)(dataNode[_globalVars.ND].propertyPath)[0];
    }

    let parentNode = dataNode[_globalVars.ND].parentNode;

    if (parentNode[_globalVars.ND].proxyNode && parentNode[_globalVars.ND].proxyNode[_globalVars.NID].status === _globalVars.proxyStatuses.ALIVE) {
      return parentNode[_globalVars.ND].proxyNode[_globalVars.ND].proxy[property]; //proxy or primitive via parent's proxy object
    } else {//if we reached here then probably we are on a capture phase of a deep deletion.
        //for example 'obj.sub1.sub2' gets 'delete obj.sub1' so now there are no values for 'sub2' nor its parent 'sub1'.
        //the warning is turned off because this situation seems okay
        // console.warn(`reached a capture level where neither child not parent proxy-nodes exist`);
      }
  }

  return undefined;
}
/**
 * process event and then bubble up and capture down the data tree
 * @param {Object} dataNode
 * @param {String} property
 * @param {*} oldValue
 * @param {Boolean} wasOldValueProxy
 * @param {*} value
 * @param {Boolean} isValueProxy
 */


function initEmitEvent(dataNode, property, oldValue, wasOldValueProxy, value, isValueProxy) {
  if (oldValue === value //no new change was made
  || !dataNode[_globalVars.ND].proxyNode) {
    //proxy-node is detached from data-node
    return;
  }

  let proxyNode = dataNode[_globalVars.ND].proxyNode;

  if (proxyNode[_globalVars.NID].status !== _globalVars.proxyStatuses.ALIVE) {
    //altered a deleted proxy
    return;
  }

  let changeType = _globalVars.eventNames.UPDATE;
  if (value === undefined) changeType = _globalVars.eventNames.DELETE;else if (oldValue === undefined) changeType = _globalVars.eventNames.CREATE;
  let deferredEvents; //altering properties of an array that's in the middle of a splicing phase

  if (dataNode[_globalVars.NID].status === _globalVars.nodeStatuses.SPLICING) {
    //initiate (if needed) an object to hold side effect events
    if (!dataNode[_globalVars.ND].deferredEvents) dataNode[_globalVars.ND].deferredEvents = []; //save a reference to the deferredEvents

    deferredEvents = dataNode[_globalVars.ND].deferredEvents;
  }

  let path;

  if (dataNode[property]) {
    //changed a property which has its own data node on the tree
    dataNode = dataNode[property];
    path = '';
  } else {
    path = (0, _supportingFunctions.property2path)(proxyNode[_globalVars.ND].target, property);
  }

  let change = {
    'path': path,
    'value': value,
    'oldValue': oldValue,
    'type': changeType
  };

  if (!deferredEvents) {
    bubbleEmit(dataNode, change, property);

    if (wasOldValueProxy || isValueProxy) {
      //old value or new value are proxy meaning they are objects with children
      captureEmit(dataNode, change);
    }
  } else {
    deferredEvents.push({
      dataNode,
      change,
      shouldCapture: wasOldValueProxy || isValueProxy
    });
  }
}
/**
 * process special event for a built-in method and then bubble up the data tree
 * @param {Object} dataNode
 * @param {String} funcName - the method's name
 * @param {Object} funcArgs - the method's arguments
 * @param {*} oldValue
 * @param {*} value
 */


function initFunctionEmitEvent(dataNode, funcName, funcArgs, oldValue, value) {
  let change = {
    'path': '',
    'value': value,
    'oldValue': oldValue,
    'type': funcName,
    'args': funcArgs
  };
  bubbleEmit(dataNode, change);

  if (dataNode[_globalVars.ND].deferredEvents) {
    for (let event of dataNode[_globalVars.ND].deferredEvents) {
      if (event.change.path === '') {
        //no path means its an event directly on the property, not on the parent.
        //i.e: not an event on "arr" with path "0", but on "arr[0]" with no path.
        //function event on "arr" already ran, but now a regular event on "arr[0]" is due
        let thisValue = getProxyValue(event.dataNode);
        iterateAndEmit(event.dataNode[_globalVars.ND].listeners.shallow, thisValue, event.change);
        iterateAndEmit(event.dataNode[_globalVars.ND].listeners.deep, thisValue, event.change);
      }

      if (event.shouldCapture) {
        captureEmit(event.dataNode, event.change);
      }
    }

    delete dataNode[_globalVars.ND].deferredEvents;
  } else {
    console.warn(`no side effect events for ${funcName} were made`);
  }
}
/**
 * bubbling phase - go up the data tree and emit
 * @param {Object} dataNode
 * @param {Object} change
 * 	@property {String} change.path
 * 	@property {*} change.oldValue
 * 	@property {*} change.value
 * 	@property {String} change.type
 * @param {String} [property] - property name of the data-node (i.e. as the data-node is assigned to its parent)
 */


function bubbleEmit(dataNode, change, property) {
  if (dataNode[_globalVars.NID].status === _globalVars.nodeStatuses.STOPPED) {
    return; //not allowed to emit
  }

  let thisValue = getProxyValue(dataNode, property);

  if (change.path === '') {
    //iterate over 'shallow' listeners
    iterateAndEmit(dataNode[_globalVars.ND].listeners.shallow, thisValue, change);
  } //iterate over 'deep' listeners


  iterateAndEmit(dataNode[_globalVars.ND].listeners.deep, thisValue, change);

  if (!dataNode[_globalVars.ND].parentNode[_globalVars.ND].isTreePrototype) {
    //we are not on root node yet
    //create a shallow copy of 'change' and update its path
    //(we don't want to alter the 'change' object that was just emitted to a listener)
    let nextChange = { ...change,
      path: dataNode[_globalVars.ND].propertyPath + change.path
    };
    bubbleEmit(dataNode[_globalVars.ND].parentNode, nextChange);
  }
}
/**
 * capturing phase - go down the data tree and emit
 * @param {Object} dataNode
 * @param {Object} change
 * 	@property {String} change.path
 * 	@property {*} change.oldValue
 * 	@property {*} change.value
 * 	@property {String} change.type
 */


function captureEmit(dataNode, change) {
  let keys = Object.keys(dataNode);

  for (let key of keys) {
    let subValue = typeof change.value === 'object' && change.value !== null ? change.value[key] : undefined;
    let subOldValue = typeof change.oldValue === 'object' && change.oldValue !== null ? change.oldValue[key] : undefined;

    if (subValue !== subOldValue) {
      //if not both undefined or same primitive or the same object
      let changeType = _globalVars.eventNames.UPDATE;
      if (subValue === undefined) changeType = _globalVars.eventNames.DELETE;else if (subOldValue === undefined) changeType = _globalVars.eventNames.CREATE;
      let subChange = {
        path: '',
        oldValue: subOldValue,
        value: subValue,
        type: changeType
      }; //failing the status check will not emit for current property (but sub-properties might still be forcibly active)

      let childNode = dataNode[key];

      if (childNode[_globalVars.NID].status !== _globalVars.nodeStatuses.STOPPED) {
        let thisValue = getProxyValue(childNode, key);
        iterateAndEmit(childNode[_globalVars.ND].listeners.shallow, thisValue, subChange);
      }

      captureEmit(childNode, subChange);
    }
  }
}
/**
 * iterate over an array of listeners, handle 'once' listeners and emit
 * @param {Array} listenersArr 
 * @param {*} thisValue 
 * @param {Object} change 
 */


function iterateAndEmit(listenersArr, thisValue, change) {
  for (let i = listenersArr.length - 1; i >= 0; i--) {
    let listener = listenersArr[i];

    if (listener.type.includes(change.type)) {
      if (listener.once === true) {
        listenersArr.splice(i, 1);
      }

      listener.func.call(thisValue, change);
    }
  }
}
},{"./global-vars.js":"global-vars.js","./supporting-functions.js":"supporting-functions.js","./general-functions.js":"general-functions.js"}],"proxy-methods.js":[function(require,module,exports) {
/**
 * Copyright 2021 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
// Proxy methods are methods that will proxy JS built-in methods.
// For examply, the proxy function for "splice" will handle some event stuff and then use
// the actual "splice" function internally
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.splice = splice;
exports.shift = shift;
exports.unshift = unshift;

var _globalVars = require("./global-vars.js");

var _eventEmitter = require("./event-emitter.js");

/**
 * a wrapper function for the 'splice' method
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} proxyNode
 * @param {Number} start 
 * @param {Number} deleteCount 
 * @param  {...any} items 
 */
function splice(dataNode, proxyNode, start, deleteCount, ...items) {
  if (dataNode[_globalVars.NID].status !== _globalVars.nodeStatuses.ACTIVE) {
    return Array.prototype.splice.call(proxyNode[_globalVars.ND].proxy, start, deleteCount, ...items);
  }

  let isActiveByInheritance = !dataNode[_globalVars.NID].hasOwnProperty('status');
  dataNode[_globalVars.NID].status = _globalVars.nodeStatuses.SPLICING;

  let oldValue = proxyNode[_globalVars.ND].target.slice(0);

  let deleted = Array.prototype.splice.call(proxyNode[_globalVars.ND].proxy, start, deleteCount, ...items); //creates many side-effect events

  let args = {
    start,
    deleteCount,
    items
  };
  if (isActiveByInheritance) delete dataNode[_globalVars.NID].status;else dataNode[_globalVars.NID].status = _globalVars.nodeStatuses.ACTIVE;
  (0, _eventEmitter.initFunctionEmitEvent)(dataNode, _globalVars.eventNames.SPLICE, args, oldValue, proxyNode[_globalVars.ND].target);
  return deleted;
}
/**
 * a wrapper function for the 'shift' method
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} proxyNode
 */


function shift(dataNode, proxyNode) {
  if (dataNode[_globalVars.NID].status !== _globalVars.nodeStatuses.ACTIVE) {
    return Array.prototype.shift.call(proxyNode[_globalVars.ND].proxy);
  }

  let isActiveByInheritance = !dataNode[_globalVars.NID].hasOwnProperty('status');
  dataNode[_globalVars.NID].status = _globalVars.nodeStatuses.SPLICING;

  let oldValue = proxyNode[_globalVars.ND].target.slice(0);

  let deleted = Array.prototype.shift.call(proxyNode[_globalVars.ND].proxy); //creates many side-effect events

  if (isActiveByInheritance) delete dataNode[_globalVars.NID].status;else dataNode[_globalVars.NID].status = _globalVars.nodeStatuses.ACTIVE;
  (0, _eventEmitter.initFunctionEmitEvent)(dataNode, _globalVars.eventNames.SHIFT, {}, oldValue, proxyNode[_globalVars.ND].target);
  return deleted;
}
/**
 * a wrapper function for the 'unshift' method
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} proxyNode
 * @param  {...any} items 
 */


function unshift(dataNode, proxyNode, ...items) {
  if (dataNode[_globalVars.NID].status !== _globalVars.nodeStatuses.ACTIVE) {
    return Array.prototype.shift.call(proxyNode[_globalVars.ND].proxy);
  }

  let isActiveByInheritance = !dataNode[_globalVars.NID].hasOwnProperty('status');
  dataNode[_globalVars.NID].status = _globalVars.nodeStatuses.SPLICING;

  let oldValue = proxyNode[_globalVars.ND].target.slice(0);

  let newLength = Array.prototype.unshift.call(proxyNode[_globalVars.ND].proxy, ...items); //creates many side-effect events

  let args = {
    items
  };
  if (isActiveByInheritance) delete dataNode[_globalVars.NID].status;else dataNode[_globalVars.NID].status = _globalVars.nodeStatuses.ACTIVE;
  (0, _eventEmitter.initFunctionEmitEvent)(dataNode, _globalVars.eventNames.UNSHIFT, args, oldValue, proxyNode[_globalVars.ND].target);
  return newLength;
}
},{"./global-vars.js":"global-vars.js","./event-emitter.js":"event-emitter.js"}],"index.js":[function(require,module,exports) {
/**
 * Copyright 2021 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
"use strict";

var _globalVars = require("./global-vars.js");

var _supportingFunctions = require("./supporting-functions.js");

var pseudoMethods = _interopRequireWildcard(require("./pseudo-methods.js"));

var proxyMethods = _interopRequireWildcard(require("./proxy-methods.js"));

var _generalFunctions = require("./general-functions.js");

var _eventEmitter = require("./event-emitter.js");

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

let ND = Symbol.for('proxserve_node_data'); //key for the data of a node

let NID = Symbol.for('proxserve_node_inherited_data'); //key for the inherited data of a node

/**
 * save an array of all reserved function names
 * and also add synonyms to these functions
 */

let pseudoMethodsNames = Object.keys(pseudoMethods);

for (let i = pseudoMethodsNames.length - 1; i >= 0; i--) {
  let name = pseudoMethodsNames[i];
  let synonym = '$' + name;
  pseudoMethods[synonym] = pseudoMethods[name];
  pseudoMethodsNames.push(synonym);
}

class Proxserve {
  /**
   * construct a new proxserve instance
   * @param {Object|Array} target 
   * @param {Object} [options]
   * 	@property {Boolean} [options.strict] - should destroy detached child-objects or deleted properties automatically
   * 	@property {Boolean} [options.emitMethods] - should splice/shift/unshift emit one event or all CRUD events
   */
  constructor(target, {
    strict = true,
    emitMethods = true,
    debug = {}
  } = {}) {
    this.strict = strict;
    this.emitMethods = emitMethods;
    this.destroyDelay = 1000;
    if (debug && debug.destroyDelay) this.destroyDelay = debug.destroyDelay;
    let dataTreePrototype = {
      [NID]: {
        status: _globalVars.nodeStatuses.ACTIVE
      },
      [ND]: {
        isTreePrototype: true
      }
    };
    let proxyTreePrototype = {
      [NID]: {
        status: _globalVars.proxyStatuses.ALIVE
      },
      [ND]: {
        isTreePrototype: true
      }
    };
    [this.dataTree, this.proxyTree] = (0, _supportingFunctions.createNodes)(dataTreePrototype, proxyTreePrototype, '', target);
    return this.createProxy(this.dataTree);
  }
  /**
   * create a new proxy and a new node for a property of the parent's target-object
   * @param {Object} parentDataNode
   * @param {String} [targetProperty]
   */


  createProxy(parentDataNode, targetProperty) {
    let parentProxyNode = parentDataNode[ND].proxyNode;
    let dataNode, proxyNode;

    if (targetProperty === undefined) {
      //refering to own node and not a child property (meaning root object)
      dataNode = parentDataNode;
      proxyNode = parentProxyNode;
    } else {
      //creates new or reset an existing data-node and then creates a new proxy-node
      [dataNode, proxyNode] = (0, _supportingFunctions.createNodes)(parentDataNode, parentProxyNode, targetProperty, parentProxyNode[ND].target[targetProperty]);
    }

    let target = proxyNode[ND].target;
    let typeoftarget = (0, _generalFunctions.realtypeof)(target);

    if (_globalVars.proxyTypes.includes(typeoftarget)) {
      let revocable = Proxy.revocable(target, {
        get: (target
        /*same as parent scope 'target'*/
        , property, proxy) => {
          if (this.emitMethods && proxyMethods.hasOwnProperty(property) && property in Object.getPrototypeOf(target)) {
            //use a proxy method instead of the built-in method that is on the prototype chain
            return proxyMethods[property].bind(this, dataNode, proxyNode);
          } else if (pseudoMethodsNames.includes(property) && typeof target[property] === 'undefined') {
            //can access a pseudo function (or its synonym) if their keywords isn't used
            return pseudoMethods[property].bind(this, dataNode, proxyNode);
          } else if (!target.propertyIsEnumerable(property) || typeof property === 'symbol') {
            return target[property]; //non-enumerable or non-path'able aren't proxied
          } else if (proxyNode[property] //there's a child node
          && proxyNode[property][ND].proxy //it holds a proxy
          && proxyNode[property][NID].status === _globalVars.proxyStatuses.ALIVE) {
            return proxyNode[property][ND].proxy;
          } else {
            return target[property];
          }
        },
        set: (target
        /*same as parent scope 'target'*/
        , property, value, proxy) => {
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
          if (dataNode[NID].status === _globalVars.nodeStatuses.BLOCKED) {
            //blocked from changing values
            console.error(`can't change value of property '${property}'. object is blocked.`);
            return true;
          } else if (typeof property === 'symbol') {
            target[property] = value;
            return true;
          } else if (property !== 'length' && !target.propertyIsEnumerable(property)) {
            //if setting a whole new property then it is non-enumerable (yet) so a further test is needed
            let descriptor = Object.getOwnPropertyDescriptor(target, property);

            if (typeof descriptor === 'object' && descriptor.enumerable === false) {
              //property was previously set
              target[property] = value;
              return true;
            }
          }

          let oldValue = target[property]; //should not be proxy

          let isOldValueProxy = false;

          if (proxyNode[property] !== undefined && proxyNode[property][ND].proxy !== undefined) {
            //about to overwrite an existing property which is a proxy (about to detach a proxy)
            proxyNode[property][NID].status = _globalVars.proxyStatuses.DELETED;
            delete dataNode[property][ND].proxyNode; //detach reference from data-node to proxy-node

            isOldValueProxy = true;

            if (this.strict) {
              //postpone this cpu intense function for later, probably when proxserve is not in use
              setTimeout(Proxserve.destroy, this.destroyDelay, proxyNode[property][ND].proxy);
            }
          }

          value = (0, _supportingFunctions.unproxify)(value);
          target[property] = value; //assign new value

          let isValueProxy = false;
          let typeofvalue = (0, _generalFunctions.realtypeof)(value);

          if (_globalVars.proxyTypes.includes(typeofvalue)) {
            this.createProxy(dataNode, property); //if trying to add a new value which is an object then make it a proxy

            isValueProxy = true;
          }

          (0, _eventEmitter.initEmitEvent)(dataNode, property, oldValue, isOldValueProxy, value, isValueProxy);
          return true;
        },

        /**
         * TODO - this function is incomplete and doesn't handle all of 'descriptor' scenarios
         */
        defineProperty: (target
        /*same as parent scope 'target'*/
        , property, descriptor) => {
          if (typeof property === 'symbol') {
            Object.defineProperty(target, property, descriptor);
            return true;
          }

          let oldValue = target[property]; //should not be proxy

          let isOldValueProxy = false;

          if (proxyNode[property] !== undefined && proxyNode[property][ND].proxy !== undefined) {
            //about to overwrite an existing property which is a proxy (about to detach a proxy)
            proxyNode[property][NID].status = _globalVars.proxyStatuses.DELETED;
            delete dataNode[property][ND].proxyNode; //detach reference from data-node to proxy-node

            isOldValueProxy = true;

            if (this.strict) {
              //postpone this cpu intense function for later, probably when proxserve is not is use
              setTimeout(Proxserve.destroy, this.destroyDelay, proxyNode[property][ND].proxy);
            }
          }

          descriptor.value = (0, _supportingFunctions.unproxify)(descriptor.value);
          Object.defineProperty(target, property, descriptor); //defining the new value

          let value = descriptor.value;
          let isValueProxy = false; //excluding non-enumerable properties from being proxied

          let typeofvalue = (0, _generalFunctions.realtypeof)(descriptor.value);

          if (_globalVars.proxyTypes.includes(typeofvalue) && descriptor.enumerable === true) {
            this.createProxy(dataNode, property); //if trying to add a new value which is an object then make it a proxy

            isValueProxy = true;
          }

          (0, _eventEmitter.initEmitEvent)(dataNode, property, oldValue, isOldValueProxy, value, isValueProxy);
          return true;
        },
        deleteProperty: (target
        /*same as parent scope 'target'*/
        , property) => {
          if (!target.propertyIsEnumerable(property) || typeof property === 'symbol') {
            //non-proxied properties simply get deleted and nothing more
            delete target[property];
            return true;
          }

          if (dataNode[NID].status === _globalVars.nodeStatuses.BLOCKED) {
            //blocked from changing values
            console.error(`can't delete property '${property}'. object is blocked.`);
            return true;
          }

          if (property in target) {
            let oldValue = target[property]; //should not be proxy

            let isOldValueProxy = false;

            if (proxyNode[property] !== undefined && proxyNode[property][ND].proxy !== undefined) {
              //about to overwrite an existing property which is a proxy (about to detach a proxy)
              proxyNode[property][NID].status = _globalVars.proxyStatuses.DELETED;
              delete dataNode[property][ND].proxyNode; //detach reference from data-node to proxy-node

              isOldValueProxy = true;

              if (this.strict) {
                //postpone this cpu intense function for later, probably when proxserve is not is use
                setTimeout(Proxserve.destroy, this.destroyDelay, proxyNode[property][ND].proxy);
              }
            }

            delete target[property]; //actual delete

            (0, _eventEmitter.initEmitEvent)(dataNode, property, oldValue, isOldValueProxy, undefined, false);
            return true;
          } else {
            return true; //do nothing because there's nothing to delete
          }
        }
      });
      proxyNode[ND].proxy = revocable.proxy;
      proxyNode[ND].revoke = revocable.revoke;

      if (_globalVars.proxyTypes.includes(typeoftarget)) {
        let keys = Object.keys(target); //handles both Objects and Arrays

        for (let key of keys) {
          let typeofproperty = (0, _generalFunctions.realtypeof)(target[key]);

          if (_globalVars.proxyTypes.includes(typeofproperty)) {
            this.createProxy(dataNode, key); //recursively make child objects also proxies
          }
        }
      } else {
        console.warn(`Type of "${typeoftarget}" is not implemented`);
      }

      return revocable.proxy;
    } else {
      throw new Error('Must observe an ' + _globalVars.proxyTypes.join('/'));
    }
  }
  /**
   * Recursively revoke proxies, allowing them to be garbage collected.
   * this functions delays 1000 milliseconds to let time for all events to finish
   * @param {*} proxy 
   */


  static destroy(proxy) {
    let proxyNode;

    try {
      [, proxyNode] = proxy.$getProxserveNodes();
    } catch (error) {
      return; //proxy variable isn't a proxy
    }

    if (proxyNode[NID].status === _globalVars.proxyStatuses.ALIVE) {
      proxyNode[NID].status = _globalVars.proxyStatuses.DELETED;
    }

    let typeofproxy = (0, _generalFunctions.realtypeof)(proxy);

    if (_globalVars.proxyTypes.includes(typeofproxy)) {
      let keys = Object.keys(proxy); //handles both Objects and Arrays

      for (let key of keys) {
        try {
          let typeofproperty = (0, _generalFunctions.realtypeof)(proxy[key]);

          if (_globalVars.proxyTypes.includes(typeofproperty)) {
            //going to proxy[key], which is deleted, will return the original target so we will bypass it
            Proxserve.destroy(proxyNode[key][ND].proxy);
          }
        } catch (error) {
          console.error(error); //don't throw and kill the whole process just if this iteration fails
        }
      }

      proxyNode[ND].revoke(); //proxyNode[ND].proxy = undefined;

      proxyNode[NID].status = _globalVars.proxyStatuses.REVOKED;
    } else {
      console.warn(`Type of "${typeofproxy}" is not implemented`);
    }
  }

  static splitPath(path) {
    return (0, _generalFunctions.splitPath)(path);
  }

  static evalPath(obj, path) {
    return (0, _generalFunctions.evalPath)(obj, path);
  }

}

module.exports = exports = Proxserve; //makes ParcelJS expose this globally (for all platforms) after bundling everything
},{"./global-vars.js":"global-vars.js","./supporting-functions.js":"supporting-functions.js","./pseudo-methods.js":"pseudo-methods.js","./proxy-methods.js":"proxy-methods.js","./general-functions.js":"general-functions.js","./event-emitter.js":"event-emitter.js"}],"../../../../home/noam/.nvm/versions/node/v15.4.0/lib/node_modules/parcel-bundler/src/builtins/hmr-runtime.js":[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';
var OldModule = module.bundle.Module;

function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };
  module.bundle.hotData = null;
}

module.bundle.Module = Module;
var checkedAssets, assetsToAccept;
var parent = module.bundle.parent;

if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = "" || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "42401" + '/');

  ws.onmessage = function (event) {
    checkedAssets = {};
    assetsToAccept = [];
    var data = JSON.parse(event.data);

    if (data.type === 'update') {
      var handled = false;
      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          var didAccept = hmrAcceptCheck(global.parcelRequire, asset.id);

          if (didAccept) {
            handled = true;
          }
        }
      }); // Enable HMR for CSS by default.

      handled = handled || data.assets.every(function (asset) {
        return asset.type === 'css' && asset.generated.js;
      });

      if (handled) {
        console.clear();
        data.assets.forEach(function (asset) {
          hmrApply(global.parcelRequire, asset);
        });
        assetsToAccept.forEach(function (v) {
          hmrAcceptRun(v[0], v[1]);
        });
      } else if (location.reload) {
        // `location` global exists in a web worker context but lacks `.reload()` function.
        location.reload();
      }
    }

    if (data.type === 'reload') {
      ws.close();

      ws.onclose = function () {
        location.reload();
      };
    }

    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');
      removeErrorOverlay();
    }

    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);
      removeErrorOverlay();
      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}

function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);

  if (overlay) {
    overlay.remove();
  }
}

function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID; // html encode message and stack trace

  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;
  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';
  return overlay;
}

function getParents(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return [];
  }

  var parents = [];
  var k, d, dep;

  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];

      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(k);
      }
    }
  }

  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }

  return parents;
}

function hmrApply(bundle, asset) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}

function hmrAcceptCheck(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (!modules[id] && bundle.parent) {
    return hmrAcceptCheck(bundle.parent, id);
  }

  if (checkedAssets[id]) {
    return;
  }

  checkedAssets[id] = true;
  var cached = bundle.cache[id];
  assetsToAccept.push([bundle, id]);

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    return true;
  }

  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAcceptCheck(global.parcelRequire, id);
  });
}

function hmrAcceptRun(bundle, id) {
  var cached = bundle.cache[id];
  bundle.hotData = {};

  if (cached) {
    cached.hot.data = bundle.hotData;
  }

  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }

  delete bundle.cache[id];
  bundle(id);
  cached = bundle.cache[id];

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });

    return true;
  }
}
},{}]},{},["../../../../home/noam/.nvm/versions/node/v15.4.0/lib/node_modules/parcel-bundler/src/builtins/hmr-runtime.js","index.js"], "Proxserve")