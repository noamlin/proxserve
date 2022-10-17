/**
 * 2022 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
// Proxy methods are methods that will proxy JS built-in methods.
// For examply, the proxy function for "splice" will handle some event stuff and then use
// the actual "splice" function internally
"use strict"

import { NODE_STATUSES, EVENTS, ND, NID } from './globals';
import { SpliceFunction, ShiftFunction, UnshiftFunction } from './types/proxy-methods';
import { initFunctionEmitEvent } from './event-emitter';


export const splice: SpliceFunction = function splice(
	this,
	start,
	deleteCount,
	...items
) {
	if(this.dataNode[NID].status !== NODE_STATUSES.active) {
		// if not active then run regular `splice`
		// which will reach the `set` of the ProxyHandler and will be blocked or events stopped, etc.
		return Array.prototype.splice.call(this.proxyNode[ND].proxy, start, deleteCount, ...items);
	}

	let isActiveByInheritance = !this.dataNode[NID].hasOwnProperty('status');
	this.dataNode[NID].status = NODE_STATUSES.splicing;
	let oldValue = this.proxyNode[ND].target.slice(0);
	let deleted = Array.prototype.splice.call(this.proxyNode[ND].proxy, start, deleteCount, ...items); // creates many side-effect events
	let args = { start, deleteCount, items };
	
	if(isActiveByInheritance) {
		delete this.dataNode[NID].status;
	} else {
		this.dataNode[NID].status = NODE_STATUSES.active;
	}

	initFunctionEmitEvent(this.dataNode, EVENTS.splice, args, oldValue, this.proxyNode[ND].target, this.metadata.trace);

	return deleted;
}

export const shift: ShiftFunction = function shift(this) {
	if(this.dataNode[NID].status !== NODE_STATUSES.active) {
		// if not active then run regular `shift`
		// which will reach the `set` of the ProxyHandler and will be blocked or events stopped, etc.
		return Array.prototype.shift.call(this.proxyNode[ND].proxy);
	}

	let isActiveByInheritance = !this.dataNode[NID].hasOwnProperty('status');
	this.dataNode[NID].status = NODE_STATUSES.splicing;
	let oldValue = this.proxyNode[ND].target.slice(0);
	let deleted = Array.prototype.shift.call(this.proxyNode[ND].proxy); // creates many side-effect events
	
	if(isActiveByInheritance) {
		delete this.dataNode[NID].status;
	} else {
		this.dataNode[NID].status = NODE_STATUSES.active;
	}

	initFunctionEmitEvent(this.dataNode, EVENTS.shift, {}, oldValue, this.proxyNode[ND].target, this.metadata.trace);

	return deleted;
}

export const unshift: UnshiftFunction = function unshift(this, ...items) {
	if(this.dataNode[NID].status !== NODE_STATUSES.active) {
		// if not active then run regular `unshift`
		// which will reach the `set` of the ProxyHandler and will be blocked or events stopped, etc.
		return Array.prototype.unshift.call(this.proxyNode[ND].proxy, ...items);
	}

	let isActiveByInheritance = !this.dataNode[NID].hasOwnProperty('status');
	this.dataNode[NID].status = NODE_STATUSES.splicing;
	let oldValue = this.proxyNode[ND].target.slice(0);
	let newLength: number = Array.prototype.unshift.call(this.proxyNode[ND].proxy, ...items); // creates many side-effect events
	let args = { items };
	
	if(isActiveByInheritance) {
		delete this.dataNode[NID].status;
	} else {
		this.dataNode[NID].status = NODE_STATUSES.active;
	}

	initFunctionEmitEvent(this.dataNode, EVENTS.unshift, args, oldValue, this.proxyNode[ND].target, this.metadata.trace);

	return newLength;
}
