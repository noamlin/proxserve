function $parcel$export(e, n, v, s) {
  Object.defineProperty(e, n, {get: v, set: s, enumerable: true, configurable: true});
}
/**
 * Copyright 2021 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */ "use strict";
const $cebd7357bd8525a2$export$f7e0aa381a5261fc = Symbol.for('proxserve_node_data'); // key for the data of a node
const $cebd7357bd8525a2$export$d1c20e4ad7d32581 = Symbol.for('proxserve_node_inherited_data'); // key for the inherited data of a node
const $cebd7357bd8525a2$export$94b8be4ec3303efd = {
    "Object": true,
    "Array": true
};
var $cebd7357bd8525a2$export$eb0c55c6f2ee7170;
(function(nodeStatuses) {
    nodeStatuses["ACTIVE"] = 'active';
    nodeStatuses["STOPPED"] = 'stopped';
    nodeStatuses["BLOCKED"] = 'blocked';
    nodeStatuses["SPLICING"] = 'splicing';
})($cebd7357bd8525a2$export$eb0c55c6f2ee7170 || ($cebd7357bd8525a2$export$eb0c55c6f2ee7170 = {
}));
var $cebd7357bd8525a2$export$89e04a1d3d3065f6;
(function(proxyStatuses) {
    proxyStatuses["ALIVE"] = 'alive';
    proxyStatuses["DELETED"] = 'deleted';
    proxyStatuses["REVOKED"] = 'revoked';
})($cebd7357bd8525a2$export$89e04a1d3d3065f6 || ($cebd7357bd8525a2$export$89e04a1d3d3065f6 = {
}));
var $cebd7357bd8525a2$export$6b3dabbc9fa607b7;
(function(eventNamesObject) {
    eventNamesObject["create"] = "create";
    eventNamesObject["update"] = "update";
    eventNamesObject["delete"] = "delete";
    eventNamesObject["splice"] = "splice";
    eventNamesObject["shift"] = "shift";
    eventNamesObject["unshift"] = "unshift";
})($cebd7357bd8525a2$export$6b3dabbc9fa607b7 || ($cebd7357bd8525a2$export$6b3dabbc9fa607b7 = {
}));



/**
 * Copyright 2021 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */ "use strict";
