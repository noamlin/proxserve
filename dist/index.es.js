/**
 * 2023 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
const ND = Symbol.for('proxserve_node_data'); // key for the data of a node
const NID = Symbol.for('proxserve_node_inherited_data'); // key for the inherited data of a node
// acceptable types to be proxied
const proxyTypes = {
    "Object": true,
    "Array": true,
};
// statuses of data-nodes
var NODE_STATUSES;
(function (NODE_STATUSES) {
    NODE_STATUSES["active"] = "active";
    NODE_STATUSES["stopped"] = "stopped";
    NODE_STATUSES["blocked"] = "blocked";
    NODE_STATUSES["splicing"] = "splicing";
})(NODE_STATUSES || (NODE_STATUSES = {}));
// statuses of proxies
var PROXY_STATUSES;
(function (PROXY_STATUSES) {
    PROXY_STATUSES["alive"] = "alive";
    PROXY_STATUSES["deleted"] = "deleted";
    PROXY_STATUSES["revoked"] = "revoked";
})(PROXY_STATUSES || (PROXY_STATUSES = {}));
// event names that can be emitted
var EVENTS;
(function (EVENTS) {
    EVENTS["create"] = "create";
    EVENTS["update"] = "update";
    EVENTS["delete"] = "delete";
    EVENTS["splice"] = "splice";
    EVENTS["shift"] = "shift";
    EVENTS["unshift"] = "unshift";
})(EVENTS || (EVENTS = {}));

/**
 * 2023 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
/**
 * return a string representing the full type of the variable
 */
function realtypeof(variable) {
    let rawType = Object.prototype.toString.call(variable); //[object Object], [object Array], [object Number]...
    return rawType.substring(8, rawType.length - 1);
}
/**
 * splits a path to an array of properties
 * (benchmarked and is faster than regex and split())
 * @param path
 */
