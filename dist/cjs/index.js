function $parcel$export(e, n, v, s) {
  Object.defineProperty(e, n, {get: v, set: s, enumerable: true, configurable: true});
}

$parcel$export(module.exports, "Proxserve", () => $758ea81f4f7b53ee$export$d402cf8388053971);
/**
 * Copyright 2021 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */ "use strict";
const $518557bad313f8f1$export$f7e0aa381a5261fc = Symbol.for('proxserve_node_data'); // key for the data of a node
const $518557bad313f8f1$export$d1c20e4ad7d32581 = Symbol.for('proxserve_node_inherited_data'); // key for the inherited data of a node
const $518557bad313f8f1$export$94b8be4ec3303efd = {
    "Object": true,
    "Array": true
};
var $518557bad313f8f1$export$eb0c55c6f2ee7170;
(function(nodeStatuses) {
    nodeStatuses["ACTIVE"] = 'active';
    nodeStatuses["STOPPED"] = 'stopped';
    nodeStatuses["BLOCKED"] = 'blocked';
    nodeStatuses["SPLICING"] = 'splicing';
})($518557bad313f8f1$export$eb0c55c6f2ee7170 || ($518557bad313f8f1$export$eb0c55c6f2ee7170 = {
}));
var $518557bad313f8f1$export$89e04a1d3d3065f6;
(function(proxyStatuses) {
    proxyStatuses["ALIVE"] = 'alive';
    proxyStatuses["DELETED"] = 'deleted';
    proxyStatuses["REVOKED"] = 'revoked';
})($518557bad313f8f1$export$89e04a1d3d3065f6 || ($518557bad313f8f1$export$89e04a1d3d3065f6 = {
}));
var $518557bad313f8f1$export$4a2e650c134b86af;
(function(eventNames) {
    eventNames["create"] = "create";
    eventNames["update"] = "update";
    eventNames["delete"] = "delete";
    eventNames["splice"] = "splice";
    eventNames["shift"] = "shift";
    eventNames["unshift"] = "unshift";
})($518557bad313f8f1$export$4a2e650c134b86af || ($518557bad313f8f1$export$4a2e650c134b86af = {
}));



/**
 * Copyright 2021 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */ "use strict";
function $e3f4344113dd8ef0$export$99a2acdf670c1bf4(variable) {
    let rawType = Object.prototype.toString.call(variable); //[object Object], [object Array], [object Number]...
    return rawType.substring(8, rawType.length - 1);
}
/**
 * check if variable is a number or a string of a number
 * @param variable 
 */ /*export function isNumeric(variable: any): boolean {
	if(typeof variable === 'string' && variable === '') {
		return false;
	}
	
	return !isNaN(variable as number);
}*/ /**
 * recursively clones objects and array
 */ const $e3f4344113dd8ef0$var$simpleCloneSet = new WeakSet();
function $e3f4344113dd8ef0$export$d6f7d8248ac0a979(variable) {
    let typeofvar = $e3f4344113dd8ef0$export$99a2acdf670c1bf4(variable);
    if (typeofvar === 'Object') {
        const obj = variable;
        $e3f4344113dd8ef0$var$simpleCloneSet.add(obj);
        const cloned = {
        };
        let keys = Object.keys(obj);
        for (let key of keys)if ($e3f4344113dd8ef0$var$simpleCloneSet.has(obj[key])) cloned[key] = obj[key];
        else cloned[key] = $e3f4344113dd8ef0$export$d6f7d8248ac0a979(obj[key]);
        return cloned;
    } else if (typeofvar === 'Array') {
        const arr = variable;
        $e3f4344113dd8ef0$var$simpleCloneSet.add(arr);
        const cloned = [];
        for(let i = 0; i < arr.length; i++)if ($e3f4344113dd8ef0$var$simpleCloneSet.has(arr[i])) cloned[i] = arr[i];
        else cloned[i] = $e3f4344113dd8ef0$export$d6f7d8248ac0a979(arr[i]);
        return cloned;
    } else {
        if (typeofvar !== 'Undefined' && typeofvar !== 'Null' && typeofvar !== 'Boolean' && typeofvar !== 'Number' && typeofvar !== 'BigInt' && typeofvar !== 'String') console.warn(`Can't clone a variable of type ${typeofvar}`);
        return variable;
    }
}
function $e3f4344113dd8ef0$export$824c337f43f2b64d(path) {
    if (typeof path !== 'string' || path === '') return [];
    let i = 0, betweenBrackets = false, onlyDigits = false;
    //loop will skip over openning '.' or '['
    if (path[0] === '.') i = 1;
    else if (path[0] === '[') {
        i = 1;
        betweenBrackets = true;
        onlyDigits = true;
    }
    let resultsArr = [];
    let tmp = '';
    for(; i < path.length; i++){
        let char = path[i];
        if (betweenBrackets) {
            if (char === ']') {
                if (onlyDigits) resultsArr.push(parseInt(tmp, 10));
                else resultsArr.push(tmp);
                betweenBrackets = false;
                onlyDigits = false;
                tmp = '';
            } else {
                if (onlyDigits) {
                    let code = char.charCodeAt(0);
                    if (code < 48 || code > 57) onlyDigits = false;
                }
                tmp += char;
            }
        } else {
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
            } else tmp += char;
        }
    }
    if (tmp !== '') resultsArr.push(tmp);
    return resultsArr;
}
function $e3f4344113dd8ef0$export$8ffa680996c65fde(obj, path) {
    if (path === '') return {
        object: obj,
        property: undefined,
        value: obj
    };
    let segments = $e3f4344113dd8ef0$export$824c337f43f2b64d(path);
    let i;
    for(i = 0; i <= segments.length - 2; i++){
        obj = obj[segments[i]];
        if (typeof obj === 'undefined') throw new Error(`Invalid path was given - "${path}"`);
    }
    return {
        object: obj,
        property: segments[i],
        value: obj[segments[i]]
    };
}