function $c0486756bd3a8c4d$export$99a2acdf670c1bf4(variable) {
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
 */ const $c0486756bd3a8c4d$var$simpleCloneSet = new WeakSet();
function $c0486756bd3a8c4d$export$d6f7d8248ac0a979(variable) {
    let typeofvar = $c0486756bd3a8c4d$export$99a2acdf670c1bf4(variable);
    if (typeofvar === 'Object') {
        const obj = variable;
        $c0486756bd3a8c4d$var$simpleCloneSet.add(obj);
        const cloned = {
        };
        let keys = Object.keys(obj);
        for (let key of keys)if ($c0486756bd3a8c4d$var$simpleCloneSet.has(obj[key])) cloned[key] = obj[key];
        else cloned[key] = $c0486756bd3a8c4d$export$d6f7d8248ac0a979(obj[key]);
        return cloned;
    } else if (typeofvar === 'Array') {
        const arr = variable;
        $c0486756bd3a8c4d$var$simpleCloneSet.add(arr);
        const cloned = [];
        for(let i = 0; i < arr.length; i++)if ($c0486756bd3a8c4d$var$simpleCloneSet.has(arr[i])) cloned[i] = arr[i];
        else cloned[i] = $c0486756bd3a8c4d$export$d6f7d8248ac0a979(arr[i]);
        return cloned;
    } else {
        if (typeofvar !== 'Undefined' && typeofvar !== 'Null' && typeofvar !== 'Boolean' && typeofvar !== 'Number' && typeofvar !== 'BigInt' && typeofvar !== 'String') console.warn(`Can't clone a variable of type ${typeofvar}`);
        return variable;
    }
}
function $c0486756bd3a8c4d$export$824c337f43f2b64d(path) {
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
function $c0486756bd3a8c4d$export$8ffa680996c65fde(obj, path) {
    if (path === '') return {
        object: obj,
        property: '',
        value: obj
    };
    let segments = $c0486756bd3a8c4d$export$824c337f43f2b64d(path);
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
function $431788524d5470e1$export$1b787634d8e3bf02(obj, property) {
    if (typeof property === 'symbol') throw new Error(`property of type "symbol" isn't path'able`);
    const typeofobj = $c0486756bd3a8c4d$export$99a2acdf670c1bf4(obj);
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
function $431788524d5470e1$export$a58c3ed528c9c399(value) {
    const typeofvalue = $c0486756bd3a8c4d$export$99a2acdf670c1bf4(value);
    if ($cebd7357bd8525a2$export$94b8be4ec3303efd[typeofvalue]) {
        let target = value;
        try {
            target = value.$getOriginalTarget();
        } catch (error) {
        }
        switch(typeofvalue){
            case 'Object':
                let keys = Object.keys(target);
                for (let key of keys)target[key] = $431788524d5470e1$export$a58c3ed528c9c399(target[key]); // maybe alters target and maybe returning the exact same object
                break;
            case 'Array':
                for(let i = 0; i < target.length; i++)target[i] = $431788524d5470e1$export$a58c3ed528c9c399(target[i]); // maybe alters target and maybe returning the exact same object
                break;
            default:
                console.warn(`Not Implemented (type of '${typeofvalue}')`);
        }
        return target;
    } else return value; // primitive
}
function $431788524d5470e1$export$953dd193a01bd6ec(parentDataNode, property, parentProxyNode, target) {
    //handle property path
    let propertyPath;
    if (parentProxyNode === null || parentProxyNode === void 0 ? void 0 : parentProxyNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].target) propertyPath = $431788524d5470e1$export$1b787634d8e3bf02(parentProxyNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].target, property);
    else propertyPath = $431788524d5470e1$export$1b787634d8e3bf02({
    }, property); // if parent doesn't have target then treat it as object
    //handle data node
    let dataNode = parentDataNode[property]; // try to receive existing data-node
    if (!dataNode) {
        dataNode = {
            [$cebd7357bd8525a2$export$d1c20e4ad7d32581]: Object.create(parentDataNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581]),
            [$cebd7357bd8525a2$export$f7e0aa381a5261fc]: {
                parentNode: parentDataNode,
                listeners: {
                    shallow: [],
                    deep: []
                }
            }
        };
        parentDataNode[property] = dataNode;
    }
    delete dataNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status; // clears old status in case a node previously existed
    // updates path (for rare case where parent was array and then changed to object or vice versa)
    if (!parentDataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].isTreePrototype) Object.assign(dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc], {
        path: parentDataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].path + propertyPath,
        propertyPath: propertyPath
    });
    else Object.assign(dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc], {
        path: '',
        propertyPath: ''
    });
    // handle proxy node
    let proxyNode;
    if (parentProxyNode) {
        proxyNode = {
            [$cebd7357bd8525a2$export$d1c20e4ad7d32581]: Object.create(parentProxyNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581]),
            [$cebd7357bd8525a2$export$f7e0aa381a5261fc]: {
                target: target,
                dataNode: dataNode
            }
        };
        parentProxyNode[property] = proxyNode;
        // attach nodes to each other
        dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxyNode = proxyNode;
    } else // hack to satisfy TS.
    // this scenario is dangerous and exists only for `on()` of future variables (paths) that don't yet exist
    proxyNode = undefined;
    return {
        dataNode: dataNode,
        proxyNode: proxyNode
    };
}


var $f6f254486f25c78f$exports = {};

