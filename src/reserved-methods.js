/**
 * Copyright 2020 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
"use strict"

import { acceptableEvents, statuses, createDataNode } from './supporting-functions.js';
import { splitPath } from './general-functions.js';

let ND = Symbol.for('proxserve_node_data'); //key for the data of a node
let NID = Symbol.for('proxserve_node_inherited_data'); //key for the inherited data of a node

/**
 * stop object and children from emitting change events
 * @param {Object} dataNode
 */
export function stop(dataNode) {
	dataNode[NID].status = statuses[1];
}

/**
 * block object and children from any changes.
 * user can't set nor delete any property
 * @param {Object} dataNode
 */
export function block(dataNode) {
	dataNode[NID].status = statuses[2];
}

/**
 * resume default behavior of emitting change events, inherited from parent
 * @param {Object} dataNode
 * @param {Object} objects
 * @param {Boolean} [force] - force being active regardless of parent
 */
export function activate(dataNode, objects, force=false) {
	if(force || dataNode === this.dataTree) { //force activation or we are on root proxy
		dataNode[NID].status = statuses[0];
	}
	else {
		delete dataNode[NID].status;
	}
}

/**
 * add event listener on a proxy or on a descending path
 * @param {Object} dataNode
 * @param {Object} objects
 * @param {String} event 
 * @param {String} [path] - path selector
 * @param {Function} listener 
 * @param {String} [id] - identifier for removing this listener
 * @param {Boolean} [once] - whether this listener will run only once or always
 */
export function on(dataNode, objects, event, path, listener, id, once=false) {
	if(acceptableEvents.includes(event)) {
		if(typeof path === 'function') { //if called without path
			id = listener;
			listener = path;
			path = '';
		} else if(typeof listener !== 'function') {
			throw new Error(`invalid arguments were given. listener must be a function`);
		}
		
		let segments = splitPath(path);
		//traverse down the tree. create data-nodes if needed
		for(let property of segments) {
			if(!dataNode[property]) {
				createDataNode(dataNode, property);
			}
			dataNode = dataNode[property];
		}

		if(!dataNode[ND].listeners) {
			dataNode[ND].listeners = [];
			dataNode[ND].eventPool = [];
		}
		dataNode[ND].listeners.push([event, listener, id, once]);
	}
	else {
		throw new Error(`${event} is not a valid event. valid events are ${acceptableEvents.join(',')}`);
	}
}

/**
 * add event listener on a proxy or on a descending path which will run only once
 * @param {Object} dataNode
 * @param {Object} objects
 * @param {String} event 
 * @param {String} [path] - path selector
 * @param {Function} listener 
 * @param {String} [id] - identifier for removing this listener
 */
export function once(dataNode, objects, event, path, listener, id) {
	on.call(this, dataNode, objects, event, path, listener, id, true);
}

/**
 * removes a listener from a path by an identifier (can have multiple listeners with the same ID)
 * or by the listener function itself
 * @param {Object} dataNode
 * @param {Object} objects
 * @param {String} [path] - path selector
 * @param {String} id - the listener(s) identifier or listener-function
 */
export function removeListener(dataNode, objects, path, id) {
	if(arguments.length === 3) { //if called without path
		id = path;
		path = '';
	}

	let fullPath = `${dataNode[ND].path}${path}`;
	let segments = splitPath(path);
	//traverse down the tree
	for(let property of segments) {
		if(!dataNode[property]) {
			console.warn(`can't remove listener from a non-existent path '${fullPath}'`);
			return;
		}
		dataNode = dataNode[property];
	}

	if(dataNode[ND].listeners) {
		let listeners = dataNode[ND].listeners;
	
		for(let i = listeners.length - 1; i >= 0; i--) {
			if((typeof id !== 'function' && listeners[i][2] === id)
			|| (typeof id === 'function' && listeners[i][1] === id)) {
				listeners.splice(i, 1);
			}
		}

		if(listeners.length === 0) {
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
export function removeAllListeners(dataNode, objects, path='') {
	let fullPath = `${dataNode[ND].path}${path}`;
	let segments = splitPath(path);
	//traverse down the tree
	for(let property of segments) {
		if(!dataNode[property]) {
			console.warn(`can't remove all listeners from a non-existent path '${fullPath}'`);
			return;
		}
		dataNode = dataNode[property];
	}

	if(dataNode[ND].listeners) {
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
export function getOriginalTarget(dataNode, objects) {
	return objects.target;
}

/**
 * get 'objects' (which hold all related objects) of a proxy
 * @param {Object} dataNode
 * @param {Object} objects
 */
export function getProxserveObjects(dataNode, objects) {
	return objects;
}

/**
 * get the data-node of the proxy or sub-proxy
 * @param {Object} dataNode
 */
export function getProxserveDataNode(dataNode) {
	return dataNode;
}

/**
 * get the Proxserve's instance that created this proxy
 */
export function getProxserveInstance() {
	return this;
}