/**
 * Copyright 2021 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */ "use strict";
function $d613cdccf4e92ac6$export$1b787634d8e3bf02(obj, property) {
    if (typeof property === 'symbol') throw new Error(`property of type "symbol" isn't path'able`);
    const typeofobj = $e3f4344113dd8ef0$export$99a2acdf670c1bf4(obj);
    switch(typeofobj){
        case 'Object':
            return `.${property}`;
        case 'Array':
            return `[${property}]`;
        default:
            console.warn(`Not Implemented (type of '${typeofobj}')`);
            return property;
    }
}
function $d613cdccf4e92ac6$export$a58c3ed528c9c399(value) {
    const typeofvalue = $e3f4344113dd8ef0$export$99a2acdf670c1bf4(value);
    if ($518557bad313f8f1$export$94b8be4ec3303efd[typeofvalue]) {
        let target = value;
        try {
            target = value.$getOriginalTarget();
        } catch (error) {
        }
        switch(typeofvalue){
            case 'Object':
                let keys = Object.keys(target);
                for (let key of keys)target[key] = $d613cdccf4e92ac6$export$a58c3ed528c9c399(target[key]); // maybe alters target and maybe returning the exact same object
                break;
            case 'Array':
                for(let i = 0; i < target.length; i++)target[i] = $d613cdccf4e92ac6$export$a58c3ed528c9c399(target[i]); // maybe alters target and maybe returning the exact same object
                break;
            default:
                console.warn(`Not Implemented (type of '${typeofvalue}')`);
        }
        return target;
    } else return value; // primitive
}
function $d613cdccf4e92ac6$export$953dd193a01bd6ec(parentDataNode, parentProxyNode, property, target) {
    //handle property path
    let propertyPath;
    if (parentProxyNode === null || parentProxyNode === void 0 ? void 0 : parentProxyNode[$518557bad313f8f1$export$f7e0aa381a5261fc].target) propertyPath = $d613cdccf4e92ac6$export$1b787634d8e3bf02(parentProxyNode[$518557bad313f8f1$export$f7e0aa381a5261fc].target, property);
    else propertyPath = $d613cdccf4e92ac6$export$1b787634d8e3bf02({
    }, property); // if parent doesn't have target then treat it as object
    //handle data node
    let dataNode = parentDataNode[property]; // try to receive existing data-node
    if (!dataNode) {
        dataNode = {
            [$518557bad313f8f1$export$d1c20e4ad7d32581]: Object.create(parentDataNode[$518557bad313f8f1$export$d1c20e4ad7d32581]),
            [$518557bad313f8f1$export$f7e0aa381a5261fc]: {
                parentNode: parentDataNode,
                listeners: {
                    shallow: [],
                    deep: []
                }
            }
        };
        parentDataNode[property] = dataNode;
    }
    delete dataNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status; // clears old status in case a node previously existed
    // updates path (for rare case where parent was array and then changed to object or vice versa)
    if (!parentDataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].isTreePrototype) Object.assign(dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc], {
        path: parentDataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].path + propertyPath,
        propertyPath: propertyPath
    });
    else Object.assign(dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc], {
        path: '',
        propertyPath: ''
    });
    //handle proxy node
    let proxyNode;
    if (parentProxyNode) {
        proxyNode = {
            [$518557bad313f8f1$export$d1c20e4ad7d32581]: Object.create(parentProxyNode[$518557bad313f8f1$export$d1c20e4ad7d32581]),
            [$518557bad313f8f1$export$f7e0aa381a5261fc]: {
                target: target,
                dataNode: dataNode
            }
        };
        parentProxyNode[property] = proxyNode;
        //attach nodes to each other
        dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].proxyNode = proxyNode;
    }
    return {
        dataNode: dataNode,
        proxyNode: proxyNode
    };
}


var $62e27656781218cb$exports = {};

$parcel$export($62e27656781218cb$exports, "stop", () => $62e27656781218cb$export$fa6813432f753b0d);
$parcel$export($62e27656781218cb$exports, "block", () => $62e27656781218cb$export$837bd02682cd3db9);
$parcel$export($62e27656781218cb$exports, "activate", () => $62e27656781218cb$export$234c45b355edd85b);
$parcel$export($62e27656781218cb$exports, "on", () => $62e27656781218cb$export$af631764ddc44097);
$parcel$export($62e27656781218cb$exports, "once", () => $62e27656781218cb$export$d2de3aaeafa91619);
$parcel$export($62e27656781218cb$exports, "removeListener", () => $62e27656781218cb$export$b03e9483f936dccb);
$parcel$export($62e27656781218cb$exports, "removeAllListeners", () => $62e27656781218cb$export$6f2e3a6079f109b1);
$parcel$export($62e27656781218cb$exports, "getOriginalTarget", () => $62e27656781218cb$export$35f261dd63190ac1);
$parcel$export($62e27656781218cb$exports, "getProxserveNodes", () => $62e27656781218cb$export$c3c6db5039118967);
$parcel$export($62e27656781218cb$exports, "getProxserveInstance", () => $62e27656781218cb$export$8caee43385408ac4);