$parcel$export($f6f254486f25c78f$exports, "stop", function () { return $f6f254486f25c78f$export$fa6813432f753b0d; });
$parcel$export($f6f254486f25c78f$exports, "block", function () { return $f6f254486f25c78f$export$837bd02682cd3db9; });
$parcel$export($f6f254486f25c78f$exports, "activate", function () { return $f6f254486f25c78f$export$234c45b355edd85b; });
$parcel$export($f6f254486f25c78f$exports, "on", function () { return $f6f254486f25c78f$export$af631764ddc44097; });
$parcel$export($f6f254486f25c78f$exports, "once", function () { return $f6f254486f25c78f$export$d2de3aaeafa91619; });
$parcel$export($f6f254486f25c78f$exports, "removeListener", function () { return $f6f254486f25c78f$export$b03e9483f936dccb; });
$parcel$export($f6f254486f25c78f$exports, "removeAllListeners", function () { return $f6f254486f25c78f$export$6f2e3a6079f109b1; });
$parcel$export($f6f254486f25c78f$exports, "getOriginalTarget", function () { return $f6f254486f25c78f$export$35f261dd63190ac1; });
$parcel$export($f6f254486f25c78f$exports, "getProxserveNodes", function () { return $f6f254486f25c78f$export$c3c6db5039118967; });



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
const $f6f254486f25c78f$export$fa6813432f753b0d = function stop() {
    this.dataNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status = $cebd7357bd8525a2$export$eb0c55c6f2ee7170.STOPPED;
};
const $f6f254486f25c78f$export$837bd02682cd3db9 = function block() {
    this.dataNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status = $cebd7357bd8525a2$export$eb0c55c6f2ee7170.BLOCKED;
};
const $f6f254486f25c78f$export$234c45b355edd85b = function activate(force = false) {
    if (force || this.dataNode === this.metadata.dataTree) this.dataNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status = $cebd7357bd8525a2$export$eb0c55c6f2ee7170.ACTIVE;
    else delete this.dataNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status;
};
const $f6f254486f25c78f$export$af631764ddc44097 = function on(args) {
    const { path: path = '' , listener: listener , options: options = {
    }  } = args;
    let { events: events  } = args;
    var _deep;
    options.deep = (_deep = options.deep) !== null && _deep !== void 0 ? _deep : false;
    var _once;
    options.once = (_once = options.once) !== null && _once !== void 0 ? _once : false;
    if (events === 'change') events = Object.keys($cebd7357bd8525a2$export$6b3dabbc9fa607b7); // will listen to all events
    else if (!Array.isArray(events)) events = [
        events
    ];
    for (let event of events)if (!$cebd7357bd8525a2$export$6b3dabbc9fa607b7[event]) {
        const names = Object.keys($cebd7357bd8525a2$export$6b3dabbc9fa607b7);
        throw new Error(`${event} is not a valid event. valid events are ${names.join(',')}`);
    }
    let dataNode = this.dataNode;
    let segments = $c0486756bd3a8c4d$export$824c337f43f2b64d(path);
    for (let property of segments){
        if (!dataNode[property]) // create data-nodes if needed, but don't create/overwrite proxy-nodes
        $431788524d5470e1$export$953dd193a01bd6ec(dataNode, property);
        dataNode = dataNode[property];
    }
    let listenersPool = dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].listeners.shallow;
    if (options.deep) listenersPool = dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].listeners.deep;
    let listenerObj = {
        type: events,
        once: options.once,
        func: listener
    };
    if (options.id !== undefined) listenerObj.id = options.id;
    listenersPool.push(listenerObj);
};
const $f6f254486f25c78f$export$d2de3aaeafa91619 = function once(args) {
    const { events: events , path: path , listener: listener , options: options = {
    }  } = args;
    options.once = true;
    $f6f254486f25c78f$export$af631764ddc44097.call(this, {
        events: events,
        path: path,
        listener: listener,
        options: options
    });
};
function $f6f254486f25c78f$var$removeById(listenersArr, id) {
    for(let i = listenersArr.length - 1; i >= 0; i--){
        let listenerObj = listenersArr[i];
        if (id !== undefined && listenerObj.id === id || listenerObj.func === id) listenersArr.splice(i, 1);
    }
}
const $f6f254486f25c78f$export$b03e9483f936dccb = function removeListener(args) {
    const { id: id , path: path = ''  } = args;
    const fullPath = `${this.dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].path}${path}`;
    let dataNode = this.dataNode;
    const segments = $c0486756bd3a8c4d$export$824c337f43f2b64d(path);
    // traverse down the tree
    for (let property of segments){
        if (!dataNode[property]) {
            console.warn(`can't remove listener from a non-existent path '${fullPath}'`);
            return;
        }
        dataNode = dataNode[property];
    }
    $f6f254486f25c78f$var$removeById(dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].listeners.shallow, id);
    $f6f254486f25c78f$var$removeById(dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].listeners.deep, id);
};
const $f6f254486f25c78f$export$6f2e3a6079f109b1 = function removeAllListeners(path = '') {
    const fullPath = `${this.dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].path}${path}`;
    const segments = $c0486756bd3a8c4d$export$824c337f43f2b64d(path);
    let dataNode = this.dataNode;
    //traverse down the tree
    for (let property of segments){
        if (!dataNode[property]) {
            console.warn(`can't remove all listeners from a non-existent path '${fullPath}'`);
            return;
        }
        dataNode = dataNode[property];
    }
    dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].listeners.shallow = [];
    dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].listeners.deep = [];
};
const $f6f254486f25c78f$export$35f261dd63190ac1 = function getOriginalTarget() {
    return this.proxyNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].target;
};
const $f6f254486f25c78f$export$c3c6db5039118967 = function getProxserveNodes() {
    return {
        dataNode: this.dataNode,
        proxyNode: this.proxyNode
    };
};


var $26afb3b451fe81b5$exports = {};

