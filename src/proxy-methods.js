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
"use strict"

import { nodeStatuses, eventNames, ND, NID } from './global-vars.js';
import { initFunctionEmitEvent } from './event-emitter.js';

/**
 * a wrapper function for the 'splice' method
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} proxyNode
 * @param {Number} start 
 * @param {Number} deleteCount 
 * @param  {...any} items 
 */
export function splice(dataNode, proxyNode, start, deleteCount, ...items) {
	if(dataNode[NID].status !== nodeStatuses.ACTIVE) {
		return Array.prototype.splice.call(proxyNode[ND].proxy, start, deleteCount, ...items);
	}

	let isActiveByInheritance = !dataNode[NID].hasOwnProperty('status');
	dataNode[NID].status = nodeStatuses.SPLICING;
	let oldValue = proxyNode[ND].target.slice(0);
	let deleted = Array.prototype.splice.call(proxyNode[ND].proxy, start, deleteCount, ...items); //creates many side-effect events
	let args = { start, deleteCount, items };
	
	if(isActiveByInheritance) delete dataNode[NID].status;
	else dataNode[NID].status = nodeStatuses.ACTIVE;

	initFunctionEmitEvent(dataNode, eventNames.SPLICE, args, oldValue, proxyNode[ND].target);

	return deleted;
}

/**
 * a wrapper function for the 'shift' method
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} proxyNode
 */
export function shift(dataNode, proxyNode) {
	if(dataNode[NID].status !== nodeStatuses.ACTIVE) {
		return Array.prototype.shift.call(proxyNode[ND].proxy);
	}

	let isActiveByInheritance = !dataNode[NID].hasOwnProperty('status');
	dataNode[NID].status = nodeStatuses.SPLICING;
	let oldValue = proxyNode[ND].target.slice(0);
	let deleted = Array.prototype.shift.call(proxyNode[ND].proxy); //creates many side-effect events
	
	if(isActiveByInheritance) delete dataNode[NID].status;
	else dataNode[NID].status = nodeStatuses.ACTIVE;

	initFunctionEmitEvent(dataNode, eventNames.SHIFT, {}, oldValue, proxyNode[ND].target);

	return deleted;
}

/**
 * a wrapper function for the 'unshift' method
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} proxyNode
 * @param  {...any} items 
 */
export function unshift(dataNode, proxyNode, ...items) {
	if(dataNode[NID].status !== nodeStatuses.ACTIVE) {
		return Array.prototype.shift.call(proxyNode[ND].proxy);
	}

	let isActiveByInheritance = !dataNode[NID].hasOwnProperty('status');
	dataNode[NID].status = nodeStatuses.SPLICING;
	let oldValue = proxyNode[ND].target.slice(0);
	let newLength = Array.prototype.unshift.call(proxyNode[ND].proxy, ...items); //creates many side-effect events
	let args = { items };
	
	if(isActiveByInheritance) delete dataNode[NID].status;
	else dataNode[NID].status = nodeStatuses.ACTIVE;

	initFunctionEmitEvent(dataNode, eventNames.UNSHIFT, args, oldValue, proxyNode[ND].target);

	return newLength;
}