/**
 * Copyright 2021 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */ // Pseudo methods are methods that aren't really on the object - not as a property nor via its prototype
// thus they will not be retrieved via "for..in" and etcetera. Their property name is actually undefined, but
// calling it will return the method via the JS proxy's "get" handler.
// (i.e. someProxserve.pseudoFunction will return the pseudoFunction)
"use strict";
function $62e27656781218cb$export$fa6813432f753b0d(dataNode) {
    dataNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status = $518557bad313f8f1$export$eb0c55c6f2ee7170.STOPPED;
}
function $62e27656781218cb$export$837bd02682cd3db9(dataNode) {
    dataNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status = $518557bad313f8f1$export$eb0c55c6f2ee7170.BLOCKED;
}
function $62e27656781218cb$export$234c45b355edd85b(dataNode, proxyNode, force = false) {
    if (force || dataNode === this.dataTree) dataNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status = $518557bad313f8f1$export$eb0c55c6f2ee7170.ACTIVE;
    else delete dataNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status;
}
function $62e27656781218cb$export$af631764ddc44097(dataNode, proxyNode, events, path, listener, options) {
    let { deep: deep = false , id: id , once: once = false  } = options;
    if (events === 'change') events = Object.keys($518557bad313f8f1$export$4a2e650c134b86af); // will listen to all events
    else if (!Array.isArray(events)) events = [
        events
    ];
    for (let event of events)if (!$518557bad313f8f1$export$4a2e650c134b86af[event]) {
        const names = Object.keys($518557bad313f8f1$export$4a2e650c134b86af);
        throw new Error(`${event} is not a valid event. valid events are ${names.join(',')}`);
    }
    if (typeof path === 'function') {
        if (typeof listener === 'object') {
            const optionsFromListener = listener;
            if (typeof optionsFromListener.deep === 'boolean') deep = optionsFromListener.deep;
            if (optionsFromListener.id !== undefined) id = optionsFromListener.id;
            if (typeof optionsFromListener.once === 'boolean') once = optionsFromListener.once;
        }
        listener = path;
        path = '';
    } else if (typeof listener !== 'function') throw new Error(`invalid arguments were given. listener must be a function`);
    let segments = $e3f4344113dd8ef0$export$824c337f43f2b64d(path);
    for (let property of segments){
        if (!dataNode[property]) $d613cdccf4e92ac6$export$953dd193a01bd6ec(dataNode, undefined, property, undefined);
        dataNode = dataNode[property];
    }
    let listenersPool = dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].listeners.shallow;
    if (deep) listenersPool = dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].listeners.deep;
    let listenerObj = {
        type: events,
        once: once,
        func: listener
    };
    if (id !== undefined) listenerObj.id = id;
    listenersPool.push(listenerObj);
}
function $62e27656781218cb$export$d2de3aaeafa91619(dataNode, proxyNode, events, path, listener, options) {
    if (typeof options !== 'object') options = {
    };
    options.once = true;
    $62e27656781218cb$export$af631764ddc44097.call(this, dataNode, proxyNode, events, path, listener, options);
}
function $62e27656781218cb$var$removeById(listenersArr, id) {
    for(let i = listenersArr.length - 1; i >= 0; i--){
        let listenerObj = listenersArr[i];
        if (id !== undefined && listenerObj.id === id || listenerObj.func === id) listenersArr.splice(i, 1);
    }
}
function $62e27656781218cb$export$b03e9483f936dccb(dataNode, proxyNode, path, id) {
    if (arguments.length === 3) {
        id = path;
        path = '';
    }
    let fullPath = `${dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].path}${path}`;
    let segments = $e3f4344113dd8ef0$export$824c337f43f2b64d(path);
    // traverse down the tree
    for (let property of segments){
        if (!dataNode[property]) {
            console.warn(`can't remove listener from a non-existent path '${fullPath}'`);
            return;
        }
        dataNode = dataNode[property];
    }
    $62e27656781218cb$var$removeById(dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].listeners.shallow, id);
    $62e27656781218cb$var$removeById(dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].listeners.deep, id);
}
function $62e27656781218cb$export$6f2e3a6079f109b1(dataNode, proxyNode, path = '') {
    let fullPath = `${dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].path}${path}`;
    let segments = $e3f4344113dd8ef0$export$824c337f43f2b64d(path);
    //traverse down the tree
    for (let property of segments){
        if (!dataNode[property]) {
            console.warn(`can't remove all listeners from a non-existent path '${fullPath}'`);
            return;
        }
        dataNode = dataNode[property];
    }
    dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].listeners.shallow = [];
    dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].listeners.deep = [];
}
function $62e27656781218cb$export$35f261dd63190ac1(dataNode, proxyNode) {
    return proxyNode[$518557bad313f8f1$export$f7e0aa381a5261fc].target;
}
function $62e27656781218cb$export$c3c6db5039118967(dataNode, proxyNode) {
    return {
        dataNode: dataNode,
        proxyNode: proxyNode
    };
}
function $62e27656781218cb$export$8caee43385408ac4() {
    return this;
}


var $ac07f5587380cee0$exports = {};

