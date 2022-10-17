function $parcel$export(e, n, v, s) {
  Object.defineProperty(e, n, {get: v, set: s, enumerable: true, configurable: true});
}
/**
 * 2022 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */ "use strict";
const $cebd7357bd8525a2$export$f7e0aa381a5261fc = Symbol.for("proxserve_node_data"); // key for the data of a node
const $cebd7357bd8525a2$export$d1c20e4ad7d32581 = Symbol.for("proxserve_node_inherited_data"); // key for the inherited data of a node
const $cebd7357bd8525a2$export$94b8be4ec3303efd = {
    "Object": true,
    "Array": true
};
let $cebd7357bd8525a2$export$ee1d4171033e00ef;
(function(NODE_STATUSES) {
    NODE_STATUSES["active"] = "active";
    NODE_STATUSES["stopped"] = "stopped";
    NODE_STATUSES["blocked"] = "blocked";
    NODE_STATUSES["splicing"] = "splicing";
})($cebd7357bd8525a2$export$ee1d4171033e00ef || ($cebd7357bd8525a2$export$ee1d4171033e00ef = {}));
let $cebd7357bd8525a2$export$3f0ec6107d502ceb;
(function(PROXY_STATUSES) {
    PROXY_STATUSES["alive"] = "alive";
    PROXY_STATUSES["deleted"] = "deleted";
    PROXY_STATUSES["revoked"] = "revoked";
})($cebd7357bd8525a2$export$3f0ec6107d502ceb || ($cebd7357bd8525a2$export$3f0ec6107d502ceb = {}));
let $cebd7357bd8525a2$export$fa3d5b535a2458a1;
(function(EVENTS) {
    EVENTS["create"] = "create";
    EVENTS["update"] = "update";
    EVENTS["delete"] = "delete";
    EVENTS["splice"] = "splice";
    EVENTS["shift"] = "shift";
    EVENTS["unshift"] = "unshift";
})($cebd7357bd8525a2$export$fa3d5b535a2458a1 || ($cebd7357bd8525a2$export$fa3d5b535a2458a1 = {}));