$parcel$export($26afb3b451fe81b5$exports, "splice", function () { return $26afb3b451fe81b5$export$869882364835d202; });
$parcel$export($26afb3b451fe81b5$exports, "shift", function () { return $26afb3b451fe81b5$export$fba63a578e423eb; });
$parcel$export($26afb3b451fe81b5$exports, "unshift", function () { return $26afb3b451fe81b5$export$37cdb546b806ae87; });




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
 */ function $590092d9df4e6b38$var$getProxyValue(dataNode, property) {
    if (dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxyNode && dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxyNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status === $cebd7357bd8525a2$export$89e04a1d3d3065f6.ALIVE) return dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxyNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy; // actual proxy of child node
    else {
        var ref;
        if (!property) // my property on the parent
        property = $c0486756bd3a8c4d$export$824c337f43f2b64d(dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].propertyPath)[0];
        let parentNode = dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].parentNode;
        if (parentNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxyNode && parentNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxyNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status === $cebd7357bd8525a2$export$89e04a1d3d3065f6.ALIVE) return (ref = parentNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxyNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy) === null || ref === void 0 ? void 0 : ref[property]; // proxy or primitive via parent's proxy object
    }
    return undefined;
}
function $590092d9df4e6b38$export$febbc75e71f4ca1b(dataNode, property, oldValue, wasOldValueProxy, value, isValueProxy) {
    if (oldValue === value // no new change was made
     || !dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxyNode) return;
    let proxyNode = dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxyNode;
    if (proxyNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status !== $cebd7357bd8525a2$export$89e04a1d3d3065f6.ALIVE) return;
    let changeType = $cebd7357bd8525a2$export$6b3dabbc9fa607b7.update;
    if (value === undefined) changeType = $cebd7357bd8525a2$export$6b3dabbc9fa607b7.delete;
    else if (oldValue === undefined) changeType = $cebd7357bd8525a2$export$6b3dabbc9fa607b7.create;
    let deferredEvents;
    // altering properties of an array that's in the middle of a splicing phase
    if (dataNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status === $cebd7357bd8525a2$export$eb0c55c6f2ee7170.SPLICING) {
        // initiate (if needed) an object to hold side effect events
        if (!dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].deferredEvents) dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].deferredEvents = [];
        // save a reference to the deferredEvents
        deferredEvents = dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].deferredEvents;
    }
    let path;
    if (dataNode[property]) {
        dataNode = dataNode[property];
        path = '';
    } else path = $431788524d5470e1$export$1b787634d8e3bf02(proxyNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].target, property);
    let change = {
        path: path,
        value: value,
        oldValue: oldValue,
        type: changeType
    };
    if (!deferredEvents) {
        $590092d9df4e6b38$var$bubbleEmit(dataNode, change, property);
        if (wasOldValueProxy || isValueProxy) $590092d9df4e6b38$var$captureEmit(dataNode, change);
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
 */ function $590092d9df4e6b38$var$bubbleEmit(dataNode, change, property) {
    if (dataNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status === $cebd7357bd8525a2$export$eb0c55c6f2ee7170.STOPPED) return; // not allowed to emit
    let thisValue = $590092d9df4e6b38$var$getProxyValue(dataNode, property);
    if (change.path === '') $590092d9df4e6b38$var$iterateAndEmit(dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].listeners.shallow, thisValue, change);
    // iterate over 'deep' listeners
    $590092d9df4e6b38$var$iterateAndEmit(dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].listeners.deep, thisValue, change);
    if (!dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].parentNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].isTreePrototype) {
        // create a shallow copy of 'change' and update its path
        // (we don't want to alter the 'change' object that was just emitted to a listener)
        let nextChange = {
            ...change,
            path: dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].propertyPath + change.path
        };
        $590092d9df4e6b38$var$bubbleEmit(dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].parentNode, nextChange);
    }
}
/**
 * capturing phase - go down the data tree and emit
 * @param dataNode
 * @param change
 */ function $590092d9df4e6b38$var$captureEmit(dataNode, change) {
    let keys = Object.keys(dataNode);
    for (let key of keys){
        let subValue = typeof change.value === 'object' && change.value !== null ? change.value[key] : undefined;
        let subOldValue = typeof change.oldValue === 'object' && change.oldValue !== null ? change.oldValue[key] : undefined;
        if (subValue !== subOldValue) {
            let changeType = $cebd7357bd8525a2$export$6b3dabbc9fa607b7.update;
            if (subValue === undefined) changeType = $cebd7357bd8525a2$export$6b3dabbc9fa607b7.delete;
            else if (subOldValue === undefined) changeType = $cebd7357bd8525a2$export$6b3dabbc9fa607b7.create;
            let subChange = {
                path: '',
                oldValue: subOldValue,
                value: subValue,
                type: changeType
            };
            // failing the status check will not emit for current property (but sub-properties might still be forcibly active)
            let childNode = dataNode[key];
            if (childNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status !== $cebd7357bd8525a2$export$eb0c55c6f2ee7170.STOPPED) {
                let thisValue = $590092d9df4e6b38$var$getProxyValue(childNode, key);
                $590092d9df4e6b38$var$iterateAndEmit(childNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].listeners.shallow, thisValue, subChange);
            }
            $590092d9df4e6b38$var$captureEmit(childNode, subChange);
        }
    }
}
/**
 * iterate over an array of listeners, handle 'once' listeners and emit
 * @param listenersArr 
 * @param thisValue 
 * @param change 
 */ function $590092d9df4e6b38$var$iterateAndEmit(listenersArr, thisValue, change) {
    for(let i = listenersArr.length - 1; i >= 0; i--){
        let listener = listenersArr[i];
        if (listener.type.includes(change.type)) {
            if (listener.once === true) listenersArr.splice(i, 1);
            listener.func.call(thisValue, change);
        }
    }
}
function $590092d9df4e6b38$export$29f2d3a310653bb4(dataNode, funcName, funcArgs, oldValue, value) {
    let change = {
        path: '',
        value: value,
        oldValue: oldValue,
        type: funcName,
        args: funcArgs
    };
    $590092d9df4e6b38$var$bubbleEmit(dataNode, change);
    if (dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].deferredEvents) {
        // manually handle the side-effect events that were caught
        // in order to not bubble up, but should capture down
        for (let event of dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].deferredEvents){
            if (event.change.path === '') {
                // no path means its an event directly on the property, not on the parent.
                // i.e: not an event with path "0" on ".arr", but an event with no path on ".arr[0]".
                // function event on "arr" already ran, but now a regular event on "arr[0]" is due
                let thisValue = $590092d9df4e6b38$var$getProxyValue(event.dataNode);
                $590092d9df4e6b38$var$iterateAndEmit(event.dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].listeners.shallow, thisValue, event.change);
                $590092d9df4e6b38$var$iterateAndEmit(event.dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].listeners.deep, thisValue, event.change);
            }
            if (event.shouldCapture) $590092d9df4e6b38$var$captureEmit(event.dataNode, event.change);
        }
        delete dataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].deferredEvents;
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
function $26afb3b451fe81b5$export$869882364835d202(dataNode, proxyNode, start, deleteCount, ...items) {
    if (dataNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status !== $cebd7357bd8525a2$export$eb0c55c6f2ee7170.ACTIVE) return Array.prototype.splice.call(proxyNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy, start, deleteCount, ...items);
    let isActiveByInheritance = !dataNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].hasOwnProperty('status');
    dataNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status = $cebd7357bd8525a2$export$eb0c55c6f2ee7170.SPLICING;
    let oldValue = proxyNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].target.slice(0);
    let deleted = Array.prototype.splice.call(proxyNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy, start, deleteCount, ...items); // creates many side-effect events
    let args = {
        start: start,
        deleteCount: deleteCount,
        items: items
    };
    if (isActiveByInheritance) delete dataNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status;
    else dataNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status = $cebd7357bd8525a2$export$eb0c55c6f2ee7170.ACTIVE;
    $590092d9df4e6b38$export$29f2d3a310653bb4(dataNode, $cebd7357bd8525a2$export$6b3dabbc9fa607b7.splice, args, oldValue, proxyNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].target);
    return deleted;
}
function $26afb3b451fe81b5$export$fba63a578e423eb(dataNode, proxyNode) {
    if (dataNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status !== $cebd7357bd8525a2$export$eb0c55c6f2ee7170.ACTIVE) // if not active then run regular `shift`
    // which will reach the `set` of the ProxyHandler and will be blocked or events stopped, etc.
    return Array.prototype.shift.call(proxyNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy);
    let isActiveByInheritance = !dataNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].hasOwnProperty('status');
    dataNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status = $cebd7357bd8525a2$export$eb0c55c6f2ee7170.SPLICING;
    let oldValue = proxyNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].target.slice(0);
    let deleted = Array.prototype.shift.call(proxyNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy); // creates many side-effect events
    if (isActiveByInheritance) delete dataNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status;
    else dataNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status = $cebd7357bd8525a2$export$eb0c55c6f2ee7170.ACTIVE;
    $590092d9df4e6b38$export$29f2d3a310653bb4(dataNode, $cebd7357bd8525a2$export$6b3dabbc9fa607b7.shift, {
    }, oldValue, proxyNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].target);
    return deleted;
}
function $26afb3b451fe81b5$export$37cdb546b806ae87(dataNode, proxyNode, ...items) {
    if (dataNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status !== $cebd7357bd8525a2$export$eb0c55c6f2ee7170.ACTIVE) return Array.prototype.shift.call(proxyNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy);
    let isActiveByInheritance = !dataNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].hasOwnProperty('status');
    dataNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status = $cebd7357bd8525a2$export$eb0c55c6f2ee7170.SPLICING;
    let oldValue = proxyNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].target.slice(0);
    let newLength = Array.prototype.unshift.call(proxyNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy, ...items); // creates many side-effect events
    let args = {
        items: items
    };
    if (isActiveByInheritance) delete dataNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status;
    else dataNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status = $cebd7357bd8525a2$export$eb0c55c6f2ee7170.ACTIVE;
    $590092d9df4e6b38$export$29f2d3a310653bb4(dataNode, $cebd7357bd8525a2$export$6b3dabbc9fa607b7.unshift, args, oldValue, proxyNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].target);
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
 */ let $643fcf18b2d2e76f$var$pseudoMethodsNames = Object.keys($f6f254486f25c78f$exports);