$parcel$export($ac07f5587380cee0$exports, "splice", () => $ac07f5587380cee0$export$869882364835d202);
$parcel$export($ac07f5587380cee0$exports, "shift", () => $ac07f5587380cee0$export$fba63a578e423eb);
$parcel$export($ac07f5587380cee0$exports, "unshift", () => $ac07f5587380cee0$export$37cdb546b806ae87);




/**
 * Copyright 2021 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */ "use strict";
/**
 * try to get the proxy-object from a data-node. if can't then from it's parent's proxy
 * @param dataNode 
 * @param [property] - the property as the dataNode is assigned on its parent
 */ function $7b3021a3226a950a$var$getProxyValue(dataNode, property) {
    if (dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].proxyNode && dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].proxyNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status === $518557bad313f8f1$export$89e04a1d3d3065f6.ALIVE) return dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].proxyNode[$518557bad313f8f1$export$f7e0aa381a5261fc].proxy; // actual proxy of child node
    else {
        if (!property) // my property on the parent
        property = $e3f4344113dd8ef0$export$824c337f43f2b64d(dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].propertyPath)[0];
        let parentNode = dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].parentNode;
        if (parentNode[$518557bad313f8f1$export$f7e0aa381a5261fc].proxyNode && parentNode[$518557bad313f8f1$export$f7e0aa381a5261fc].proxyNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status === $518557bad313f8f1$export$89e04a1d3d3065f6.ALIVE) return parentNode[$518557bad313f8f1$export$f7e0aa381a5261fc].proxyNode[$518557bad313f8f1$export$f7e0aa381a5261fc].proxy[property]; // proxy or primitive via parent's proxy object
    }
    return undefined;
}
function $7b3021a3226a950a$export$febbc75e71f4ca1b(dataNode, property, oldValue, wasOldValueProxy, value, isValueProxy) {
    if (oldValue === value // no new change was made
     || !dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].proxyNode) return;
    let proxyNode = dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].proxyNode;
    if (proxyNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status !== $518557bad313f8f1$export$89e04a1d3d3065f6.ALIVE) return;
    let changeType = $518557bad313f8f1$export$4a2e650c134b86af.update;
    if (value === undefined) changeType = $518557bad313f8f1$export$4a2e650c134b86af.delete;
    else if (oldValue === undefined) changeType = $518557bad313f8f1$export$4a2e650c134b86af.create;
    let deferredEvents;
    // altering properties of an array that's in the middle of a splicing phase
    if (dataNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status === $518557bad313f8f1$export$eb0c55c6f2ee7170.SPLICING) {
        // initiate (if needed) an object to hold side effect events
        if (!dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].deferredEvents) dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].deferredEvents = [];
        // save a reference to the deferredEvents
        deferredEvents = dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].deferredEvents;
    }
    let path;
    if (dataNode[property]) {
        dataNode = dataNode[property];
        path = '';
    } else path = $d613cdccf4e92ac6$export$1b787634d8e3bf02(proxyNode[$518557bad313f8f1$export$f7e0aa381a5261fc].target, property);
    let change = {
        path: path,
        value: value,
        oldValue: oldValue,
        type: changeType
    };
    if (!deferredEvents) {
        $7b3021a3226a950a$var$bubbleEmit(dataNode, change, property);
        if (wasOldValueProxy || isValueProxy) $7b3021a3226a950a$var$captureEmit(dataNode, change);
    } else deferredEvents.push({
        dataNode: dataNode,
        change: change,
        shouldCapture: wasOldValueProxy || isValueProxy
    });
}
/**
 * bubbling phase - go up the data tree and emit
 * @param dataNode
 * @param change
 * @param [property] - property name of the data-node (i.e. as the data-node is assigned to its parent)
 */ function $7b3021a3226a950a$var$bubbleEmit(dataNode, change, property) {
    if (dataNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status === $518557bad313f8f1$export$eb0c55c6f2ee7170.STOPPED) return; // not allowed to emit
    let thisValue = $7b3021a3226a950a$var$getProxyValue(dataNode, property);
    if (change.path === '') $7b3021a3226a950a$var$iterateAndEmit(dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].listeners.shallow, thisValue, change);
    // iterate over 'deep' listeners
    $7b3021a3226a950a$var$iterateAndEmit(dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].listeners.deep, thisValue, change);
    if (!dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].parentNode[$518557bad313f8f1$export$f7e0aa381a5261fc].isTreePrototype) {
        // create a shallow copy of 'change' and update its path
        // (we don't want to alter the 'change' object that was just emitted to a listener)
        let nextChange = {
            ...change,
            path: dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].propertyPath + change.path
        };
        $7b3021a3226a950a$var$bubbleEmit(dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].parentNode, nextChange);
    }
}
/**
 * capturing phase - go down the data tree and emit
 * @param dataNode
 * @param change
 */ function $7b3021a3226a950a$var$captureEmit(dataNode, change) {
    let keys = Object.keys(dataNode);
    for (let key of keys){
        let subValue = typeof change.value === 'object' && change.value !== null ? change.value[key] : undefined;
        let subOldValue = typeof change.oldValue === 'object' && change.oldValue !== null ? change.oldValue[key] : undefined;
        if (subValue !== subOldValue) {
            let changeType = $518557bad313f8f1$export$4a2e650c134b86af.update;
            if (subValue === undefined) changeType = $518557bad313f8f1$export$4a2e650c134b86af.delete;
            else if (subOldValue === undefined) changeType = $518557bad313f8f1$export$4a2e650c134b86af.create;
            let subChange = {
                path: '',
                oldValue: subOldValue,
                value: subValue,
                type: changeType
            };
            // failing the status check will not emit for current property (but sub-properties might still be forcibly active)
            let childNode = dataNode[key];
            if (childNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status !== $518557bad313f8f1$export$eb0c55c6f2ee7170.STOPPED) {
                let thisValue = $7b3021a3226a950a$var$getProxyValue(childNode, key);
                $7b3021a3226a950a$var$iterateAndEmit(childNode[$518557bad313f8f1$export$f7e0aa381a5261fc].listeners.shallow, thisValue, subChange);
            }
            $7b3021a3226a950a$var$captureEmit(childNode, subChange);
        }
    }
}
/**
 * iterate over an array of listeners, handle 'once' listeners and emit
 * @param listenersArr 
 * @param thisValue 
 * @param change 
 */ function $7b3021a3226a950a$var$iterateAndEmit(listenersArr, thisValue, change) {
    for(let i = listenersArr.length - 1; i >= 0; i--){
        let listener = listenersArr[i];
        if (listener.type.includes(change.type)) {
            if (listener.once === true) listenersArr.splice(i, 1);
            listener.func.call(thisValue, change);
        }
    }
}
function $7b3021a3226a950a$export$29f2d3a310653bb4(dataNode, funcName, funcArgs, oldValue, value) {
    let change = {
        path: '',
        value: value,
        oldValue: oldValue,
        type: funcName,
        args: funcArgs
    };
    $7b3021a3226a950a$var$bubbleEmit(dataNode, change);
    if (dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].deferredEvents) {
        // manually handle the side-effect events that were caught
        // in order to not bubble up, but should capture down
        for (let event of dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].deferredEvents){
            if (event.change.path === '') {
                // no path means its an event directly on the property, not on the parent.
                // i.e: not an event with path "0" on ".arr", but an event with no path on ".arr[0]".
                // function event on "arr" already ran, but now a regular event on "arr[0]" is due
                let thisValue = $7b3021a3226a950a$var$getProxyValue(event.dataNode);
                $7b3021a3226a950a$var$iterateAndEmit(event.dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].listeners.shallow, thisValue, event.change);
                $7b3021a3226a950a$var$iterateAndEmit(event.dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].listeners.deep, thisValue, event.change);
            }
            if (event.shouldCapture) $7b3021a3226a950a$var$captureEmit(event.dataNode, event.change);
        }
        delete dataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].deferredEvents;
    } else console.warn(`no side effect events for ${funcName} were made`);
}


