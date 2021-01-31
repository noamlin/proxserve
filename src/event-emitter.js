/**
 * Copyright 2021 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
"use strict"

import { eventNames, nodeStatuses, proxyStatuses, ND, NID } from './global-vars.js';
import { property2path } from './supporting-functions.js';
import { splitPath } from './general-functions.js';

/**
 * try to get the proxy-object from a data-node. if can't then from it's parent's proxy
 * @param {Object} dataNode 
 * @param {String} property - the property as the dataNode is assigned on its parent
 */
function getProxyValue(dataNode, property) {
	if(dataNode[ND].proxyNode && dataNode[ND].proxyNode[NID].status === proxyStatuses.ALIVE) {
		return dataNode[ND].proxyNode[ND].proxy; //actual proxy of child node
	}
	else {
		if(!property) {
			//my property on the parent
			property = splitPath(dataNode[ND].propertyPath)[0];
		}

		let parentNode = dataNode[ND].parentNode;

		if(parentNode[ND].proxyNode && parentNode[ND].proxyNode[NID].status === proxyStatuses.ALIVE) {
			return parentNode[ND].proxyNode[ND].proxy[ property ]; //proxy or primitive via parent's proxy object
		}
		else {
			//if we reached here then probably we are on a capture phase of a deep deletion.
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
export function initEmitEvent(dataNode, property, oldValue, wasOldValueProxy, value, isValueProxy) {
	if(oldValue === value //no new change was made
	|| !dataNode[ND].proxyNode) { //proxy-node is detached from data-node
		return;
	}

	let proxyNode = dataNode[ND].proxyNode;
	if(proxyNode[NID].status !== proxyStatuses.ALIVE) { //altered a deleted proxy
		return;
	}

	let changeType = eventNames.UPDATE;
	if(value === undefined) changeType = eventNames.DELETE;
	else if(oldValue === undefined) changeType = eventNames.CREATE;

	let deferredEvents;
	//altering properties of an array that's in the middle of a splicing phase
	if(dataNode[NID].status === nodeStatuses.SPLICING) {
		//initiate (if needed) an object to hold side effect events
		if(!dataNode[ND].deferredEvents) dataNode[ND].deferredEvents = [];
		//save a reference to the deferredEvents
		deferredEvents = dataNode[ND].deferredEvents;
	}

	let path;
	if(dataNode[property]) { //changed a property which has its own data node on the tree
		dataNode = dataNode[property];
		path = '';
	} else {
		path = property2path(proxyNode[ND].target, property);
	}

	let change = {
		'path': path, 'value': value, 'oldValue': oldValue, 'type': changeType
	};

	if(!deferredEvents) {
		bubbleEmit(dataNode, change, property);
	
		if(wasOldValueProxy || isValueProxy) { //old value or new value are proxy meaning they are objects with children
			captureEmit(dataNode, change);
		}
	}
	else {
		deferredEvents.push({dataNode, change, shouldCapture: wasOldValueProxy || isValueProxy});
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
export function initFunctionEmitEvent(dataNode, funcName, funcArgs, oldValue, value) {
	let change = {
		'path': '', 'value': value, 'oldValue': oldValue, 'type': funcName, 'args': funcArgs
	};

	bubbleEmit(dataNode, change);

	if(dataNode[ND].deferredEvents) {
		for(let event of dataNode[ND].deferredEvents) {
			if(event.change.path === '') {
				//no path means its an event directly on the property, not on the parent.
				//i.e: not an event on "arr" with path "0", but on "arr[0]" with no path.
				//function event on "arr" already ran, but now a regular event on "arr[0]" is due
				let thisValue = getProxyValue(event.dataNode);
				iterateAndEmit(event.dataNode[ND].listeners.shallow, thisValue, event.change);
				iterateAndEmit(event.dataNode[ND].listeners.deep, thisValue, event.change);
			}

			if(event.shouldCapture) {
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
	if(dataNode[NID].status === nodeStatuses.STOPPED) {
		return; //not allowed to emit
	}

	let thisValue = getProxyValue(dataNode, property);

	if(change.path === '') { //iterate over 'shallow' listeners
		iterateAndEmit(dataNode[ND].listeners.shallow, thisValue, change);
	}

	//iterate over 'deep' listeners
	iterateAndEmit(dataNode[ND].listeners.deep, thisValue, change);

	if(!dataNode[ND].parentNode[ND].isTreePrototype) { //we are not on root node yet
		//create a shallow copy of 'change' and update its path
		//(we don't want to alter the 'change' object that was just emitted to a listener)
		let nextChange = {
			...change,
			path: dataNode[ND].propertyPath + change.path
		};

		bubbleEmit(dataNode[ND].parentNode, nextChange);
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
	for(let key of keys) {
		let subValue = (typeof change.value === 'object' && change.value !== null) ? change.value[key] : undefined;
		let subOldValue = (typeof change.oldValue === 'object' && change.oldValue !== null) ? change.oldValue[key] : undefined;
		if(subValue !== subOldValue) { //if not both undefined or same primitive or the same object
			let changeType = eventNames.UPDATE;
			if(subValue === undefined) changeType = eventNames.DELETE;
			else if(subOldValue === undefined) changeType = eventNames.CREATE;

			let subChange = {
				path: '',
				oldValue: subOldValue,
				value: subValue,
				type: changeType
			}

			//failing the status check will not emit for current property (but sub-properties might still be forcibly active)
			let childNode = dataNode[key];
			if(childNode[NID].status !== nodeStatuses.STOPPED) {
				let thisValue = getProxyValue(childNode, key);
				iterateAndEmit(childNode[ND].listeners.shallow, thisValue, subChange);
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
	for(let i = listenersArr.length - 1; i >= 0; i--) {
		let listener = listenersArr[i];
		if(listener.type.includes(change.type)) {
			if(listener.once === true) {
				listenersArr.splice(i, 1);
			}
			listener.func.call(thisValue, change);
		}
	}
}