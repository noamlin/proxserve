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
"use strict"

import { eventNames, proxyStatuses, ND, NID } from './global-vars.js';
import { createDataNode } from './supporting-functions.js';
import { splitPath } from './general-functions.js';

/**
 * stop object and children from emitting change events
 * automatically filled param {Object} dataNode
 */
export function stop(dataNode) {
	dataNode[NID].status = proxyStatuses.STOPPED;
}

/**
 * block object and children from any changes.
 * user can't set nor delete any property
 * automatically filled param {Object} dataNode
 */
export function block(dataNode) {
	dataNode[NID].status = proxyStatuses.BLOCKED;
}

/**
 * resume default behavior of emitting change events, inherited from parent
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} objects
 * @param {Boolean} [force] - force being active regardless of parent
 */
export function activate(dataNode, objects, force=false) {
	if(force || dataNode === this.dataTree) { //force activation or we are on root proxy
		dataNode[NID].status = proxyStatuses.ACTIVE;
	}
	else {
		delete dataNode[NID].status;
	}
}

/**
 * add event listener on a proxy or on a descending path
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} objects
 * @param {String|Array.String} events
 * @param {String} [path] - path selector
 * @param {Function} listener
 * @param {Object} [options]
 * 	@property {Boolean} [options.deep] - should listen for event emitted by sub-objects or not
 * 	@property {Boolean} [options.id] - identifier for removing this listener later
 * 	@property {Boolean} [options.once] - whether this listener will run only once or always
 */
export function on(dataNode, objects, events, path, listener, {deep=false, id=undefined, once=false} = {}) {
	if(events === 'change') events = eventNames.slice(0); //will listen to all events
	else if(!Array.isArray(events)) events = [events];

	for(let event of events) {
		if(!eventNames.includes(event)) {
			throw new Error(`${event} is not a valid event. valid events are ${eventNames.join(',')}`);
		}
	}
	
	if(typeof path === 'function') { //if called without path
		if(typeof listener === 'object') {
			if(typeof listener.deep === 'boolean') deep = listener.deep;
			if(listener.id !== undefined) id = listener.id;
			if(typeof listener.once === 'boolean') once = listener.once;
		}
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

	let listenersPool = dataNode[ND].listeners.shallow;
	if(deep) listenersPool = dataNode[ND].listeners.deep;

	let listenerObj = {
		type: events,
		once: once,
		func: listener
	};
	if(id !== undefined) {
		listenerObj.id = id;
	}
	listenersPool.push(listenerObj);
}

/**
 * add event listener on a proxy or on a descending path which will run only once
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} objects
 * @param {String|Array.String} events
 * @param {String} [path] - path selector
 * @param {Function} listener 
 * @param {String} [options]
 */
export function once(dataNode, objects, events, path, listener, options) {
	if(typeof options !== 'object') options = {};
	options.once = true;
	on.call(this, dataNode, objects, events, path, listener, options);
}

/**
 * removes a listener from a path by an identifier (can have multiple listeners with the same ID)
 * or by the listener function itself
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} objects
 * @param {String} [path] - path selector
 * @param {String|Function} id - the listener(s) identifier or listener-function
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

	function removeById(listenersArr, id) {
		for(let i = listenersArr.length - 1; i >= 0; i--) {
			let listenerObj = listenersArr[i];
			if((id !== undefined && listenerObj.id === id) || listenerObj.func === id) {
				listenersArr.splice(i, 1);
			}
		}
	}

	removeById(dataNode[ND].listeners.shallow, id);
	removeById(dataNode[ND].listeners.deep, id);
}

/**
 * removing all listeners of a path
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} objects
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

	dataNode[ND].listeners.shallow = [];
	dataNode[ND].listeners.deep = [];
}

/**
 * the following functions (getOriginalTarget, getProxserveObjects, getProxserveDataNode, getProxserveInstance) seem silly
 * because they could have been written directly on the handler's get() method but it's here as part of the convention of
 * exposing proxy-"inherited"-methods
 */
/**
 * get original target that is behind the proxy
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} objects
 */
export function getOriginalTarget(dataNode, objects) {
	return objects.target;
}

/**
 * get 'objects' (which holds all related objects) of a proxy
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} objects
 */
export function getProxserveObjects(dataNode, objects) {
	return objects;
}

/**
 * get the data-node of the proxy or sub-proxy
 * automatically filled param {Object} dataNode
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