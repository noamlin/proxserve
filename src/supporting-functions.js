/**
 * Copyright 2020 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
"use strict"

import { realtypeof } from './general-functions.js';

export let acceptableTypes = ['Object', 'Array', 'Map']; //acceptable types to be proxied
export let acceptableEvents = ['change', 'create', 'update', 'delete'];
export let statuses = ['active', 'stopped', 'blocked']; //statuses of proxies

let ND = Symbol.for('proxserve_node_data'); //key for the data of a node
let NID = Symbol.for('proxserve_node_inherited_data'); //key for the inherited data of a node

/**
 * Convert property name to valid path segment
 * @param {*} obj 
 * @param {String} property 
 */
export function property2path(obj, property) {
	if(typeof property === 'symbol') {
		throw new Error(`property of type "symbol" isn't path'able`);
	}

	let typeofobj = realtypeof(obj);
	switch(typeofobj) {
		case 'Object': return `.${property}`;
		case 'Array': return `[${property}]`;
		default: console.warn(`Not Implemented (type of '${typeofobj}')`); return property;
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
export function add2emitQueue(delay, dataNode, path, oldValue, value, changeType) {
	if(dataNode[ND].listeners && dataNode[ND].listeners.length > 0) {
		let change = {
			'path': path, 'value': value, 'oldValue': oldValue, 'type': changeType
		};
		dataNode[ND].eventPool.push(change);

		if(delay <= 0) {
			emit(dataNode); //emit immediately
		}
		else if(dataNode[ND].eventPool.length === 1) {
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
export function add2emitQueue_bubble(delay, dataNode, property, oldValue, wasOldValueProxy, value, isValueProxy) {
	if(oldValue === value/*no new change was made*/
		|| dataNode[ND].objects.isDeleted/*altered a deleted or detached proxy*/) {
		return;
	}

	let changeType = acceptableEvents[2]; //update
	if(value === undefined) changeType = acceptableEvents[3]; //delete
	else if(oldValue === undefined) changeType = acceptableEvents[1]; //create

	let path;
	if(dataNode[property]) { //changed a property which has its own data node on the tree
		dataNode = dataNode[property];
		path = '';

		if(wasOldValueProxy || isValueProxy) {
			add2emitQueue_capture(delay, dataNode, oldValue, value, changeType);
		}
	} else {
		path = property2path(dataNode[ND].objects.target, property);
	}

	while(true) {
		if(dataNode[NID].status === statuses[1]) { //stop and don't propagate
			return;
		}
		else {
			add2emitQueue(delay, dataNode, path, oldValue, value, changeType);
		}

		if(!dataNode[ND].parentNode.isTreePrototype) { //we are not on root node yet
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
export function add2emitQueue_capture(delay, dataNode, oldValue, value) {
	let keys = Object.keys(dataNode);
	for(let key of keys) {
		let subValue = (typeof value === 'object' && value !== null) ? value[key] : undefined;
		let subOldValue = (typeof oldValue === 'object' && oldValue !== null) ? oldValue[key] : undefined;
		if(subValue !== subOldValue) { //if not both undefined or same primitive or the same object
			//TODO - both will never be the same object because 'oldValue' is the target object while 'value' is the proxy,
			//			but can a concerning scenario even happen?
			let changeType = acceptableEvents[2]; //update
			if(subValue === undefined) changeType = acceptableEvents[3]; //delete
			else if(subOldValue === undefined) changeType = acceptableEvents[1]; //create
			add2emitQueue(delay, dataNode[key], '', subOldValue, subValue, changeType);
			add2emitQueue_capture(delay, dataNode[key], subOldValue, subValue);
		}
	}
}

export function emit(dataNode) {
	//save a reference to the event-pool because we are about to immediately empty it, so all future changes, even those
	//that can occur now because of the listeners, will go to a new event-pool and will be emitted next round (after delay).
	//NOTICE - an event listener for one path can still manipulate event-pools of other path's that are next on this cycle
	let listeners = dataNode[ND].listeners;
	let eventPool = dataNode[ND].eventPool;
	dataNode[ND].eventPool = [];

	if(!listeners || !eventPool) {
		//rare case where an event triggers a listener that removed-all-listeners and also causes a new event
		//before all emits of this loop have finished
		return;
	}

	//FIFO - first event in, first event out. listeners will be called by their turn according to which event fires first
	for(let change of eventPool) {
		for(let i = listeners.length-1; i >= 0; i--) {
			let listener = listeners[i]; //listener = [event, function, id, once]

			if(listener[0] === change.type) { //will invoke only create/update/delete listeners
				if(listener[3] === true) { //first delete the one-time listener, so the upcoming listener's-function won't meddle with it
					listeners.splice(i, 1);
				}

				listener[1].call(dataNode[ND].objects.proxy, change);
			}
		}
	}

	//iterate over all 'change' listeners and emit with an (ordered) array of all events
	for(let i = listeners.length-1; i >= 0; i--) {
		let listener = listeners[i]; //listener = [event, function, id, once]

		if(listener[0] === acceptableEvents[0]) { // 'change'
			if(listener[3] === true) { //first delete the one-time listener, so the upcoming listener's-function won't meddle with it
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
export function unproxify(value) {
	let typeofvalue = realtypeof(value);
	if(acceptableTypes.includes(typeofvalue)) {
		let target = value;
		try {
			target = value.$getOriginalTarget();
		} catch(error) {}

		switch(typeofvalue) {
			case 'Object':
				let keys = Object.keys(target);
				for(let key of keys) {
					target[key] = unproxify(target[key]); //maybe alters target and maybe returning the exact same object
				}
				break;
			case 'Array':
				for(let i=0; i < target.length; i++) {
					target[i] = unproxify(target[i]); //maybe alters target and maybe returning the exact same object
				}
				break;
			default:
				console.warn(`Not Implemented (type of '${typeofobj}')`);
		}

		return target;
	}
	else {
		return value; //primitive
	}
}

export function createDataNode(parentNode, property) {
	let propertyPath;
	if(parentNode[ND] && parentNode[ND].objects && parentNode[ND].objects.target) {
		propertyPath = property2path(parentNode[ND].objects.target, property);
	} else {
		propertyPath = property2path({}, property); //if parent doesn't have target then treat it as object
	}
	
	let node = parentNode[property];
	if(!node) {
		node = {
			[NID]: Object.create(parentNode[NID]),
			[ND]: {
				'parentNode': parentNode
			}
		};
		parentNode[property] = node;
	}

	delete node[NID].status; //clear old status in case if node previously existed
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