function splitPath(path) {
    if (typeof path !== 'string' || path === '') {
        return [];
    }
    let i = 0, betweenBrackets = false, onlyDigits = false;
    //loop will skip over openning '.' or '['
    if (path[0] === '.') {
        i = 1;
    }
    else if (path[0] === '[') {
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
                if (onlyDigits) {
                    resultsArr.push(parseInt(tmp, 10));
                }
                else {
                    resultsArr.push(tmp);
                }
                betweenBrackets = false;
                onlyDigits = false;
                tmp = '';
            }
            else {
                if (onlyDigits) {
                    let code = char.charCodeAt(0);
                    if (code < 48 || code > 57) { //less than '0' char or greater than '9' char
                        onlyDigits = false;
                    }
                }
                tmp += char;
            }
        }
        else {
            if (char === '[') {
                betweenBrackets = true;
                onlyDigits = true;
            }
            //check if starting a new property but avoid special case of [prop][prop]
            if (char === '.' || char === '[') {
                if (tmp !== '') {
                    resultsArr.push(tmp);
                    tmp = '';
                }
            }
            else {
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
 */
function evalPath(obj, path) {
    if (path === '') {
        return {
            object: obj,
            property: '',
            value: obj,
        };
    }
    let segments = splitPath(path);
    let i;
    for (i = 0; i <= segments.length - 2; i++) { // iterate until one before last property because they all must exist
        obj = obj[segments[i]];
        if (typeof obj === 'undefined') {
            throw new Error(`Invalid path was given - "${path}"`);
        }
    }
    return {
        object: obj,
        property: segments[i],
        value: obj[segments[i]],
    };
}

/**
 * 2023 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
const stop = function stop() {
    this.dataNode[NID].status = NODE_STATUSES.stopped;
};
const block = function block() {
    this.dataNode[NID].status = NODE_STATUSES.blocked;
};
const activate = function activate(force = false) {
    if (force || this.dataNode === this.metadata.dataTree) { // force activation or we are on root proxy
        this.dataNode[NID].status = NODE_STATUSES.active;
    }
    else {
        delete this.dataNode[NID].status;
    }
};
const on = function on(args) {
    const { path = '', listener, id, deep = false, once = false, } = args;
    // its nicer to expose `event` to the user,
    // but since it is semi-reserved word, we internally rename it to `events`
    let { event: events } = args;
    if (events === 'change') {
        events = Object.keys(EVENTS); // will listen to all events
    }
    else if (!Array.isArray(events)) {
        events = [events];
    }
    for (let event of events) {
        if (!EVENTS[event]) {
            const names = Object.keys(EVENTS);
            throw new Error(`${event} is not a valid event. valid events are ${names.join(',')}`);
        }
    }
    let dataNode = this.dataNode;
    let segments = splitPath(path);
    for (let property of segments) { // traverse down the tree
        if (!dataNode[property]) {
            // create data-nodes if needed (in dataNode[property]), but don't create/overwrite proxy-nodes
            createNodes(dataNode, property);
        }
        dataNode = dataNode[property];
    }
    let listenersPool = dataNode[ND].listeners.shallow;
    if (deep) {
        listenersPool = dataNode[ND].listeners.deep;
    }
    let listenerObj = {
        type: events,
        once,
        func: listener
    };
    if (id !== undefined) {
        listenerObj.id = id;
    }
    listenersPool.push(listenerObj);
};
const once = function once(args) {
    args.once = true;
    on.call(this, args);
};
function removeById(listenersArr, id) {
    for (let i = listenersArr.length - 1; i >= 0; i--) {
        let listenerObj = listenersArr[i];
        if ((id !== undefined && listenerObj.id === id) || listenerObj.func === id) {
            listenersArr.splice(i, 1);
        }
    }
}
const removeListener = function removeListener(args) {
    const { id, path = '' } = args;
    const fullPath = `${this.dataNode[ND].path}${path}`;
    let dataNode = this.dataNode;
    const segments = splitPath(path);
    // traverse down the tree
    for (let property of segments) {
        if (!dataNode[property]) {
            console.warn(`can't remove listener from a non-existent path '${fullPath}'`);
            return;
        }
        dataNode = dataNode[property];
    }
    removeById(dataNode[ND].listeners.shallow, id);
    removeById(dataNode[ND].listeners.deep, id);
};
const removeAllListeners = function removeAllListeners(path = '') {
    const fullPath = `${this.dataNode[ND].path}${path}`;
    const segments = splitPath(path);
    let dataNode = this.dataNode;
    //traverse down the tree
    for (let property of segments) {
        if (!dataNode[property]) {
            console.warn(`can't remove all listeners from a non-existent path '${fullPath}'`);
            return;
        }
        dataNode = dataNode[property];
    }
    dataNode[ND].listeners.shallow = [];
    dataNode[ND].listeners.deep = [];
};
const getOriginalTarget = function getOriginalTarget() {
    return this.proxyNode[ND].target;
};
const getProxserveName = function getProxserveName() {
    return this.dataNode[NID].name;
};
const whoami = function whoami() {
    return this.dataNode[NID].name + this.dataNode[ND].path;
};
const getProxserveNodes = function getProxserveNodes() {
    return { dataNode: this.dataNode, proxyNode: this.proxyNode };
};

var pseudoMethods = /*#__PURE__*/Object.freeze({
    __proto__: null,
    activate: activate,
    block: block,
    getOriginalTarget: getOriginalTarget,
    getProxserveName: getProxserveName,
    getProxserveNodes: getProxserveNodes,
    on: on,
    once: once,
    removeAllListeners: removeAllListeners,
    removeListener: removeListener,
    stop: stop,
    whoami: whoami
});

/**
 * 2023 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
/**
 * Convert property name to valid path segment
 */
function property2path(obj, property) {
    if (typeof property === 'symbol') {
        throw new Error(`property of type "symbol" isn't path'able`);
    }
    const typeofobj = realtypeof(obj);
    switch (typeofobj) {
        case 'Object': {
            return `.${property}`;
        }
        case 'Array': {
            return `[${property}]`;
        }
        default: {
            console.warn(`Not Implemented (type of '${typeofobj}')`);
            return property;
        }
    }
}
/**
 * recursively switch between all proxies to their original targets.
 * note: original targets should never hold proxies under them,
 * thus altering the object references (getting from 'value') should be ok.
 * if whoever uses this library decides to
 * 	1. create a proxy with children (sub-proxies)
 * 	2. create a regular object
 * 	3. adding sub-proxies to the regular object
 * 	4. attaching the regular object to the proxy
 * then this regular object will be altered.
 */
function unproxify(value) {
    const typeofvalue = realtypeof(value);
    if (proxyTypes[typeofvalue]) {
        let target = value;
        try {
            target = value.$getOriginalTarget();
        }
        catch (error) { }
        switch (typeofvalue) {
            case 'Object':
                let keys = Object.keys(target);
                for (let key of keys) {
                    target[key] = unproxify(target[key]); // maybe alters target and maybe returning the exact same object
                }
                break;
            case 'Array':
                for (let i = 0; i < target.length; i++) {
                    target[i] = unproxify(target[i]); // maybe alters target and maybe returning the exact same object
                }
                break;
            default:
                console.warn(`Not Implemented (type of '${typeofvalue}')`);
        }
        return target;
    }
    else {
        return value; // primitive
    }
}
/**
 * create or reset a node in a tree of meta-data (mainly path related)
 * and optionally create a node in a tree of proxy data (mainly objects related)
 */
function createNodes(parentDataNode, property, parentProxyNode, target) {
    //handle property path
    let propertyPath;
    if (parentProxyNode === null || parentProxyNode === void 0 ? void 0 : parentProxyNode[ND].target) {
        propertyPath = property2path(parentProxyNode[ND].target, property);
    }
    else {
        propertyPath = property2path({}, property); // if parent doesn't have target then treat it as object
    }
    //handle data node
    let dataNode = parentDataNode[property]; // try to receive existing data-node
    if (!dataNode) {
        dataNode = {
            [NID]: Object.create(parentDataNode[NID]),
            [ND]: {
                parentNode: parentDataNode,
                listeners: {
                    shallow: [],
                    deep: [],
                },
            }
        };
        parentDataNode[property] = dataNode;
    }
    delete dataNode[NID].status; // clears old status in case a node previously existed
    // updates path (for rare case where parent was array and then changed to object or vice versa)
    if (!parentDataNode[ND].isTreePrototype) {
        Object.assign(dataNode[ND], {
            path: parentDataNode[ND].path + propertyPath,
            propertyPath
        });
    }
    else {
        Object.assign(dataNode[ND], {
            path: '',
            propertyPath: ''
        });
    }
    // handle proxy node
    let proxyNode;
    if (parentProxyNode) {
        proxyNode = {
            [NID]: Object.create(parentProxyNode[NID]),
            [ND]: {
                target: target,
                dataNode,
            },
        };
        parentProxyNode[property] = proxyNode;
        // attach nodes to each other
        dataNode[ND].proxyNode = proxyNode;
    }
    else {
        // this scenario is dangerous and exists only for `on()` of future variables (paths) that don't yet exist
        proxyNode = undefined;
    }
    return { dataNode, proxyNode };
}
let noStackFlag = false;
function stackTraceLog(dataNode, change, logLevel) {
    if (logLevel !== 'normal' && logLevel !== 'verbose') {
        return;
    }
    const err = new Error();
    const stack = err.stack;
    if (!stack) {
        if (!noStackFlag) {
            // log this only once. no need to spam.
            console.error('Can\'t log stack trace of proxserve. browser/runtime doesn\'t support Error.stack');
            noStackFlag = true;
        }
        return;
    }
    // break stack to individual lines. each line will point to a file and function.
    const functionsTrace = stack.split('\n').map((value) => {
        return value.trim();
    });
    // remove first and useless Error line.
    if (functionsTrace[0].toLowerCase().indexOf('error') === 0) {
        functionsTrace.shift();
    }
    // delete this function's own line.
    functionsTrace.shift();
    // delete `initEmitEvent` line - overwrite it with a title.
    functionsTrace[0] = 'Stack Trace:';
    // log the message header.
    const pathname = whoami.call({ dataNode }) + change.path;
    let verb = change.type;
    if (change.type === EVENTS.shift || change.type === EVENTS.unshift) {
        verb += 'ed';
    }
    else {
        verb += 'd';
    }
    console.log('%c                                                                ', 'border-bottom: 1px solid #008;');
    console.log(`%c${pathname} %chas been ${verb}:`, 'font-weight: bold; color: #008;', 'color: #000;');
    // verbose message with assigned values
    if (logLevel === 'verbose') {
        if (change.type === 'splice' || change.type === 'unshift') {
            console.log(`%cArguments of ${change.type}:`, 'color: #555; font-style: italic;');
            console.log(change.args);
        }
        console.log('%cOld value was:', 'color: #555; font-style: italic;');
        console.log(change.oldValue);
        console.log('%cNew value is:', 'color: #555; font-style: italic;');
        console.log(change.value);
    }
    // the files and lines list message
    console.log(`%c${functionsTrace.join('\n')}`, 'color: #999;');
    console.log('%c                                                                ', 'border-top: 1px solid #008;');
}

/**
 * 2023 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
/**
 * try to get the proxy-object from a data-node. if can't then from it's parent's proxy
 * @param dataNode
 * @param property - the property as the dataNode is assigned on its parent
 */
function getProxyValue(dataNode, property) {
    var _a;
    if (dataNode[ND].proxyNode && dataNode[ND].proxyNode[NID].status === PROXY_STATUSES.alive) {
        return dataNode[ND].proxyNode[ND].proxy; // actual proxy of child node
    }
    else {
        if (!property) {
            // my property on the parent
            property = splitPath(dataNode[ND].propertyPath)[0];
        }
        let parentNode = dataNode[ND].parentNode;
        if (parentNode[ND].proxyNode && parentNode[ND].proxyNode[NID].status === PROXY_STATUSES.alive) {
            return (_a = parentNode[ND].proxyNode[ND].proxy) === null || _a === void 0 ? void 0 : _a[property]; // proxy or primitive via parent's proxy object
        }
    }
    return undefined;
}
/**
 * process event and then bubble up and capture down the data tree
 */
function initEmitEvent(dataNode, property, oldValue, wasOldValueProxy, value, isValueProxy, trace) {
    if (oldValue === value // no new change was made
        || !dataNode[ND].proxyNode) { // proxy-node is detached from data-node
        return;
    }
    let proxyNode = dataNode[ND].proxyNode;
    if (proxyNode[NID].status !== PROXY_STATUSES.alive) { // altered a deleted proxy
        return;
    }
    let changeType = EVENTS.update;
    if (value === undefined) {
        changeType = EVENTS.delete;
    }
    else if (oldValue === undefined) {
        changeType = EVENTS.create;
    }
    let deferredEvents;
    // altering properties of an array that's in the middle of a splicing phase
    if (dataNode[NID].status === NODE_STATUSES.splicing) {
        // initiate (if needed) an object to hold side effect events
        if (!dataNode[ND].deferredEvents) {
            dataNode[ND].deferredEvents = [];
        }
        // save a reference to the deferredEvents
        deferredEvents = dataNode[ND].deferredEvents;
    }
    let path;
    if (dataNode[property]) { // changed a property which has its own data node on the tree
        dataNode = dataNode[property];
        path = '';
    }
    else {
        path = property2path(proxyNode[ND].target, property);
    }
    let change = {
        path, value, oldValue, type: changeType,
    };
    if (!deferredEvents) {
        // (try to) log before emitting the event
        stackTraceLog(dataNode, change, trace);
        bubbleEmit(dataNode, change, property);
        if (wasOldValueProxy || isValueProxy) { // old value or new value are proxy meaning they are objects with children
            captureEmit(dataNode, change);
        }
    }
    else {
        deferredEvents.push({ dataNode, change, shouldCapture: wasOldValueProxy || isValueProxy });
    }
}
/**
 * bubbling phase - go up the data tree and emit
 * @param dataNode
 * @param change
 * @param property - property name of the data-node (i.e. as the data-node is assigned to its parent)
 */
function bubbleEmit(dataNode, change, property) {
    if (dataNode[NID].status === NODE_STATUSES.stopped) {
        return; // not allowed to emit
    }
    let thisValue = getProxyValue(dataNode, property);
    if (change.path === '') { // iterate over 'shallow' listeners
        iterateAndEmit(dataNode[ND].listeners.shallow, thisValue, change);
    }
    // iterate over 'deep' listeners
    iterateAndEmit(dataNode[ND].listeners.deep, thisValue, change);
    if (!dataNode[ND].parentNode[ND].isTreePrototype) { // we are not on root node yet
        // create a shallow copy of 'change' and update its path
        // (we don't want to alter the 'change' object that was just emitted to a listener)
        let nextChange = {
            ...change,
            path: dataNode[ND].propertyPath + change.path
        };
        bubbleEmit(dataNode[ND].parentNode, nextChange);
    }
}
/**
 * capturing phase - go down the data tree and emit
 * @param dataNode
 * @param change
 */
function captureEmit(dataNode, change) {
    let keys = Object.keys(dataNode);
    for (let key of keys) {
        let subValue = (typeof change.value === 'object' && change.value !== null) ? change.value[key] : undefined;
        let subOldValue = (typeof change.oldValue === 'object' && change.oldValue !== null) ? change.oldValue[key] : undefined;
        if (subValue !== subOldValue) { //if not both undefined or same primitive or the same object
            let changeType = EVENTS.update;
            if (subValue === undefined) {
                changeType = EVENTS.delete;
            }
            else if (subOldValue === undefined) {
                changeType = EVENTS.create;
            }
            let subChange = {
                path: '',
                oldValue: subOldValue,
                value: subValue,
                type: changeType
            };
            // failing the status check will not emit for current property (but sub-properties might still be forcibly active)
            let childNode = dataNode[key];
            if (childNode[NID].status !== NODE_STATUSES.stopped) {
                let thisValue = getProxyValue(childNode, key);
                iterateAndEmit(childNode[ND].listeners.shallow, thisValue, subChange);
            }
            captureEmit(childNode, subChange);
        }
    }
}
/**
 * iterate over an array of listeners, handle 'once' listeners and emit
 * @param listenersArr
 * @param thisValue
 * @param change
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
/**
 * process special event for a built-in method and then bubble up the data tree
 * @param dataNode
 * @param funcName - the method's name
 * @param funcArgs - the method's arguments
 * @param oldValue
 * @param value
 */
function initFunctionEmitEvent(dataNode, funcName, funcArgs, oldValue, value, trace) {
    let change = {
        path: '', value, oldValue, type: funcName, args: funcArgs,
    };
    // (try to) log before emitting the event
    stackTraceLog(dataNode, change, trace);
    bubbleEmit(dataNode, change);
    if (dataNode[ND].deferredEvents) {
        // manually handle the side-effect events that were caught
        // in order to not bubble up, but should capture down
        for (let event of dataNode[ND].deferredEvents) {
            if (event.change.path === '') {
                // no path means its an event directly on the property, not on the parent.
                // i.e: not an event with path "0" on ".arr", but an event with no path on ".arr[0]".
                // function event on "arr" already ran, but now a regular event on "arr[0]" is due
                let thisValue = getProxyValue(event.dataNode);
                iterateAndEmit(event.dataNode[ND].listeners.shallow, thisValue, event.change);
                iterateAndEmit(event.dataNode[ND].listeners.deep, thisValue, event.change);
            }
            if (event.shouldCapture) {
                captureEmit(event.dataNode, event.change);
            }
        }
        delete dataNode[ND].deferredEvents;
    }
    else {
        console.warn(`no side effect events for ${funcName} were made`);
    }
}

/**
 * 2023 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
const splice = function splice(start, deleteCount, ...items) {
    if (this.dataNode[NID].status !== NODE_STATUSES.active) {
        // if not active then run regular `splice`
        // which will reach the `set` of the ProxyHandler and will be blocked or events stopped, etc.
        return Array.prototype.splice.call(this.proxyNode[ND].proxy, start, deleteCount, ...items);
    }
    let isActiveByInheritance = !this.dataNode[NID].hasOwnProperty('status');
    this.dataNode[NID].status = NODE_STATUSES.splicing;
    let oldValue = this.proxyNode[ND].target.slice(0);
    let deleted = Array.prototype.splice.call(this.proxyNode[ND].proxy, start, deleteCount, ...items); // creates many side-effect events
    let args = { start, deleteCount, items };
    if (isActiveByInheritance) {
        delete this.dataNode[NID].status;
    }
    else {
        this.dataNode[NID].status = NODE_STATUSES.active;
    }
    initFunctionEmitEvent(this.dataNode, EVENTS.splice, args, oldValue, this.proxyNode[ND].target, this.metadata.trace);
    return deleted;
};
const shift = function shift() {
    if (this.dataNode[NID].status !== NODE_STATUSES.active) {
        // if not active then run regular `shift`
        // which will reach the `set` of the ProxyHandler and will be blocked or events stopped, etc.
        return Array.prototype.shift.call(this.proxyNode[ND].proxy);
    }
    let isActiveByInheritance = !this.dataNode[NID].hasOwnProperty('status');
    this.dataNode[NID].status = NODE_STATUSES.splicing;
    let oldValue = this.proxyNode[ND].target.slice(0);
    let deleted = Array.prototype.shift.call(this.proxyNode[ND].proxy); // creates many side-effect events
    if (isActiveByInheritance) {
        delete this.dataNode[NID].status;
    }
    else {
        this.dataNode[NID].status = NODE_STATUSES.active;
    }
    initFunctionEmitEvent(this.dataNode, EVENTS.shift, {}, oldValue, this.proxyNode[ND].target, this.metadata.trace);
    return deleted;
};
const unshift = function unshift(...items) {
    if (this.dataNode[NID].status !== NODE_STATUSES.active) {
        // if not active then run regular `unshift`
        // which will reach the `set` of the ProxyHandler and will be blocked or events stopped, etc.
        return Array.prototype.unshift.call(this.proxyNode[ND].proxy, ...items);
    }
    let isActiveByInheritance = !this.dataNode[NID].hasOwnProperty('status');
    this.dataNode[NID].status = NODE_STATUSES.splicing;
    let oldValue = this.proxyNode[ND].target.slice(0);
    let newLength = Array.prototype.unshift.call(this.proxyNode[ND].proxy, ...items); // creates many side-effect events
    let args = { items };
    if (isActiveByInheritance) {
        delete this.dataNode[NID].status;
    }
    else {
        this.dataNode[NID].status = NODE_STATUSES.active;
    }
    initFunctionEmitEvent(this.dataNode, EVENTS.unshift, args, oldValue, this.proxyNode[ND].target, this.metadata.trace);
    return newLength;
};

var proxyMethods = /*#__PURE__*/Object.freeze({
    __proto__: null,
    shift: shift,
    splice: splice,
    unshift: unshift
});

const DONT_PROXIFY_PREFIX = '_$';
const PSEUDO_METHODS_ALTERNATIVE_NAMING_PREFIX = '$';

/**
 * 2023 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
/**
 * save an array of all reserved function names
 * and also add synonyms to these functions
 */
let pseudoMethodsNames = Object.keys(pseudoMethods);
let pseudoMethodsExtended = {};
for (let i = pseudoMethodsNames.length - 1; i >= 0; i--) {
    let name = pseudoMethodsNames[i];
    let synonym = PSEUDO_METHODS_ALTERNATIVE_NAMING_PREFIX + name;
    pseudoMethodsNames.push(synonym);
    pseudoMethodsExtended[name] = pseudoMethods[name];
    pseudoMethodsExtended[synonym] = pseudoMethods[name];
}
class Proxserve {
    /**
     * make a new proxserve instance
     */
    static make(target, options = {}) {
        var _a, _b;
        const { strict = true, methodsEmitRaw = false, name = '', debug, } = options;
        const destroyDelay = (_a = debug === null || debug === void 0 ? void 0 : debug.destroyDelay) !== null && _a !== void 0 ? _a : 1000;
        const trace = (_b = debug === null || debug === void 0 ? void 0 : debug.trace) !== null && _b !== void 0 ? _b : 'none';
        let dataTreePrototype = {
            [NID]: {
                status: NODE_STATUSES.active,
                name,
            },
            [ND]: { isTreePrototype: true },
        };
        let proxyTreePrototype = {
            [NID]: { status: PROXY_STATUSES.alive },
            [ND]: { isTreePrototype: true },
        };
        const newNodes = createNodes(dataTreePrototype, '', proxyTreePrototype, target);
        const metadata = {
            strict,
            methodsEmitRaw,
            destroyDelay,
            trace,
            dataTree: newNodes.dataNode,
            proxyTree: newNodes.proxyNode,
        };
        return Proxserve.createProxy(metadata, metadata.dataTree);
    }
    /**
     * create a new proxy and a new node for a property of the parent's target-object
     */
    static createProxy(metadata, parentDataNode, targetProperty) {
        const parentProxyNode = parentDataNode[ND].proxyNode;
        let dataNode;
        let proxyNode;
        if (targetProperty === undefined) { //refering to own node and not a child property (meaning root object)
            dataNode = parentDataNode;
            proxyNode = parentProxyNode;
        }
        else {
            //create new or reset an existing data-node and then creates a new proxy-node
            const newNodes = createNodes(parentDataNode, targetProperty, parentProxyNode, parentProxyNode[ND].target[targetProperty]);
            dataNode = newNodes.dataNode;
            proxyNode = newNodes.proxyNode;
        }
        const target = proxyNode[ND].target;
        const typeoftarget = realtypeof(target);
        if (proxyTypes[typeoftarget]) {
            const revocable = Proxy.revocable(target, {
                get: (target /*same as parent scope 'target'*/, property, proxy) => {
                    if (metadata.methodsEmitRaw === false && Object.prototype.hasOwnProperty.call(proxyMethods, property) && property in Object.getPrototypeOf(target)) {
                        // use a proxy method instead of the built-in method that is on the prototype chain
                        return proxyMethods[property].bind({ metadata, dataNode, proxyNode });
                    }
                    else if (pseudoMethodsNames.includes(property) && typeof target[property] === 'undefined') {
                        // can access a pseudo function (or its synonym) if their keywords isn't used
                        return pseudoMethodsExtended[property].bind({ metadata, dataNode, proxyNode });
                    }
                    else if (!target.propertyIsEnumerable(property) || typeof property === 'symbol') {
                        return target[property]; // non-enumerable or non-path'able aren't proxied
                    }
                    else if (proxyNode[property] // there's a child node
                        && proxyNode[property][ND].proxy // it holds a proxy
                        && proxyNode[property][NID].status === PROXY_STATUSES.alive) {
                        return proxyNode[property][ND].proxy;
                    }
                    else {
                        return target[property];
                    }
                },
                set: (target /*same as parent scope 'target'*/, property, value, proxy) => {
                    /**
                     * property can be a regular object because of a few possible reasons:
                     * 1. proxy is deleted from tree but user keeps accessing it then it means he saved a reference.
                     * 2. it is a non-enumerable property which means it was intentionally hidden.
                     * 3. property is a symbol and symbols can't be proxied because we can't create a normal path for them.
                     *    these properties are not proxied and should not emit change-event.
                     *    except for: length
                     * 4. property is manually set as raw object with the special prefix.
                     * TODO - make a list of all possible properties exceptions (maybe function 'name'?)
                     */
                    if (dataNode[NID].status === NODE_STATUSES.blocked) { //blocked from changing values
                        console.error('object is blocked. can\'t change value of property:', property);
                        return true;
                    }
                    else if (typeof property === 'symbol'
                        || property.startsWith(DONT_PROXIFY_PREFIX)) {
                        target[property] = value;
                        return true;
                    }
                    else if (property !== 'length' && !target.propertyIsEnumerable(property)) {
                        //if setting a whole new property then it is non-enumerable (yet) so a further test is needed
                        let descriptor = Object.getOwnPropertyDescriptor(target, property);
                        if (typeof descriptor === 'object' && descriptor.enumerable === false) { //property was previously set
                            target[property] = value;
                            return true;
                        }
                    }
                    let oldValue = target[property]; // should not be proxy
                    let isOldValueProxy = false;
                    if (proxyNode[property] !== undefined && proxyNode[property][ND].proxy !== undefined) {
                        // about to overwrite an existing property which is a proxy (about to detach a proxy)
                        proxyNode[property][NID].status = PROXY_STATUSES.deleted;
                        delete dataNode[property][ND].proxyNode; // detach reference from data-node to proxy-node
                        isOldValueProxy = true;
                        if (metadata.strict) {
                            // postpone this cpu intense function for later, probably when proxserve is not in use
                            setTimeout(Proxserve.destroy, metadata.destroyDelay, proxyNode[property][ND].proxy);
                        }
                    }
                    value = unproxify(value);
                    target[property] = value; //assign new value
                    let isValueProxy = false;
                    let typeofvalue = realtypeof(value);
                    if (proxyTypes[typeofvalue]) {
                        Proxserve.createProxy(metadata, dataNode, property); // if trying to add a new value which is an object then make it a proxy
                        isValueProxy = true;
                    }
                    initEmitEvent(dataNode, property, oldValue, isOldValueProxy, value, isValueProxy, metadata.trace);
                    return true;
                },
                /**
                 * TODO - this function is incomplete and doesn't handle all of 'descriptor' scenarios
                 */
                defineProperty: (target /*same as parent scope 'target'*/, property, descriptor) => {
                    if (typeof property === 'symbol') {
                        Object.defineProperty(target, property, descriptor);
                        return true;
                    }
                    let oldValue = target[property]; //should not be proxy
                    let isOldValueProxy = false;
                    if (proxyNode[property] !== undefined && proxyNode[property][ND].proxy !== undefined) {
                        //about to overwrite an existing property which is a proxy (about to detach a proxy)
                        proxyNode[property][NID].status = PROXY_STATUSES.deleted;
                        delete dataNode[property][ND].proxyNode; //detach reference from data-node to proxy-node
                        isOldValueProxy = true;
                        if (metadata.strict) {
                            //postpone this cpu intense function for later, probably when proxserve is not is use
                            setTimeout(Proxserve.destroy, metadata.destroyDelay, proxyNode[property][ND].proxy);
                        }
                    }
                    descriptor.value = unproxify(descriptor.value);
                    Object.defineProperty(target, property, descriptor); //defining the new value
                    let value = descriptor.value;
                    let isValueProxy = false;
                    //excluding non-enumerable properties from being proxied
                    let typeofvalue = realtypeof(descriptor.value);
                    if (proxyTypes[typeofvalue] && descriptor.enumerable === true) {
                        Proxserve.createProxy(metadata, dataNode, property); //if trying to add a new value which is an object then make it a proxy
                        isValueProxy = true;
                    }
                    initEmitEvent(dataNode, property, oldValue, isOldValueProxy, value, isValueProxy, metadata.trace);
                    return true;
                },
                deleteProperty: (target /*same as parent scope 'target'*/, property) => {
                    if (!target.propertyIsEnumerable(property) || typeof property === 'symbol') {
                        //non-proxied properties simply get deleted and nothing more
                        delete target[property];
                        return true;
                    }
                    if (dataNode[NID].status === NODE_STATUSES.blocked) { //blocked from changing values
                        console.error(`can't delete property '${property}'. object is blocked.`);
                        return true;
                    }
                    if (property in target) {
                        let oldValue = target[property]; //should not be proxy
                        let isOldValueProxy = false;
                        if (proxyNode[property] !== undefined && proxyNode[property][ND].proxy !== undefined) {
                            //about to overwrite an existing property which is a proxy (about to detach a proxy)
                            proxyNode[property][NID].status = PROXY_STATUSES.deleted;
                            delete dataNode[property][ND].proxyNode; //detach reference from data-node to proxy-node
                            isOldValueProxy = true;
                            if (metadata.strict) {
                                //postpone this cpu intense function for later, probably when proxserve is not is use
                                setTimeout(Proxserve.destroy, metadata.destroyDelay, proxyNode[property][ND].proxy);
                            }
                        }
                        delete target[property]; // actual delete
                        initEmitEvent(dataNode, property, oldValue, isOldValueProxy, undefined, false, metadata.trace);
                        return true;
                    }
                    else {
                        return true; //do nothing because there's nothing to delete
                    }
                }
            });
            proxyNode[ND].proxy = revocable.proxy;
            proxyNode[ND].revoke = revocable.revoke;
            if (proxyTypes[typeoftarget]) {
                let keys = Object.keys(target); //handles both Objects and Arrays
                for (let key of keys) {
                    if (key.startsWith(DONT_PROXIFY_PREFIX)) {
                        continue;
                    }
                    let typeofproperty = realtypeof(target[key]);
                    if (proxyTypes[typeofproperty]) {
                        Proxserve.createProxy(metadata, dataNode, key); //recursively make child objects also proxies
                    }
                }
            }
            else {
                console.warn(`Type of "${typeoftarget}" is not implemented`);
            }
            return revocable.proxy;
        }
        else {
            const types = Object.keys(proxyTypes);
            throw new Error(`Must observe an ${types.join('/')}`);
        }
    }
    /**
     * Recursively revoke proxies, allowing them to be garbage collected.
     * this functions delays 1000 milliseconds to let time for all events to finish
     */
    static destroy(proxy) {
        var _a, _b;
        let proxyNode;
        try {
            const nodes = proxy.$getProxserveNodes();
            proxyNode = nodes.proxyNode;
        }
        catch (error) {
            return; // proxy variable isn't a proxy
        }
        if (proxyNode[NID].status === PROXY_STATUSES.alive) {
            proxyNode[NID].status = PROXY_STATUSES.deleted;
        }
        let typeofproxy = realtypeof(proxy);
        if (proxyTypes[typeofproxy]) {
            let keys = Object.keys(proxy); // handles both Objects and Arrays
            for (let key of keys) {
                if (key.startsWith(DONT_PROXIFY_PREFIX)) {
                    continue;
                }
                try {
                    let typeofproperty = realtypeof(proxy[key]);
                    if (proxyTypes[typeofproperty]) {
                        // going to proxy[key], which is deleted, will return the original target so we will bypass it
                        Proxserve.destroy(proxyNode[key][ND].proxy);
                    }
                }
                catch (error) {
                    console.error(error); // don't throw and kill the whole process just if this iteration fails
                }
            }
            (_b = (_a = proxyNode[ND]).revoke) === null || _b === void 0 ? void 0 : _b.call(_a);
            //proxyNode[ND].proxy = undefined;
            proxyNode[NID].status = PROXY_STATUSES.revoked;
        }
        else {
            console.warn(`Type of "${typeofproxy}" is not implemented`);
        }
    }
    /**
     * splits a path to an array of properties
     */
    static splitPath(path) {
        return splitPath(path);
    }
    /**
     * evaluate a long path and return the designated object and its referred property
     */
    static evalPath(obj, path) {
        return evalPath(obj, path);
    }
}

export { Proxserve };