/**
 * Copyright 2021 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */ // Proxy methods are methods that will proxy JS built-in methods.
// For examply, the proxy function for "splice" will handle some event stuff and then use
// the actual "splice" function internally
"use strict";
function $ac07f5587380cee0$export$869882364835d202(dataNode, proxyNode, start, deleteCount, ...items) {
    if (dataNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status !== $518557bad313f8f1$export$eb0c55c6f2ee7170.ACTIVE) return Array.prototype.splice.call(proxyNode[$518557bad313f8f1$export$f7e0aa381a5261fc].proxy, start, deleteCount, ...items);
    let isActiveByInheritance = !dataNode[$518557bad313f8f1$export$d1c20e4ad7d32581].hasOwnProperty('status');
    dataNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status = $518557bad313f8f1$export$eb0c55c6f2ee7170.SPLICING;
    let oldValue = proxyNode[$518557bad313f8f1$export$f7e0aa381a5261fc].target.slice(0);
    let deleted = Array.prototype.splice.call(proxyNode[$518557bad313f8f1$export$f7e0aa381a5261fc].proxy, start, deleteCount, ...items); // creates many side-effect events
    let args = {
        start: start,
        deleteCount: deleteCount,
        items: items
    };
    if (isActiveByInheritance) delete dataNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status;
    else dataNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status = $518557bad313f8f1$export$eb0c55c6f2ee7170.ACTIVE;
    $7b3021a3226a950a$export$29f2d3a310653bb4(dataNode, $518557bad313f8f1$export$4a2e650c134b86af.splice, args, oldValue, proxyNode[$518557bad313f8f1$export$f7e0aa381a5261fc].target);
    return deleted;
}
function $ac07f5587380cee0$export$fba63a578e423eb(dataNode, proxyNode) {
    if (dataNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status !== $518557bad313f8f1$export$eb0c55c6f2ee7170.ACTIVE) // if not active then run regular `shift`
    // which will reach the `set` of the ProxyHandler and will be blocked or events stopped, etc.
    return Array.prototype.shift.call(proxyNode[$518557bad313f8f1$export$f7e0aa381a5261fc].proxy);
    let isActiveByInheritance = !dataNode[$518557bad313f8f1$export$d1c20e4ad7d32581].hasOwnProperty('status');
    dataNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status = $518557bad313f8f1$export$eb0c55c6f2ee7170.SPLICING;
    let oldValue = proxyNode[$518557bad313f8f1$export$f7e0aa381a5261fc].target.slice(0);
    let deleted = Array.prototype.shift.call(proxyNode[$518557bad313f8f1$export$f7e0aa381a5261fc].proxy); // creates many side-effect events
    if (isActiveByInheritance) delete dataNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status;
    else dataNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status = $518557bad313f8f1$export$eb0c55c6f2ee7170.ACTIVE;
    $7b3021a3226a950a$export$29f2d3a310653bb4(dataNode, $518557bad313f8f1$export$4a2e650c134b86af.shift, {
    }, oldValue, proxyNode[$518557bad313f8f1$export$f7e0aa381a5261fc].target);
    return deleted;
}
function $ac07f5587380cee0$export$37cdb546b806ae87(dataNode, proxyNode, ...items) {
    if (dataNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status !== $518557bad313f8f1$export$eb0c55c6f2ee7170.ACTIVE) return Array.prototype.shift.call(proxyNode[$518557bad313f8f1$export$f7e0aa381a5261fc].proxy);
    let isActiveByInheritance = !dataNode[$518557bad313f8f1$export$d1c20e4ad7d32581].hasOwnProperty('status');
    dataNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status = $518557bad313f8f1$export$eb0c55c6f2ee7170.SPLICING;
    let oldValue = proxyNode[$518557bad313f8f1$export$f7e0aa381a5261fc].target.slice(0);
    let newLength = Array.prototype.unshift.call(proxyNode[$518557bad313f8f1$export$f7e0aa381a5261fc].proxy, ...items); // creates many side-effect events
    let args = {
        items: items
    };
    if (isActiveByInheritance) delete dataNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status;
    else dataNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status = $518557bad313f8f1$export$eb0c55c6f2ee7170.ACTIVE;
    $7b3021a3226a950a$export$29f2d3a310653bb4(dataNode, $518557bad313f8f1$export$4a2e650c134b86af.unshift, args, oldValue, proxyNode[$518557bad313f8f1$export$f7e0aa381a5261fc].target);
    return newLength;
}




