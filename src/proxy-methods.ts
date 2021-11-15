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

import { nodeStatuses, eventNamesObject, ND, NID } from './globals';
import { DataNode, ProxyNode } from './types';
import { initFunctionEmitEvent } from './event-emitter';

/**
 * a wrapper function for the 'splice' method
 * 
 * @remarks
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} proxyNode
 * 
 * @param start 
 * @param deleteCount 
 * @param items - rest of arguments
 */
export function splice(
	dataNode: DataNode,
	proxyNode: ProxyNode,
	start: number,
	deleteCount: number,
	...items: any[]
): any[] {
	if(dataNode[NID].status !== nodeStatuses.ACTIVE) {
		return Array.prototype.splice.call(proxyNode[ND].proxy, start, deleteCount, ...items);
	}

	let isActiveByInheritance = !dataNode[NID].hasOwnProperty('status');
	dataNode[NID].status = nodeStatuses.SPLICING;
	let oldValue = proxyNode[ND].target.slice(0);
	let deleted = Array.prototype.splice.call(proxyNode[ND].proxy, start, deleteCount, ...items); // creates many side-effect events
	let args = { start, deleteCount, items };
	
	if(isActiveByInheritance) {
		delete dataNode[NID].status;
	} else {
		dataNode[NID].status = nodeStatuses.ACTIVE;
	}

	initFunctionEmitEvent(dataNode, eventNamesObject.splice, args, oldValue, proxyNode[ND].target);

	return deleted;
}

/**
 * a wrapper function for the 'shift' method
 * 
 * @remarks
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} proxyNode
 */
export function shift(dataNode: DataNode, proxyNode: ProxyNode): any {
	if(dataNode[NID].status !== nodeStatuses.ACTIVE) {
		// if not active then run regular `shift`
		// which will reach the `set` of the ProxyHandler and will be blocked or events stopped, etc.
		return Array.prototype.shift.call(proxyNode[ND].proxy);
	}

	let isActiveByInheritance = !dataNode[NID].hasOwnProperty('status');
	dataNode[NID].status = nodeStatuses.SPLICING;
	let oldValue = proxyNode[ND].target.slice(0);
	let deleted = Array.prototype.shift.call(proxyNode[ND].proxy); // creates many side-effect events
	
	if(isActiveByInheritance) {
		delete dataNode[NID].status;
	} else {
		dataNode[NID].status = nodeStatuses.ACTIVE;
	}

	initFunctionEmitEvent(dataNode, eventNamesObject.shift, {}, oldValue, proxyNode[ND].target);

	return deleted;
}

/**
 * a wrapper function for the 'unshift' method
 * 
 * @remarks
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} proxyNode
 * 
 * @param items 
 */
export function unshift(dataNode: DataNode, proxyNode: ProxyNode, ...items: any[]): number {
	if(dataNode[NID].status !== nodeStatuses.ACTIVE) {
		return Array.prototype.shift.call(proxyNode[ND].proxy) as number;
	}

	let isActiveByInheritance = !dataNode[NID].hasOwnProperty('status');
	dataNode[NID].status = nodeStatuses.SPLICING;
	let oldValue = proxyNode[ND].target.slice(0);
	let newLength: number = Array.prototype.unshift.call(proxyNode[ND].proxy, ...items); // creates many side-effect events
	let args = { items };
	
	if(isActiveByInheritance) {
		delete dataNode[NID].status;
	} else {
		dataNode[NID].status = nodeStatuses.ACTIVE;
	}

	initFunctionEmitEvent(dataNode, eventNamesObject.unshift, args, oldValue, proxyNode[ND].target);

	return newLength;
}