for(let i = $643fcf18b2d2e76f$var$pseudoMethodsNames.length - 1; i >= 0; i--){
    let name = $643fcf18b2d2e76f$var$pseudoMethodsNames[i];
    let synonym = '$' + name;
    $f6f254486f25c78f$exports[synonym] = $f6f254486f25c78f$exports[name];
    $643fcf18b2d2e76f$var$pseudoMethodsNames.push(synonym);
}
class $643fcf18b2d2e76f$export$d402cf8388053971 {
    /**
	 * make a new proxserve instance
	 */ static make(target2, options = {
    }) {
        const { strict: strict = true , emitMethods: emitMethods = true , debug: debug = {
            destroyDelay: 1000
        } ,  } = options;
        let dataTreePrototype = {
            [$cebd7357bd8525a2$export$d1c20e4ad7d32581]: {
                status: $cebd7357bd8525a2$export$eb0c55c6f2ee7170.ACTIVE
            },
            [$cebd7357bd8525a2$export$f7e0aa381a5261fc]: {
                isTreePrototype: true
            }
        };
        let proxyTreePrototype = {
            [$cebd7357bd8525a2$export$d1c20e4ad7d32581]: {
                status: $cebd7357bd8525a2$export$89e04a1d3d3065f6.ALIVE
            },
            [$cebd7357bd8525a2$export$f7e0aa381a5261fc]: {
                isTreePrototype: true
            }
        };
        const newNodes = $431788524d5470e1$export$953dd193a01bd6ec(dataTreePrototype, '', proxyTreePrototype, target2);
        const metadata = {
            strict: strict,
            emitMethods: emitMethods,
            destroyDelay: debug.destroyDelay,
            dataTree: newNodes.dataNode,
            proxyTree: newNodes.proxyNode
        };
        return $643fcf18b2d2e76f$export$d402cf8388053971.createProxy(metadata, metadata.dataTree);
    }
    /**
	 * create a new proxy and a new node for a property of the parent's target-object
	 */ static createProxy(metadata, parentDataNode, targetProperty) {
        let parentProxyNode = parentDataNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxyNode;
        let dataNode, proxyNode;
        if (targetProperty === undefined) {
            dataNode = parentDataNode;
            proxyNode = parentProxyNode;
        } else {
            //creates new or reset an existing data-node and then creates a new proxy-node
            const newNodes = $431788524d5470e1$export$953dd193a01bd6ec(parentDataNode, targetProperty, parentProxyNode, parentProxyNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].target[targetProperty]);
            dataNode = newNodes.dataNode;
            proxyNode = newNodes.proxyNode;
        }
        let target1 = proxyNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].target;
        let typeoftarget = $c0486756bd3a8c4d$export$99a2acdf670c1bf4(target1);
        if ($cebd7357bd8525a2$export$94b8be4ec3303efd[typeoftarget]) {
            let revocable = Proxy.revocable(target1, {
                get: (target /*same as parent scope 'target'*/ , property, proxy)=>{
                    if (metadata.emitMethods && Object.prototype.hasOwnProperty.call($26afb3b451fe81b5$exports, property) && property in Object.getPrototypeOf(target)) // use a proxy method instead of the built-in method that is on the prototype chain
                    return $26afb3b451fe81b5$exports[property].bind({
                        metadata: metadata,
                        dataNode: dataNode,
                        proxyNode: proxyNode
                    });
                    else if ($643fcf18b2d2e76f$var$pseudoMethodsNames.includes(property) && typeof target[property] === 'undefined') // can access a pseudo function (or its synonym) if their keywords isn't used
                    return $f6f254486f25c78f$exports[property].bind({
                        metadata: metadata,
                        dataNode: dataNode,
                        proxyNode: proxyNode
                    });
                    else if (!target.propertyIsEnumerable(property) || typeof property === 'symbol') return target[property]; // non-enumerable or non-path'able aren't proxied
                    else if (proxyNode[property] // there's a child node
                     && proxyNode[property][$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy // it holds a proxy
                     && proxyNode[property][$cebd7357bd8525a2$export$d1c20e4ad7d32581].status === $cebd7357bd8525a2$export$89e04a1d3d3065f6.ALIVE) return proxyNode[property][$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy;
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
					 */ if (dataNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status === $cebd7357bd8525a2$export$eb0c55c6f2ee7170.BLOCKED) {
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
                    if (proxyNode[property] !== undefined && proxyNode[property][$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy !== undefined) {
                        // about to overwrite an existing property which is a proxy (about to detach a proxy)
                        proxyNode[property][$cebd7357bd8525a2$export$d1c20e4ad7d32581].status = $cebd7357bd8525a2$export$89e04a1d3d3065f6.DELETED;
                        delete dataNode[property][$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxyNode; // detach reference from data-node to proxy-node
                        isOldValueProxy = true;
                        if (metadata.strict) // postpone this cpu intense function for later, probably when proxserve is not in use
                        setTimeout($643fcf18b2d2e76f$export$d402cf8388053971.destroy, metadata.destroyDelay, proxyNode[property][$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy);
                    }
                    value = $431788524d5470e1$export$a58c3ed528c9c399(value);
                    target[property] = value; //assign new value
                    let isValueProxy = false;
                    let typeofvalue = $c0486756bd3a8c4d$export$99a2acdf670c1bf4(value);
                    if ($cebd7357bd8525a2$export$94b8be4ec3303efd[typeofvalue]) {
                        $643fcf18b2d2e76f$export$d402cf8388053971.createProxy(metadata, dataNode, property); // if trying to add a new value which is an object then make it a proxy
                        isValueProxy = true;
                    }
                    $590092d9df4e6b38$export$febbc75e71f4ca1b(dataNode, property, oldValue, isOldValueProxy, value, isValueProxy);
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
                    if (proxyNode[property] !== undefined && proxyNode[property][$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy !== undefined) {
                        //about to overwrite an existing property which is a proxy (about to detach a proxy)
                        proxyNode[property][$cebd7357bd8525a2$export$d1c20e4ad7d32581].status = $cebd7357bd8525a2$export$89e04a1d3d3065f6.DELETED;
                        delete dataNode[property][$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxyNode; //detach reference from data-node to proxy-node
                        isOldValueProxy = true;
                        if (metadata.strict) //postpone this cpu intense function for later, probably when proxserve is not is use
                        setTimeout($643fcf18b2d2e76f$export$d402cf8388053971.destroy, metadata.destroyDelay, proxyNode[property][$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy);
                    }
                    descriptor.value = $431788524d5470e1$export$a58c3ed528c9c399(descriptor.value);
                    Object.defineProperty(target, property, descriptor); //defining the new value
                    let value = descriptor.value;
                    let isValueProxy = false;
                    //excluding non-enumerable properties from being proxied
                    let typeofvalue = $c0486756bd3a8c4d$export$99a2acdf670c1bf4(descriptor.value);
                    if ($cebd7357bd8525a2$export$94b8be4ec3303efd[typeofvalue] && descriptor.enumerable === true) {
                        $643fcf18b2d2e76f$export$d402cf8388053971.createProxy(metadata, dataNode, property); //if trying to add a new value which is an object then make it a proxy
                        isValueProxy = true;
                    }
                    $590092d9df4e6b38$export$febbc75e71f4ca1b(dataNode, property, oldValue, isOldValueProxy, value, isValueProxy);
                    return true;
                },
                deleteProperty: (target /*same as parent scope 'target'*/ , property)=>{
                    if (!target.propertyIsEnumerable(property) || typeof property === 'symbol') {
                        //non-proxied properties simply get deleted and nothing more
                        delete target[property];
                        return true;
                    }
                    if (dataNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status === $cebd7357bd8525a2$export$eb0c55c6f2ee7170.BLOCKED) {
                        console.error(`can't delete property '${property}'. object is blocked.`);
                        return true;
                    }
                    if (property in target) {
                        let oldValue = target[property]; //should not be proxy
                        let isOldValueProxy = false;
                        if (proxyNode[property] !== undefined && proxyNode[property][$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy !== undefined) {
                            //about to overwrite an existing property which is a proxy (about to detach a proxy)
                            proxyNode[property][$cebd7357bd8525a2$export$d1c20e4ad7d32581].status = $cebd7357bd8525a2$export$89e04a1d3d3065f6.DELETED;
                            delete dataNode[property][$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxyNode; //detach reference from data-node to proxy-node
                            isOldValueProxy = true;
                            if (metadata.strict) //postpone this cpu intense function for later, probably when proxserve is not is use
                            setTimeout($643fcf18b2d2e76f$export$d402cf8388053971.destroy, metadata.destroyDelay, proxyNode[property][$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy);
                        }
                        delete target[property]; // actual delete
                        $590092d9df4e6b38$export$febbc75e71f4ca1b(dataNode, property, oldValue, isOldValueProxy, undefined, false);
                        return true;
                    } else return true; //do nothing because there's nothing to delete
                }
            });
            proxyNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy = revocable.proxy;
            proxyNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].revoke = revocable.revoke;
            if ($cebd7357bd8525a2$export$94b8be4ec3303efd[typeoftarget]) {
                let keys = Object.keys(target1); //handles both Objects and Arrays
                for (let key of keys){
                    let typeofproperty = $c0486756bd3a8c4d$export$99a2acdf670c1bf4(target1[key]);
                    if ($cebd7357bd8525a2$export$94b8be4ec3303efd[typeofproperty]) $643fcf18b2d2e76f$export$d402cf8388053971.createProxy(metadata, dataNode, key); //recursively make child objects also proxies
                }
            } else console.warn(`Type of "${typeoftarget}" is not implemented`);
            return revocable.proxy;
        } else {
            const types = Object.keys($cebd7357bd8525a2$export$94b8be4ec3303efd);
            throw new Error(`Must observe an ${types.join('/')}`);
        }
    }
    /**
	 * Recursively revoke proxies, allowing them to be garbage collected.
	 * this functions delays 1000 milliseconds to let time for all events to finish
	 */ static destroy(proxy) {
        let proxyNode;
        try {
            const nodes = proxy.$getProxserveNodes();
            proxyNode = nodes.proxyNode;
        } catch (error) {
            return; // proxy variable isn't a proxy
        }
        if (proxyNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status === $cebd7357bd8525a2$export$89e04a1d3d3065f6.ALIVE) proxyNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status = $cebd7357bd8525a2$export$89e04a1d3d3065f6.DELETED;
        let typeofproxy = $c0486756bd3a8c4d$export$99a2acdf670c1bf4(proxy);
        if ($cebd7357bd8525a2$export$94b8be4ec3303efd[typeofproxy]) {
            let keys = Object.keys(proxy); // handles both Objects and Arrays
            for (let key of keys)try {
                let typeofproperty = $c0486756bd3a8c4d$export$99a2acdf670c1bf4(proxy[key]);
                if ($cebd7357bd8525a2$export$94b8be4ec3303efd[typeofproperty]) // going to proxy[key], which is deleted, will return the original target so we will bypass it
                $643fcf18b2d2e76f$export$d402cf8388053971.destroy(proxyNode[key][$cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy);
            } catch (error) {
                console.error(error); // don't throw and kill the whole process just if this iteration fails
            }
            proxyNode[$cebd7357bd8525a2$export$f7e0aa381a5261fc].revoke();
            //proxyNode[ND].proxy = undefined;
            proxyNode[$cebd7357bd8525a2$export$d1c20e4ad7d32581].status = $cebd7357bd8525a2$export$89e04a1d3d3065f6.REVOKED;
        } else console.warn(`Type of "${typeofproxy}" is not implemented`);
    }
    /**
	 * splits a path to an array of properties
	 */ static splitPath(path) {
        return $c0486756bd3a8c4d$export$824c337f43f2b64d(path);
    }
    /**
	 * evaluate a long path and return the designated object and its referred property
	 */ static evalPath(obj, path1) {
        return $c0486756bd3a8c4d$export$8ffa680996c65fde(obj, path1);
    }
}


export {$643fcf18b2d2e76f$export$d402cf8388053971 as Proxserve};
//# sourceMappingURL=index.js.map