/**
 * 2022 Noam Lin <noamlin@gmail.com>
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
    if (typeofvar === "Object") {
        const obj = variable;
        $c0486756bd3a8c4d$var$simpleCloneSet.add(obj);
        const cloned = {};
        let keys = Object.keys(obj);
        for (let key of keys)if ($c0486756bd3a8c4d$var$simpleCloneSet.has(obj[key])) cloned[key] = obj[key];
        else cloned[key] = $c0486756bd3a8c4d$export$d6f7d8248ac0a979(obj[key]);
        return cloned;
    } else if (typeofvar === "Array") {
        const arr = variable;
        $c0486756bd3a8c4d$var$simpleCloneSet.add(arr);
        const cloned1 = [];
        for(let i = 0; i < arr.length; i++)if ($c0486756bd3a8c4d$var$simpleCloneSet.has(arr[i])) cloned1[i] = arr[i];
        else cloned1[i] = $c0486756bd3a8c4d$export$d6f7d8248ac0a979(arr[i]);
        return cloned1;
    } else {
        if (typeofvar !== "Undefined" && typeofvar !== "Null" && typeofvar !== "Boolean" && typeofvar !== "Number" && typeofvar !== "BigInt" && typeofvar !== "String") console.warn(`Can't clone a variable of type ${typeofvar}`);
        return variable;
    }
}
function $c0486756bd3a8c4d$export$824c337f43f2b64d(path) {
    if (typeof path !== "string" || path === "") return [];
    let i = 0, betweenBrackets = false, onlyDigits = false;
    //loop will skip over openning '.' or '['
    if (path[0] === ".") i = 1;
    else if (path[0] === "[") {
        i = 1;
        betweenBrackets = true;
        onlyDigits = true;
    }
    let resultsArr = [];
    let tmp = "";
    for(; i < path.length; i++){
        let char = path[i];
        if (betweenBrackets) {
            if (char === "]") {
                if (onlyDigits) resultsArr.push(parseInt(tmp, 10));
                else resultsArr.push(tmp);
                betweenBrackets = false;
                onlyDigits = false;
                tmp = "";
            } else {
                if (onlyDigits) {
                    let code = char.charCodeAt(0);
                    if (code < 48 || code > 57) onlyDigits = false;
                }
                tmp += char;
            }
        } else {
            if (char === "[") {
                betweenBrackets = true;
                onlyDigits = true;
            }
            //check if starting a new property but avoid special case of [prop][prop]
            if (char === "." || char === "[") {
                if (tmp !== "") {
                    resultsArr.push(tmp);
                    tmp = "";
                }
            } else tmp += char;
        }
    }
    if (tmp !== "") resultsArr.push(tmp);
    return resultsArr;
}
function $c0486756bd3a8c4d$export$8ffa680996c65fde(obj, path) {
    if (path === "") return {
        object: obj,
        property: "",
        value: obj
    };
    let segments = $c0486756bd3a8c4d$export$824c337f43f2b64d(path);
    let i;
    for(i = 0; i <= segments.length - 2; i++){
        obj = obj[segments[i]];
        if (typeof obj === "undefined") throw new Error(`Invalid path was given - "${path}"`);
    }
    return {
        object: obj,
        property: segments[i],
        value: obj[segments[i]]
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
$parcel$export($f6f254486f25c78f$exports, "getProxserveName", function () { return $f6f254486f25c78f$export$e4722608b73ef3f1; });
$parcel$export($f6f254486f25c78f$exports, "whoami", function () { return $f6f254486f25c78f$export$533e55abf9329f7b; });
$parcel$export($f6f254486f25c78f$exports, "getProxserveNodes", function () { return $f6f254486f25c78f$export$c3c6db5039118967; });



/**
 * 2022 Noam Lin <noamlin@gmail.com>
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
    this.dataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status = (0, $cebd7357bd8525a2$export$ee1d4171033e00ef).stopped;
};
const $f6f254486f25c78f$export$837bd02682cd3db9 = function block() {
    this.dataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status = (0, $cebd7357bd8525a2$export$ee1d4171033e00ef).blocked;
};
const $f6f254486f25c78f$export$234c45b355edd85b = function activate(force = false) {
    if (force || this.dataNode === this.metadata.dataTree) this.dataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status = (0, $cebd7357bd8525a2$export$ee1d4171033e00ef).active;
    else delete this.dataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status;
};
const $f6f254486f25c78f$export$af631764ddc44097 = function on(args) {
    const { path: path = "" , listener: listener , id: id , deep: deep = false , once: once = false ,  } = args;
    // its nicer to expose `event` to the user,
    // but since it is semi-reserved word, we internally rename it to `events`
    let { event: events  } = args;
    if (events === "change") events = Object.keys((0, $cebd7357bd8525a2$export$fa3d5b535a2458a1)); // will listen to all events
    else if (!Array.isArray(events)) events = [
        events
    ];
    for (let event of events)if (!(0, $cebd7357bd8525a2$export$fa3d5b535a2458a1)[event]) {
        const names = Object.keys((0, $cebd7357bd8525a2$export$fa3d5b535a2458a1));
        throw new Error(`${event} is not a valid event. valid events are ${names.join(",")}`);
    }
    let dataNode = this.dataNode;
    let segments = (0, $c0486756bd3a8c4d$export$824c337f43f2b64d)(path);
    for (let property of segments){
        if (!dataNode[property]) // create data-nodes if needed (in dataNode[property]), but don't create/overwrite proxy-nodes
        (0, $431788524d5470e1$export$953dd193a01bd6ec)(dataNode, property);
        dataNode = dataNode[property];
    }
    let listenersPool = dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].listeners.shallow;
    if (deep) listenersPool = dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].listeners.deep;
    let listenerObj = {
        type: events,
        once: once,
        func: listener
    };
    if (id !== undefined) listenerObj.id = id;
    listenersPool.push(listenerObj);
};
const $f6f254486f25c78f$export$d2de3aaeafa91619 = function once(args) {
    args.once = true;
    $f6f254486f25c78f$export$af631764ddc44097.call(this, args);
};
function $f6f254486f25c78f$var$removeById(listenersArr, id) {
    for(let i = listenersArr.length - 1; i >= 0; i--){
        let listenerObj = listenersArr[i];
        if (id !== undefined && listenerObj.id === id || listenerObj.func === id) listenersArr.splice(i, 1);
    }
}
const $f6f254486f25c78f$export$b03e9483f936dccb = function removeListener(args) {
    const { id: id , path: path = ""  } = args;
    const fullPath = `${this.dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].path}${path}`;
    let dataNode = this.dataNode;
    const segments = (0, $c0486756bd3a8c4d$export$824c337f43f2b64d)(path);
    // traverse down the tree
    for (let property of segments){
        if (!dataNode[property]) {
            console.warn(`can't remove listener from a non-existent path '${fullPath}'`);
            return;
        }
        dataNode = dataNode[property];
    }
    $f6f254486f25c78f$var$removeById(dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].listeners.shallow, id);
    $f6f254486f25c78f$var$removeById(dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].listeners.deep, id);
};
const $f6f254486f25c78f$export$6f2e3a6079f109b1 = function removeAllListeners(path = "") {
    const fullPath = `${this.dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].path}${path}`;
    const segments = (0, $c0486756bd3a8c4d$export$824c337f43f2b64d)(path);
    let dataNode = this.dataNode;
    //traverse down the tree
    for (let property of segments){
        if (!dataNode[property]) {
            console.warn(`can't remove all listeners from a non-existent path '${fullPath}'`);
            return;
        }
        dataNode = dataNode[property];
    }
    dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].listeners.shallow = [];
    dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].listeners.deep = [];
};
const $f6f254486f25c78f$export$35f261dd63190ac1 = function getOriginalTarget() {
    return this.proxyNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].target;
};
const $f6f254486f25c78f$export$e4722608b73ef3f1 = function getProxserveName() {
    return this.dataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].name;
};
const $f6f254486f25c78f$export$533e55abf9329f7b = function whoami() {
    return this.dataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].name + this.dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].path;
};
const $f6f254486f25c78f$export$c3c6db5039118967 = function getProxserveNodes() {
    return {
        dataNode: this.dataNode,
        proxyNode: this.proxyNode
    };
};


/**
 * 2022 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */ "use strict";
