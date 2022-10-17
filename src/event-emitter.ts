/**
 * 2022 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
"use strict"

import { EVENTS, NODE_STATUSES, PROXY_STATUSES, ND, NID } from './globals';
import type { EVENT_NAMES, ChangeEvent, DeferredEvent, ListenerData } from './types/globals';
import type { DataNode, ProxserveInstanceMetadata } from './types/proxserve-class';
import { property2path, stackTraceLog } from './supporting-functions';
import { splitPath } from './general-functions';

/**
 * try to get the proxy-object from a data-node. if can't then from it's parent's proxy
 * @param dataNode 
 * @param property - the property as the dataNode is assigned on its parent
 */
function getProxyValue(dataNode: DataNode, property?: string): any {
	if(dataNode[ND].proxyNode && dataNode[ND].proxyNode[NID].status === PROXY_STATUSES.alive) {
		return dataNode[ND].proxyNode[ND].proxy; // actual proxy of child node
	}
	else {
		if(!property) {
			// my property on the parent
			property = splitPath(dataNode[ND].propertyPath)[0] as string;
		}

		let parentNode = dataNode[ND].parentNode;

		if(parentNode[ND].proxyNode && parentNode[ND].proxyNode[NID].status === PROXY_STATUSES.alive) {
			return parentNode[ND].proxyNode[ND].proxy?.[property]; // proxy or primitive via parent's proxy object
		}
		else {
			// if we reached here then probably we are on a capture phase of a deep deletion.
			// for example 'obj.sub1.sub2' gets 'delete obj.sub1' so now there are no values for 'sub2' nor its parent 'sub1'.
			// the warning is turned off because this situation seems okay
			// console.warn(`reached a capture level where neither child not parent proxy-nodes exist`);
		}
	}

	return undefined;
}

/**
 * process event and then bubble up and capture down the data tree
 */
export function initEmitEvent(
	dataNode: DataNode,
	property: string,
	oldValue: any,
	wasOldValueProxy: boolean,
	value: any,
	isValueProxy: boolean,
	trace?: ProxserveInstanceMetadata['trace'],
) {
	if(oldValue === value // no new change was made
	|| !dataNode[ND].proxyNode) { // proxy-node is detached from data-node
		return;
	}

	let proxyNode = dataNode[ND].proxyNode;
	if(proxyNode[NID].status !== PROXY_STATUSES.alive) { // altered a deleted proxy
		return;
	}

	let changeType = EVENTS.update;
	if(value === undefined) {
		changeType = EVENTS.delete;
	} else if(oldValue === undefined) {
		changeType = EVENTS.create;
	}

	let deferredEvents: DeferredEvent[] | undefined;
	// altering properties of an array that's in the middle of a splicing phase
	if(dataNode[NID].status === NODE_STATUSES.splicing) {
		// initiate (if needed) an object to hold side effect events
		if(!dataNode[ND].deferredEvents) {
			dataNode[ND].deferredEvents = [];
		}
		// save a reference to the deferredEvents
		deferredEvents = dataNode[ND].deferredEvents;
	}

	let path: string;
	if(dataNode[property]) { // changed a property which has its own data node on the tree
		dataNode = dataNode[property];
		path = '';
	} else {
		path = property2path(proxyNode[ND].target, property);
	}

	let change: ChangeEvent = {
		path, value, oldValue, type: changeType,
	};

	if(!deferredEvents) {
		// (try to) log before emitting the event
		stackTraceLog(dataNode, change, trace);

		bubbleEmit(dataNode, change, property);
	
		if(wasOldValueProxy || isValueProxy) { // old value or new value are proxy meaning they are objects with children
			captureEmit(dataNode, change);
		}
	}
	else {
		deferredEvents.push({dataNode, change, shouldCapture: wasOldValueProxy || isValueProxy});
	}
}

/**
 * bubbling phase - go up the data tree and emit
 * @param dataNode
 * @param change
 * @param property - property name of the data-node (i.e. as the data-node is assigned to its parent)
 */
function bubbleEmit(dataNode: DataNode, change: ChangeEvent, property?: string): void {
	if(dataNode[NID].status === NODE_STATUSES.stopped) {
		return; // not allowed to emit
	}

	let thisValue = getProxyValue(dataNode, property);

	if(change.path === '') { // iterate over 'shallow' listeners
		iterateAndEmit(dataNode[ND].listeners.shallow, thisValue, change);
	}

	// iterate over 'deep' listeners
	iterateAndEmit(dataNode[ND].listeners.deep, thisValue, change);

	if(!dataNode[ND].parentNode[ND].isTreePrototype) { // we are not on root node yet
		// create a shallow copy of 'change' and update its path
		// (we don't want to alter the 'change' object that was just emitted to a listener)
		let nextChange: ChangeEvent = {
			...change,
			path: dataNode[ND].propertyPath + change.path
		};

		bubbleEmit(dataNode[ND].parentNode, nextChange);
	}
}

/**
 * capturing phase - go down the data tree and emit
 * @param dataNode
 * @param change
 */
function captureEmit(dataNode: DataNode, change: ChangeEvent): void {
	let keys = Object.keys(dataNode);
	for(let key of keys) {
		let subValue = (typeof change.value === 'object' && change.value !== null) ? change.value[key] : undefined;
		let subOldValue = (typeof change.oldValue === 'object' && change.oldValue !== null) ? change.oldValue[key] : undefined;
		if(subValue !== subOldValue) { //if not both undefined or same primitive or the same object
			let changeType = EVENTS.update;
			if(subValue === undefined) {
				changeType = EVENTS.delete;
			} else if(subOldValue === undefined) {
				changeType = EVENTS.create;
			}

			let subChange: ChangeEvent = {
				path: '',
				oldValue: subOldValue,
				value: subValue,
				type: changeType
			}

			// failing the status check will not emit for current property (but sub-properties might still be forcibly active)
			let childNode = dataNode[key];
			if(childNode[NID].status !== NODE_STATUSES.stopped) {
				let thisValue = getProxyValue(childNode, key);
				iterateAndEmit(childNode[ND].listeners.shallow, thisValue, subChange);
			}

			captureEmit(childNode, subChange);
		}
	}
}

/**
 * iterate over an array of listeners, handle 'once' listeners and emit
 * @param listenersArr 
 * @param thisValue 
 * @param change 
 */
function iterateAndEmit(listenersArr: ListenerData[], thisValue: any, change: ChangeEvent): void {
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

/**
 * process special event for a built-in method and then bubble up the data tree
 * @param dataNode
 * @param funcName - the method's name
 * @param funcArgs - the method's arguments
 * @param oldValue
 * @param value
 */
export function initFunctionEmitEvent(
	dataNode: DataNode,
	funcName: EVENT_NAMES,
	funcArgs: ChangeEvent['args'],
	oldValue: any,
	value: any,
	trace?: ProxserveInstanceMetadata['trace'],
) {
	let change: ChangeEvent = {
		path: '', value, oldValue, type: funcName, args: funcArgs,
	};

	// (try to) log before emitting the event
	stackTraceLog(dataNode, change, trace);

	bubbleEmit(dataNode, change);

	if(dataNode[ND].deferredEvents) {
		// manually handle the side-effect events that were caught
		// in order to not bubble up, but should capture down
		for(let event of dataNode[ND].deferredEvents!) {
			if(event.change.path === '') {
				// no path means its an event directly on the property, not on the parent.
				// i.e: not an event with path "0" on ".arr", but an event with no path on ".arr[0]".
				// function event on "arr" already ran, but now a regular event on "arr[0]" is due
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