/**
 * Copyright 2021 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */ "use strict";
/**
 * save an array of all reserved function names
 * and also add synonyms to these functions
 */ let $758ea81f4f7b53ee$var$pseudoMethodsNames = Object.keys($62e27656781218cb$exports);
for(let i = $758ea81f4f7b53ee$var$pseudoMethodsNames.length - 1; i >= 0; i--){
    let name = $758ea81f4f7b53ee$var$pseudoMethodsNames[i];
    let synonym = '$' + name;
    $62e27656781218cb$exports[synonym] = $62e27656781218cb$exports[name];
    $758ea81f4f7b53ee$var$pseudoMethodsNames.push(synonym);
}
class $758ea81f4f7b53ee$export$d402cf8388053971 {
    /**
	 * construct a new proxserve instance
	 * @param target 
	 * @param [options]
	 * 	@property [options.strict] - should destroy detached child-objects or deleted properties automatically
	 * 	@property [options.emitMethods] - should splice/shift/unshift emit one event or all CRUD events
	 */ constructor(target2, options = {
    }){
        const { strict: strict = true , emitMethods: emitMethods = true , debug: debug = {
            destroyDelay: 1000
        } ,  } = options;
        this.strict = strict;
        this.emitMethods = emitMethods;
        this.destroyDelay = debug.destroyDelay;
        let dataTreePrototype = {
            [$518557bad313f8f1$export$d1c20e4ad7d32581]: {
                status: $518557bad313f8f1$export$eb0c55c6f2ee7170.ACTIVE
            },
            [$518557bad313f8f1$export$f7e0aa381a5261fc]: {
                isTreePrototype: true
            }
        };
        let proxyTreePrototype = {
            [$518557bad313f8f1$export$d1c20e4ad7d32581]: {
                status: $518557bad313f8f1$export$89e04a1d3d3065f6.ALIVE
            },
            [$518557bad313f8f1$export$f7e0aa381a5261fc]: {
                isTreePrototype: true
            }
        };
        const newNodes = $d613cdccf4e92ac6$export$953dd193a01bd6ec(dataTreePrototype, proxyTreePrototype, '', target2);
        this.dataTree = newNodes.dataNode;
        this.proxyTree = newNodes.proxyNode;
        // `as any` to stop TS from erroring because it wants us to return the `this` object
        // but instead we are returning a different object
        return this.createProxy(this.dataTree);
    }
    /**
	 * create a new proxy and a new node for a property of the parent's target-object
	 * @param {Object} parentDataNode
	 * @param {String} [targetProperty]
	 */ createProxy(parentDataNode, targetProperty) {
        let parentProxyNode = parentDataNode[$518557bad313f8f1$export$f7e0aa381a5261fc].proxyNode;
        let dataNode, proxyNode;
        if (targetProperty === undefined) {
            dataNode = parentDataNode;
            proxyNode = parentProxyNode;
        } else {
            //creates new or reset an existing data-node and then creates a new proxy-node
            const newNodes = $d613cdccf4e92ac6$export$953dd193a01bd6ec(parentDataNode, parentProxyNode, targetProperty, parentProxyNode[$518557bad313f8f1$export$f7e0aa381a5261fc].target[targetProperty]);
            dataNode = newNodes.dataNode;
            proxyNode = newNodes.proxyNode;
        }
        let target1 = proxyNode[$518557bad313f8f1$export$f7e0aa381a5261fc].target;
        let typeoftarget = $e3f4344113dd8ef0$export$99a2acdf670c1bf4(target1);
        if ($518557bad313f8f1$export$94b8be4ec3303efd[typeoftarget]) {
            let revocable = Proxy.revocable(target1, {
                get: (target /*same as parent scope 'target'*/ , property, proxy)=>{
                    if (this.emitMethods && Object.prototype.hasOwnProperty.call($ac07f5587380cee0$exports, property) && property in Object.getPrototypeOf(target)) // use a proxy method instead of the built-in method that is on the prototype chain
                    return $ac07f5587380cee0$exports[property].bind(this, dataNode, proxyNode);
                    else if ($758ea81f4f7b53ee$var$pseudoMethodsNames.includes(property) && typeof target[property] === 'undefined') // can access a pseudo function (or its synonym) if their keywords isn't used
                    return $62e27656781218cb$exports[property].bind(this, dataNode, proxyNode);
                    else if (!target.propertyIsEnumerable(property) || typeof property === 'symbol') return target[property]; // non-enumerable or non-path'able aren't proxied
                    else if (proxyNode[property] // there's a child node
                     && proxyNode[property][$518557bad313f8f1$export$f7e0aa381a5261fc].proxy // it holds a proxy
                     && proxyNode[property][$518557bad313f8f1$export$d1c20e4ad7d32581].status === $518557bad313f8f1$export$89e04a1d3d3065f6.ALIVE) return proxyNode[property][$518557bad313f8f1$export$f7e0aa381a5261fc].proxy;
                    else return target[property];
                },
                set: (target /*same as parent scope 'target'*/ , property, value, proxy)=>{
                    /**
					 * property can be a regular object because of 3 possible reasons:
					 * 1. proxy is deleted from tree but user keeps accessing it then it means he saved a reference
					 * 2. it is a non-enumerable property which means it was intentionally hidden
					 * 3. property is a symbol and symbols can't be proxied because we can't create a normal path for them.
					 *    these properties are not proxied and should not emit change-event.
					 *    except for: length
					 * TODO - make a list of all possible properties exceptions (maybe function 'name'?)
					 */ if (dataNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status === $518557bad313f8f1$export$eb0c55c6f2ee7170.BLOCKED) {
                        console.error('object is blocked. can\'t change value of property:', property);
                        return true;
                    } else if (typeof property === 'symbol') {
                        target[property] = value;
                        return true;
                    } else if (property !== 'length' && !target.propertyIsEnumerable(property)) {
                        //if setting a whole new property then it is non-enumerable (yet) so a further test is needed
                        let descriptor = Object.getOwnPropertyDescriptor(target, property);
                        if (typeof descriptor === 'object' && descriptor.enumerable === false) {
                            target[property] = value;
                            return true;
                        }
                    }
                    let oldValue = target[property]; // should not be proxy
                    let isOldValueProxy = false;
                    if (proxyNode[property] !== undefined && proxyNode[property][$518557bad313f8f1$export$f7e0aa381a5261fc].proxy !== undefined) {
                        // about to overwrite an existing property which is a proxy (about to detach a proxy)
                        proxyNode[property][$518557bad313f8f1$export$d1c20e4ad7d32581].status = $518557bad313f8f1$export$89e04a1d3d3065f6.DELETED;
                        delete dataNode[property][$518557bad313f8f1$export$f7e0aa381a5261fc].proxyNode; // detach reference from data-node to proxy-node
                        isOldValueProxy = true;
                        if (this.strict) // postpone this cpu intense function for later, probably when proxserve is not in use
                        setTimeout($758ea81f4f7b53ee$export$d402cf8388053971.destroy, this.destroyDelay, proxyNode[property][$518557bad313f8f1$export$f7e0aa381a5261fc].proxy);
                    }
                    value = $d613cdccf4e92ac6$export$a58c3ed528c9c399(value);
                    target[property] = value; //assign new value
                    let isValueProxy = false;
                    let typeofvalue = $e3f4344113dd8ef0$export$99a2acdf670c1bf4(value);
                    if ($518557bad313f8f1$export$94b8be4ec3303efd[typeofvalue]) {
                        this.createProxy(dataNode, property); //if trying to add a new value which is an object then make it a proxy
                        isValueProxy = true;
                    }
                    $7b3021a3226a950a$export$febbc75e71f4ca1b(dataNode, property, oldValue, isOldValueProxy, value, isValueProxy);
                    return true;
                },
                /**
				 * TODO - this function is incomplete and doesn't handle all of 'descriptor' scenarios
				 */ defineProperty: (target /*same as parent scope 'target'*/ , property, descriptor)=>{
                    if (typeof property === 'symbol') {
                        Object.defineProperty(target, property, descriptor);
                        return true;
                    }
                    let oldValue = target[property]; //should not be proxy
                    let isOldValueProxy = false;
                    if (proxyNode[property] !== undefined && proxyNode[property][$518557bad313f8f1$export$f7e0aa381a5261fc].proxy !== undefined) {
                        //about to overwrite an existing property which is a proxy (about to detach a proxy)
                        proxyNode[property][$518557bad313f8f1$export$d1c20e4ad7d32581].status = $518557bad313f8f1$export$89e04a1d3d3065f6.DELETED;
                        delete dataNode[property][$518557bad313f8f1$export$f7e0aa381a5261fc].proxyNode; //detach reference from data-node to proxy-node
                        isOldValueProxy = true;
                        if (this.strict) //postpone this cpu intense function for later, probably when proxserve is not is use
                        setTimeout($758ea81f4f7b53ee$export$d402cf8388053971.destroy, this.destroyDelay, proxyNode[property][$518557bad313f8f1$export$f7e0aa381a5261fc].proxy);
                    }
                    descriptor.value = $d613cdccf4e92ac6$export$a58c3ed528c9c399(descriptor.value);
                    Object.defineProperty(target, property, descriptor); //defining the new value
                    let value = descriptor.value;
                    let isValueProxy = false;
                    //excluding non-enumerable properties from being proxied
                    let typeofvalue = $e3f4344113dd8ef0$export$99a2acdf670c1bf4(descriptor.value);
                    if ($518557bad313f8f1$export$94b8be4ec3303efd[typeofvalue] && descriptor.enumerable === true) {
                        this.createProxy(dataNode, property); //if trying to add a new value which is an object then make it a proxy
                        isValueProxy = true;
                    }
                    $7b3021a3226a950a$export$febbc75e71f4ca1b(dataNode, property, oldValue, isOldValueProxy, value, isValueProxy);
                    return true;
                },
                deleteProperty: (target /*same as parent scope 'target'*/ , property)=>{
                    if (!target.propertyIsEnumerable(property) || typeof property === 'symbol') {
                        //non-proxied properties simply get deleted and nothing more
                        delete target[property];
                        return true;
                    }
                    if (dataNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status === $518557bad313f8f1$export$eb0c55c6f2ee7170.BLOCKED) {
                        console.error(`can't delete property '${property}'. object is blocked.`);
                        return true;
                    }
                    if (property in target) {
                        let oldValue = target[property]; //should not be proxy
                        let isOldValueProxy = false;
                        if (proxyNode[property] !== undefined && proxyNode[property][$518557bad313f8f1$export$f7e0aa381a5261fc].proxy !== undefined) {
                            //about to overwrite an existing property which is a proxy (about to detach a proxy)
                            proxyNode[property][$518557bad313f8f1$export$d1c20e4ad7d32581].status = $518557bad313f8f1$export$89e04a1d3d3065f6.DELETED;
                            delete dataNode[property][$518557bad313f8f1$export$f7e0aa381a5261fc].proxyNode; //detach reference from data-node to proxy-node
                            isOldValueProxy = true;
                            if (this.strict) //postpone this cpu intense function for later, probably when proxserve is not is use
                            setTimeout($758ea81f4f7b53ee$export$d402cf8388053971.destroy, this.destroyDelay, proxyNode[property][$518557bad313f8f1$export$f7e0aa381a5261fc].proxy);
                        }
                        delete target[property]; //actual delete
                        $7b3021a3226a950a$export$febbc75e71f4ca1b(dataNode, property, oldValue, isOldValueProxy, undefined, false);
                        return true;
                    } else return true; //do nothing because there's nothing to delete
                }
            });
            proxyNode[$518557bad313f8f1$export$f7e0aa381a5261fc].proxy = revocable.proxy;
            proxyNode[$518557bad313f8f1$export$f7e0aa381a5261fc].revoke = revocable.revoke;
            if ($518557bad313f8f1$export$94b8be4ec3303efd[typeoftarget]) {
                let keys = Object.keys(target1); //handles both Objects and Arrays
                for (let key of keys){
                    let typeofproperty = $e3f4344113dd8ef0$export$99a2acdf670c1bf4(target1[key]);
                    if ($518557bad313f8f1$export$94b8be4ec3303efd[typeofproperty]) this.createProxy(dataNode, key); //recursively make child objects also proxies
                }
            } else console.warn(`Type of "${typeoftarget}" is not implemented`);
            return revocable.proxy;
        } else {
            const types = Object.keys($518557bad313f8f1$export$94b8be4ec3303efd);
            throw new Error(`Must observe an ${types.join('/')}`);
        }
    }
    /**
	 * Recursively revoke proxies, allowing them to be garbage collected.
	 * this functions delays 1000 milliseconds to let time for all events to finish
	 * @param {*} proxy 
	 */ static destroy(proxy) {
        let proxyNode;
        try {
            [, proxyNode] = proxy.$getProxserveNodes();
        } catch (error) {
            return; // proxy variable isn't a proxy
        }
        if (proxyNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status === $518557bad313f8f1$export$89e04a1d3d3065f6.ALIVE) proxyNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status = $518557bad313f8f1$export$89e04a1d3d3065f6.DELETED;
        let typeofproxy = $e3f4344113dd8ef0$export$99a2acdf670c1bf4(proxy);
        if ($518557bad313f8f1$export$94b8be4ec3303efd[typeofproxy]) {
            let keys = Object.keys(proxy); // handles both Objects and Arrays
            for (let key of keys)try {
                let typeofproperty = $e3f4344113dd8ef0$export$99a2acdf670c1bf4(proxy[key]);
                if ($518557bad313f8f1$export$94b8be4ec3303efd[typeofproperty]) // going to proxy[key], which is deleted, will return the original target so we will bypass it
                $758ea81f4f7b53ee$export$d402cf8388053971.destroy(proxyNode[key][$518557bad313f8f1$export$f7e0aa381a5261fc].proxy);
            } catch (error) {
                console.error(error); // don't throw and kill the whole process just if this iteration fails
            }
            proxyNode[$518557bad313f8f1$export$f7e0aa381a5261fc].revoke();
            //proxyNode[ND].proxy = undefined;
            proxyNode[$518557bad313f8f1$export$d1c20e4ad7d32581].status = $518557bad313f8f1$export$89e04a1d3d3065f6.REVOKED;
        } else console.warn(`Type of "${typeofproxy}" is not implemented`);
    }
    static splitPath(path) {
        return $e3f4344113dd8ef0$export$824c337f43f2b64d(path);
    }
    static evalPath(obj, path1) {
        return $e3f4344113dd8ef0$export$8ffa680996c65fde(obj, path1);
    }
}


//# sourceMappingURL=index.js.map