function $431788524d5470e1$export$1b787634d8e3bf02(obj, property) {
    if (typeof property === "symbol") throw new Error(`property of type "symbol" isn't path'able`);
    const typeofobj = (0, $c0486756bd3a8c4d$export$99a2acdf670c1bf4)(obj);
    switch(typeofobj){
        case "Object":
            return `.${property}`;
        case "Array":
            return `[${property}]`;
        default:
            console.warn(`Not Implemented (type of '${typeofobj}')`);
            return property;
    }
}
function $431788524d5470e1$export$a58c3ed528c9c399(value) {
    const typeofvalue = (0, $c0486756bd3a8c4d$export$99a2acdf670c1bf4)(value);
    if ((0, $cebd7357bd8525a2$export$94b8be4ec3303efd)[typeofvalue]) {
        let target = value;
        try {
            target = value.$getOriginalTarget();
        } catch (error) {}
        switch(typeofvalue){
            case "Object":
                let keys = Object.keys(target);
                for (let key of keys)target[key] = $431788524d5470e1$export$a58c3ed528c9c399(target[key]); // maybe alters target and maybe returning the exact same object
                break;
            case "Array":
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
    if (parentProxyNode?.[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].target) propertyPath = $431788524d5470e1$export$1b787634d8e3bf02(parentProxyNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].target, property);
    else propertyPath = $431788524d5470e1$export$1b787634d8e3bf02({}, property); // if parent doesn't have target then treat it as object
    //handle data node
    let dataNode = parentDataNode[property]; // try to receive existing data-node
    if (!dataNode) {
        dataNode = {
            [(0, $cebd7357bd8525a2$export$d1c20e4ad7d32581)]: Object.create(parentDataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581]),
            [(0, $cebd7357bd8525a2$export$f7e0aa381a5261fc)]: {
                parentNode: parentDataNode,
                listeners: {
                    shallow: [],
                    deep: []
                }
            }
        };
        parentDataNode[property] = dataNode;
    }
    delete dataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status; // clears old status in case a node previously existed
    // updates path (for rare case where parent was array and then changed to object or vice versa)
    if (!parentDataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].isTreePrototype) Object.assign(dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc], {
        path: parentDataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].path + propertyPath,
        propertyPath: propertyPath
    });
    else Object.assign(dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc], {
        path: "",
        propertyPath: ""
    });
    // handle proxy node
    let proxyNode;
    if (parentProxyNode) {
        proxyNode = {
            [(0, $cebd7357bd8525a2$export$d1c20e4ad7d32581)]: Object.create(parentProxyNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581]),
            [(0, $cebd7357bd8525a2$export$f7e0aa381a5261fc)]: {
                target: target,
                dataNode: dataNode
            }
        };
        parentProxyNode[property] = proxyNode;
        // attach nodes to each other
        dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxyNode = proxyNode;
    } else // this scenario is dangerous and exists only for `on()` of future variables (paths) that don't yet exist
    proxyNode = undefined;
    return {
        dataNode: dataNode,
        proxyNode: proxyNode
    };
}
let $431788524d5470e1$var$noStackFlag = false;
function $431788524d5470e1$export$af0f09151be4a419(logLevel, dataNode, change) {
    if (logLevel === "none") return;
    const err = new Error();
    const stack = err.stack;
    if (!stack) {
        if (!$431788524d5470e1$var$noStackFlag) {
            // log this only once. no need to spam.
            console.error("Can't log stack trace of proxserve. browser/runtime doesn't support Error.stack");
            $431788524d5470e1$var$noStackFlag = true;
        }
        return;
    }
    // break stack to individual lines. each line will point to a file and function.
    const lines = stack.split("\n").map((value)=>{
        return value.trim();
    });
    // remove first and useless Error line.
    if (lines[0].toLowerCase().indexOf("error") === 0) lines.shift();
    // delete this function's own line.
    lines.shift();
    // delete `initEmitEvent` line.
    lines.shift();
    // write our message head.
    const pathname = (0, $f6f254486f25c78f$export$533e55abf9329f7b).call({
        dataNode: dataNode
    });
    let title = `${pathname} has been `;
    switch(change.type){
        case (0, $cebd7357bd8525a2$export$fa3d5b535a2458a1).create:
            title += "created";
            break;
        case (0, $cebd7357bd8525a2$export$fa3d5b535a2458a1).update:
            title += "updated";
            break;
        case (0, $cebd7357bd8525a2$export$fa3d5b535a2458a1).delete:
            title += "deleted";
            break;
    }
    lines.unshift(title);
    console.log(lines.join("\n"));
}



