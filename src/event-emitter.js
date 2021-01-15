/**
 * Copyright 2021 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
"use strict"

import { eventNames, proxyStatuses, ND, NID } from './global-vars.js';
import { property2path } from './supporting-functions.js';

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
	if(oldValue === value/*no new change was made*/
	|| dataNode[ND].objects.isDeleted/*altered a deleted or detached proxy*/) {
		return;
	}

	let changeType = eventNames.UPDATE;
	if(value === undefined) changeType = eventNames.DELETE;
	else if(oldValue === undefined) changeType = eventNames.CREATE;

	let path;
	if(dataNode[property]) { //changed a property which has its own data node on the tree
		dataNode = dataNode[property];
		path = '';
	} else {
		path = property2path(dataNode[ND].objects.target, property);
	}

	let change = {
		'path': path, 'value': value, 'oldValue': oldValue, 'type': changeType
	};

	bubbleEmit(dataNode, change);

	if(wasOldValueProxy || isValueProxy) { //old value or new value are proxy meaning they are objects with children
		captureEmit(dataNode, change);
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
 */
function bubbleEmit(dataNode, change) {
	if(dataNode[NID].status === proxyStatuses.STOPPED || dataNode[NID].status === proxyStatuses.SPLICING) {
		return; //not allowed to emit
	}

	if(change.path === '') { //iterate over 'shallow' listeners
		iterateAndEmit(dataNode[ND].listeners.shallow, dataNode[ND].objects.proxy, change);
	}

	//iterate over 'deep' listeners
	iterateAndEmit(dataNode[ND].listeners.deep, dataNode[ND].objects.proxy, change);

	if(!dataNode[ND].parentNode.isTreePrototype) { //we are not on root node yet
		change.path = dataNode[ND].propertyPath + change.path;
		dataNode = dataNode[ND].parentNode;
		bubbleEmit(dataNode, change);
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
			if(dataNode[key][NID].status !== proxyStatuses.STOPPED) {
				iterateAndEmit(dataNode[key][ND].listeners.shallow, dataNode[key][ND].objects.proxy, subChange);
			}

			captureEmit(dataNode[key], subChange);
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