var $26afb3b451fe81b5$exports = {};

$parcel$export($26afb3b451fe81b5$exports, "splice", function () { return $26afb3b451fe81b5$export$869882364835d202; });
$parcel$export($26afb3b451fe81b5$exports, "shift", function () { return $26afb3b451fe81b5$export$fba63a578e423eb; });
$parcel$export($26afb3b451fe81b5$exports, "unshift", function () { return $26afb3b451fe81b5$export$37cdb546b806ae87; });




/**
 * 2022 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */ "use strict";
/**
 * try to get the proxy-object from a data-node. if can't then from it's parent's proxy
 * @param dataNode 
 * @param property - the property as the dataNode is assigned on its parent
 */ function $590092d9df4e6b38$var$getProxyValue(dataNode, property) {
    if (dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxyNode && dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxyNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status === (0, $cebd7357bd8525a2$export$3f0ec6107d502ceb).alive) return dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxyNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy; // actual proxy of child node
    else {
        if (!property) // my property on the parent
        property = (0, $c0486756bd3a8c4d$export$824c337f43f2b64d)(dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].propertyPath)[0];
        let parentNode = dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].parentNode;
        if (parentNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxyNode && parentNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxyNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status === (0, $cebd7357bd8525a2$export$3f0ec6107d502ceb).alive) return parentNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxyNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy?.[property]; // proxy or primitive via parent's proxy object
    }
    return undefined;
}
function $590092d9df4e6b38$export$febbc75e71f4ca1b(dataNode, property, oldValue, wasOldValueProxy, value, isValueProxy, trace) {
    if (oldValue === value // no new change was made
     || !dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxyNode) return;
    let proxyNode = dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxyNode;
    if (proxyNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status !== (0, $cebd7357bd8525a2$export$3f0ec6107d502ceb).alive) return;
    let changeType = (0, $cebd7357bd8525a2$export$fa3d5b535a2458a1).update;
    if (value === undefined) changeType = (0, $cebd7357bd8525a2$export$fa3d5b535a2458a1).delete;
    else if (oldValue === undefined) changeType = (0, $cebd7357bd8525a2$export$fa3d5b535a2458a1).create;
    let deferredEvents;
    // altering properties of an array that's in the middle of a splicing phase
    if (dataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status === (0, $cebd7357bd8525a2$export$ee1d4171033e00ef).splicing) {
        // initiate (if needed) an object to hold side effect events
        if (!dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].deferredEvents) dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].deferredEvents = [];
        // save a reference to the deferredEvents
        deferredEvents = dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].deferredEvents;
    }
    let path;
    if (dataNode[property]) {
        dataNode = dataNode[property];
        path = "";
    } else path = (0, $431788524d5470e1$export$1b787634d8e3bf02)(proxyNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].target, property);
    let change = {
        path: path,
        value: value,
        oldValue: oldValue,
        type: changeType
    };
    if (!deferredEvents) {
        if (trace === "normal" || trace === "verbose") (0, $431788524d5470e1$export$af0f09151be4a419)(trace, dataNode, change);
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
 * @param property - property name of the data-node (i.e. as the data-node is assigned to its parent)
 */ function $590092d9df4e6b38$var$bubbleEmit(dataNode, change, property) {
    if (dataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status === (0, $cebd7357bd8525a2$export$ee1d4171033e00ef).stopped) return; // not allowed to emit
    let thisValue = $590092d9df4e6b38$var$getProxyValue(dataNode, property);
    if (change.path === "") $590092d9df4e6b38$var$iterateAndEmit(dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].listeners.shallow, thisValue, change);
    // iterate over 'deep' listeners
    $590092d9df4e6b38$var$iterateAndEmit(dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].listeners.deep, thisValue, change);
    if (!dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].parentNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].isTreePrototype) {
        // create a shallow copy of 'change' and update its path
        // (we don't want to alter the 'change' object that was just emitted to a listener)
        let nextChange = {
            ...change,
            path: dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].propertyPath + change.path
        };
        $590092d9df4e6b38$var$bubbleEmit(dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].parentNode, nextChange);
    }
}
/**
 * capturing phase - go down the data tree and emit
 * @param dataNode
 * @param change
 */ function $590092d9df4e6b38$var$captureEmit(dataNode, change) {
    let keys = Object.keys(dataNode);
    for (let key of keys){
        let subValue = typeof change.value === "object" && change.value !== null ? change.value[key] : undefined;
        let subOldValue = typeof change.oldValue === "object" && change.oldValue !== null ? change.oldValue[key] : undefined;
        if (subValue !== subOldValue) {
            let changeType = (0, $cebd7357bd8525a2$export$fa3d5b535a2458a1).update;
            if (subValue === undefined) changeType = (0, $cebd7357bd8525a2$export$fa3d5b535a2458a1).delete;
            else if (subOldValue === undefined) changeType = (0, $cebd7357bd8525a2$export$fa3d5b535a2458a1).create;
            let subChange = {
                path: "",
                oldValue: subOldValue,
                value: subValue,
                type: changeType
            };
            // failing the status check will not emit for current property (but sub-properties might still be forcibly active)
            let childNode = dataNode[key];
            if (childNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status !== (0, $cebd7357bd8525a2$export$ee1d4171033e00ef).stopped) {
                let thisValue = $590092d9df4e6b38$var$getProxyValue(childNode, key);
                $590092d9df4e6b38$var$iterateAndEmit(childNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].listeners.shallow, thisValue, subChange);
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
        path: "",
        value: value,
        oldValue: oldValue,
        type: funcName,
        args: funcArgs
    };
    $590092d9df4e6b38$var$bubbleEmit(dataNode, change);
    if (dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].deferredEvents) {
        // manually handle the side-effect events that were caught
        // in order to not bubble up, but should capture down
        for (let event of dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].deferredEvents){
            if (event.change.path === "") {
                // no path means its an event directly on the property, not on the parent.
                // i.e: not an event with path "0" on ".arr", but an event with no path on ".arr[0]".
                // function event on "arr" already ran, but now a regular event on "arr[0]" is due
                let thisValue = $590092d9df4e6b38$var$getProxyValue(event.dataNode);
                $590092d9df4e6b38$var$iterateAndEmit(event.dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].listeners.shallow, thisValue, event.change);
                $590092d9df4e6b38$var$iterateAndEmit(event.dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].listeners.deep, thisValue, event.change);
            }
            if (event.shouldCapture) $590092d9df4e6b38$var$captureEmit(event.dataNode, event.change);
        }
        delete dataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].deferredEvents;
    } else console.warn(`no side effect events for ${funcName} were made`);
}


/**
 * 2022 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */ // Proxy methods are methods that will proxy JS built-in methods.
// For examply, the proxy function for "splice" will handle some event stuff and then use
// the actual "splice" function internally
"use strict";
const $26afb3b451fe81b5$export$869882364835d202 = function splice(start, deleteCount, ...items) {
    if (this.dataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status !== (0, $cebd7357bd8525a2$export$ee1d4171033e00ef).active) // if not active then run regular `splice`
    // which will reach the `set` of the ProxyHandler and will be blocked or events stopped, etc.
    return Array.prototype.splice.call(this.proxyNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy, start, deleteCount, ...items);
    let isActiveByInheritance = !this.dataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].hasOwnProperty("status");
    this.dataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status = (0, $cebd7357bd8525a2$export$ee1d4171033e00ef).splicing;
    let oldValue = this.proxyNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].target.slice(0);
    let deleted = Array.prototype.splice.call(this.proxyNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy, start, deleteCount, ...items); // creates many side-effect events
    let args = {
        start: start,
        deleteCount: deleteCount,
        items: items
    };
    if (isActiveByInheritance) delete this.dataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status;
    else this.dataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status = (0, $cebd7357bd8525a2$export$ee1d4171033e00ef).active;
    (0, $590092d9df4e6b38$export$29f2d3a310653bb4)(this.dataNode, (0, $cebd7357bd8525a2$export$fa3d5b535a2458a1).splice, args, oldValue, this.proxyNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].target);
    return deleted;
};
const $26afb3b451fe81b5$export$fba63a578e423eb = function shift() {
    if (this.dataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status !== (0, $cebd7357bd8525a2$export$ee1d4171033e00ef).active) // if not active then run regular `shift`
    // which will reach the `set` of the ProxyHandler and will be blocked or events stopped, etc.
    return Array.prototype.shift.call(this.proxyNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy);
    let isActiveByInheritance = !this.dataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].hasOwnProperty("status");
    this.dataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status = (0, $cebd7357bd8525a2$export$ee1d4171033e00ef).splicing;
    let oldValue = this.proxyNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].target.slice(0);
    let deleted = Array.prototype.shift.call(this.proxyNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy); // creates many side-effect events
    if (isActiveByInheritance) delete this.dataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status;
    else this.dataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status = (0, $cebd7357bd8525a2$export$ee1d4171033e00ef).active;
    (0, $590092d9df4e6b38$export$29f2d3a310653bb4)(this.dataNode, (0, $cebd7357bd8525a2$export$fa3d5b535a2458a1).shift, {}, oldValue, this.proxyNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].target);
    return deleted;
};
const $26afb3b451fe81b5$export$37cdb546b806ae87 = function unshift(...items) {
    if (this.dataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status !== (0, $cebd7357bd8525a2$export$ee1d4171033e00ef).active) // if not active then run regular `unshift`
    // which will reach the `set` of the ProxyHandler and will be blocked or events stopped, etc.
    return Array.prototype.shift.call(this.proxyNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy);
    let isActiveByInheritance = !this.dataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].hasOwnProperty("status");
    this.dataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status = (0, $cebd7357bd8525a2$export$ee1d4171033e00ef).splicing;
    let oldValue = this.proxyNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].target.slice(0);
    let newLength = Array.prototype.unshift.call(this.proxyNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy, ...items); // creates many side-effect events
    let args = {
        items: items
    };
    if (isActiveByInheritance) delete this.dataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status;
    else this.dataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status = (0, $cebd7357bd8525a2$export$ee1d4171033e00ef).active;
    (0, $590092d9df4e6b38$export$29f2d3a310653bb4)(this.dataNode, (0, $cebd7357bd8525a2$export$fa3d5b535a2458a1).unshift, args, oldValue, this.proxyNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].target);
    return newLength;
};




/**
 * 2022 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */ "use strict";
const $643fcf18b2d2e76f$var$doNotProxifyPrefix = "_$";
const $643fcf18b2d2e76f$var$pseudoMethodsAlternativeNamingPrefix = "$";
/**
 * save an array of all reserved function names
 * and also add synonyms to these functions
 */ let $643fcf18b2d2e76f$var$pseudoMethodsNames = Object.keys($f6f254486f25c78f$exports);
for(let i = $643fcf18b2d2e76f$var$pseudoMethodsNames.length - 1; i >= 0; i--){
    let name = $643fcf18b2d2e76f$var$pseudoMethodsNames[i];
    let synonym = $643fcf18b2d2e76f$var$pseudoMethodsAlternativeNamingPrefix + name;
    $f6f254486f25c78f$exports[synonym] = $f6f254486f25c78f$exports[name];
    $643fcf18b2d2e76f$var$pseudoMethodsNames.push(synonym);
}
class $643fcf18b2d2e76f$export$d402cf8388053971 {
    /**
	 * make a new proxserve instance
	 */ static make(target, options = {}) {
        const { strict: strict = true , methodsEmitRaw: methodsEmitRaw = false , name: name = "" , debug: debug ,  } = options;
        const destroyDelay = debug?.destroyDelay ?? 1000;
        const trace = debug?.trace ?? "none";
        let dataTreePrototype = {
            [(0, $cebd7357bd8525a2$export$d1c20e4ad7d32581)]: {
                status: (0, $cebd7357bd8525a2$export$ee1d4171033e00ef).active,
                name: name
            },
            [(0, $cebd7357bd8525a2$export$f7e0aa381a5261fc)]: {
                isTreePrototype: true
            }
        };
        let proxyTreePrototype = {
            [(0, $cebd7357bd8525a2$export$d1c20e4ad7d32581)]: {
                status: (0, $cebd7357bd8525a2$export$3f0ec6107d502ceb).alive
            },
            [(0, $cebd7357bd8525a2$export$f7e0aa381a5261fc)]: {
                isTreePrototype: true
            }
        };
        const newNodes = (0, $431788524d5470e1$export$953dd193a01bd6ec)(dataTreePrototype, "", proxyTreePrototype, target);
        const metadata = {
            strict: strict,
            methodsEmitRaw: methodsEmitRaw,
            destroyDelay: destroyDelay,
            trace: trace,
            dataTree: newNodes.dataNode,
            proxyTree: newNodes.proxyNode
        };
        return $643fcf18b2d2e76f$export$d402cf8388053971.createProxy(metadata, metadata.dataTree);
    }
    /**
	 * create a new proxy and a new node for a property of the parent's target-object
	 */ static createProxy(metadata, parentDataNode, targetProperty) {
        const parentProxyNode = parentDataNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxyNode;
        let dataNode;
        let proxyNode;
        if (targetProperty === undefined) {
            dataNode = parentDataNode;
            proxyNode = parentProxyNode;
        } else {
            //create new or reset an existing data-node and then creates a new proxy-node
            const newNodes = (0, $431788524d5470e1$export$953dd193a01bd6ec)(parentDataNode, targetProperty, parentProxyNode, parentProxyNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].target[targetProperty]);
            dataNode = newNodes.dataNode;
            proxyNode = newNodes.proxyNode;
        }
        let target = proxyNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].target;
        let typeoftarget = (0, $c0486756bd3a8c4d$export$99a2acdf670c1bf4)(target);
        if ((0, $cebd7357bd8525a2$export$94b8be4ec3303efd)[typeoftarget]) {
            let revocable = Proxy.revocable(target, {
                get: (target /*same as parent scope 'target'*/ , property, proxy)=>{
                    if (metadata.methodsEmitRaw === false && Object.prototype.hasOwnProperty.call($26afb3b451fe81b5$exports, property) && property in Object.getPrototypeOf(target)) // use a proxy method instead of the built-in method that is on the prototype chain
                    return $26afb3b451fe81b5$exports[property].bind({
                        metadata: metadata,
                        dataNode: dataNode,
                        proxyNode: proxyNode
                    });
                    else if ($643fcf18b2d2e76f$var$pseudoMethodsNames.includes(property) && typeof target[property] === "undefined") // can access a pseudo function (or its synonym) if their keywords isn't used
                    return $f6f254486f25c78f$exports[property].bind({
                        metadata: metadata,
                        dataNode: dataNode,
                        proxyNode: proxyNode
                    });
                    else if (!target.propertyIsEnumerable(property) || typeof property === "symbol") return target[property]; // non-enumerable or non-path'able aren't proxied
                    else if (proxyNode[property] // there's a child node
                     && proxyNode[property][0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy // it holds a proxy
                     && proxyNode[property][0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status === (0, $cebd7357bd8525a2$export$3f0ec6107d502ceb).alive) return proxyNode[property][0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy;
                    else return target[property];
                },
                set: (target /*same as parent scope 'target'*/ , property, value, proxy)=>{
                    /**
					 * property can be a regular object because of a few possible reasons:
					 * 1. proxy is deleted from tree but user keeps accessing it then it means he saved a reference.
					 * 2. it is a non-enumerable property which means it was intentionally hidden.
					 * 3. property is a symbol and symbols can't be proxied because we can't create a normal path for them.
					 *    these properties are not proxied and should not emit change-event.
					 *    except for: length
					 * 4. property is manually set as raw object with the special prefix.
					 * TODO - make a list of all possible properties exceptions (maybe function 'name'?)
					 */ if (dataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status === (0, $cebd7357bd8525a2$export$ee1d4171033e00ef).blocked) {
                        console.error("object is blocked. can't change value of property:", property);
                        return true;
                    } else if (typeof property === "symbol" || property.indexOf($643fcf18b2d2e76f$var$doNotProxifyPrefix) === 0) {
                        target[property] = value;
                        return true;
                    } else if (property !== "length" && !target.propertyIsEnumerable(property)) {
                        //if setting a whole new property then it is non-enumerable (yet) so a further test is needed
                        let descriptor = Object.getOwnPropertyDescriptor(target, property);
                        if (typeof descriptor === "object" && descriptor.enumerable === false) {
                            target[property] = value;
                            return true;
                        }
                    }
                    let oldValue = target[property]; // should not be proxy
                    let isOldValueProxy = false;
                    if (proxyNode[property] !== undefined && proxyNode[property][0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy !== undefined) {
                        // about to overwrite an existing property which is a proxy (about to detach a proxy)
                        proxyNode[property][0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status = (0, $cebd7357bd8525a2$export$3f0ec6107d502ceb).deleted;
                        delete dataNode[property][0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxyNode; // detach reference from data-node to proxy-node
                        isOldValueProxy = true;
                        if (metadata.strict) // postpone this cpu intense function for later, probably when proxserve is not in use
                        setTimeout($643fcf18b2d2e76f$export$d402cf8388053971.destroy, metadata.destroyDelay, proxyNode[property][0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy);
                    }
                    value = (0, $431788524d5470e1$export$a58c3ed528c9c399)(value);
                    target[property] = value; //assign new value
                    let isValueProxy = false;
                    let typeofvalue = (0, $c0486756bd3a8c4d$export$99a2acdf670c1bf4)(value);
                    if ((0, $cebd7357bd8525a2$export$94b8be4ec3303efd)[typeofvalue]) {
                        $643fcf18b2d2e76f$export$d402cf8388053971.createProxy(metadata, dataNode, property); // if trying to add a new value which is an object then make it a proxy
                        isValueProxy = true;
                    }
                    (0, $590092d9df4e6b38$export$febbc75e71f4ca1b)(dataNode, property, oldValue, isOldValueProxy, value, isValueProxy, metadata.trace);
                    return true;
                },
                /**
				 * TODO - this function is incomplete and doesn't handle all of 'descriptor' scenarios
				 */ defineProperty: (target /*same as parent scope 'target'*/ , property, descriptor)=>{
                    if (typeof property === "symbol") {
                        Object.defineProperty(target, property, descriptor);
                        return true;
                    }
                    let oldValue = target[property]; //should not be proxy
                    let isOldValueProxy = false;
                    if (proxyNode[property] !== undefined && proxyNode[property][0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy !== undefined) {
                        //about to overwrite an existing property which is a proxy (about to detach a proxy)
                        proxyNode[property][0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status = (0, $cebd7357bd8525a2$export$3f0ec6107d502ceb).deleted;
                        delete dataNode[property][0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxyNode; //detach reference from data-node to proxy-node
                        isOldValueProxy = true;
                        if (metadata.strict) //postpone this cpu intense function for later, probably when proxserve is not is use
                        setTimeout($643fcf18b2d2e76f$export$d402cf8388053971.destroy, metadata.destroyDelay, proxyNode[property][0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy);
                    }
                    descriptor.value = (0, $431788524d5470e1$export$a58c3ed528c9c399)(descriptor.value);
                    Object.defineProperty(target, property, descriptor); //defining the new value
                    let value = descriptor.value;
                    let isValueProxy = false;
                    //excluding non-enumerable properties from being proxied
                    let typeofvalue = (0, $c0486756bd3a8c4d$export$99a2acdf670c1bf4)(descriptor.value);
                    if ((0, $cebd7357bd8525a2$export$94b8be4ec3303efd)[typeofvalue] && descriptor.enumerable === true) {
                        $643fcf18b2d2e76f$export$d402cf8388053971.createProxy(metadata, dataNode, property); //if trying to add a new value which is an object then make it a proxy
                        isValueProxy = true;
                    }
                    (0, $590092d9df4e6b38$export$febbc75e71f4ca1b)(dataNode, property, oldValue, isOldValueProxy, value, isValueProxy);
                    return true;
                },
                deleteProperty: (target /*same as parent scope 'target'*/ , property)=>{
                    if (!target.propertyIsEnumerable(property) || typeof property === "symbol") {
                        //non-proxied properties simply get deleted and nothing more
                        delete target[property];
                        return true;
                    }
                    if (dataNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status === (0, $cebd7357bd8525a2$export$ee1d4171033e00ef).blocked) {
                        console.error(`can't delete property '${property}'. object is blocked.`);
                        return true;
                    }
                    if (property in target) {
                        let oldValue = target[property]; //should not be proxy
                        let isOldValueProxy = false;
                        if (proxyNode[property] !== undefined && proxyNode[property][0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy !== undefined) {
                            //about to overwrite an existing property which is a proxy (about to detach a proxy)
                            proxyNode[property][0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status = (0, $cebd7357bd8525a2$export$3f0ec6107d502ceb).deleted;
                            delete dataNode[property][0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxyNode; //detach reference from data-node to proxy-node
                            isOldValueProxy = true;
                            if (metadata.strict) //postpone this cpu intense function for later, probably when proxserve is not is use
                            setTimeout($643fcf18b2d2e76f$export$d402cf8388053971.destroy, metadata.destroyDelay, proxyNode[property][0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy);
                        }
                        delete target[property]; // actual delete
                        (0, $590092d9df4e6b38$export$febbc75e71f4ca1b)(dataNode, property, oldValue, isOldValueProxy, undefined, false);
                        return true;
                    } else return true; //do nothing because there's nothing to delete
                }
            });
            proxyNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy = revocable.proxy;
            proxyNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].revoke = revocable.revoke;
            if ((0, $cebd7357bd8525a2$export$94b8be4ec3303efd)[typeoftarget]) {
                let keys = Object.keys(target); //handles both Objects and Arrays
                for (let key of keys){
                    if (key.indexOf($643fcf18b2d2e76f$var$doNotProxifyPrefix) === 0) continue;
                    let typeofproperty = (0, $c0486756bd3a8c4d$export$99a2acdf670c1bf4)(target[key]);
                    if ((0, $cebd7357bd8525a2$export$94b8be4ec3303efd)[typeofproperty]) $643fcf18b2d2e76f$export$d402cf8388053971.createProxy(metadata, dataNode, key); //recursively make child objects also proxies
                }
            } else console.warn(`Type of "${typeoftarget}" is not implemented`);
            return revocable.proxy;
        } else {
            const types = Object.keys((0, $cebd7357bd8525a2$export$94b8be4ec3303efd));
            throw new Error(`Must observe an ${types.join("/")}`);
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
        if (proxyNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status === (0, $cebd7357bd8525a2$export$3f0ec6107d502ceb).alive) proxyNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status = (0, $cebd7357bd8525a2$export$3f0ec6107d502ceb).deleted;
        let typeofproxy = (0, $c0486756bd3a8c4d$export$99a2acdf670c1bf4)(proxy);
        if ((0, $cebd7357bd8525a2$export$94b8be4ec3303efd)[typeofproxy]) {
            let keys = Object.keys(proxy); // handles both Objects and Arrays
            for (let key of keys){
                if (key.indexOf($643fcf18b2d2e76f$var$doNotProxifyPrefix) === 0) continue;
                try {
                    let typeofproperty = (0, $c0486756bd3a8c4d$export$99a2acdf670c1bf4)(proxy[key]);
                    if ((0, $cebd7357bd8525a2$export$94b8be4ec3303efd)[typeofproperty]) // going to proxy[key], which is deleted, will return the original target so we will bypass it
                    $643fcf18b2d2e76f$export$d402cf8388053971.destroy(proxyNode[key][0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].proxy);
                } catch (error1) {
                    console.error(error1); // don't throw and kill the whole process just if this iteration fails
                }
            }
            proxyNode[0, $cebd7357bd8525a2$export$f7e0aa381a5261fc].revoke?.();
            //proxyNode[ND].proxy = undefined;
            proxyNode[0, $cebd7357bd8525a2$export$d1c20e4ad7d32581].status = (0, $cebd7357bd8525a2$export$3f0ec6107d502ceb).revoked;
        } else console.warn(`Type of "${typeofproxy}" is not implemented`);
    }
    /**
	 * splits a path to an array of properties
	 */ static splitPath(path) {
        return (0, $c0486756bd3a8c4d$export$824c337f43f2b64d)(path);
    }
    /**
	 * evaluate a long path and return the designated object and its referred property
	 */ static evalPath(obj, path) {
        return (0, $c0486756bd3a8c4d$export$8ffa680996c65fde)(obj, path);
    }
}


export {$643fcf18b2d2e76f$export$d402cf8388053971 as Proxserve};
//# sourceMappingURL=index.js.map
