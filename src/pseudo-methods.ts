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

import { eventNames, nodeStatuses, ND, NID, DataNode, ProxyNode, ListenerData, TargetVariable } from './globals';
import { createNodes } from './supporting-functions';
import { splitPath } from './general-functions';

/**
 * stop object and children from emitting change events
 * automatically filled param {Object} dataNode
 */
export function stop(dataNode: DataNode): void {
	dataNode[NID].status = nodeStatuses.STOPPED;
}

/**
 * block object and children from any changes.
 * user can't set nor delete any property
 * automatically filled param {Object} dataNode
 */
export function block(dataNode: DataNode): void {
	dataNode[NID].status = nodeStatuses.BLOCKED;
}

/**
 * resume default behavior of emitting change events, inherited from parent
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} proxyNode
 * @param {Boolean} [force] - force being active regardless of parent
 */
export function activate(dataNode: DataNode, proxyNode: ProxyNode, force=false): void {
	if(force || dataNode === this.dataTree) { //force activation or we are on root proxy
		dataNode[NID].status = nodeStatuses.ACTIVE;
	}
	else {
		delete dataNode[NID].status;
	}
}

interface OnOptions {
	deep?: boolean;
	id?: number | string;
	once?: boolean;
}
/**
 * add event listener on a proxy or on a descending path
 * 
 * @remarks
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} proxyNode
 * 
 * @param events
 * @param [path] - path selector
 * @param listener
 * @param [options]
 * 	@property [options.deep] - should listen for event emitted by sub-objects or not
 * 	@property [options.id] - identifier for removing this listener later
 * 	@property [options.once] - whether this listener will run only once or always
 */
export function on(
	dataNode: DataNode,
	proxyNode: ProxyNode,
	events: eventNames | eventNames[],
	path: string,
	listener: Function,
	options?: OnOptions,
): void {
	let deep: boolean = options?.deep ?? false;
	let id: number | string | undefined = options?.id ?? undefined;
	let once: boolean = options?.once ?? false;

	if((events as string) === 'change') {
		events = Object.keys(eventNames) as eventNames[]; // will listen to all events
	} else if(!Array.isArray(events)) {
		events = [events];
	}

	for(let event of events) {
		if(!eventNames[event]) {
			const names = Object.keys(eventNames);
			throw new Error(`${event} is not a valid event. valid events are ${names.join(',')}`);
		}
	}

	if(typeof path === 'function') { // if called without path
		if(typeof listener === 'object') { // listener is options
			const optionsFromListener = listener as OnOptions;
			if(typeof optionsFromListener.deep === 'boolean') {
				deep = optionsFromListener.deep;
			}
			if(optionsFromListener.id !== undefined) {
				id = optionsFromListener.id;
			}
			if(typeof optionsFromListener.once === 'boolean') {
				once = optionsFromListener.once;
			}
		}
		listener = path as Function;
		path = '';
	} else if(typeof listener !== 'function') {
		throw new Error(`invalid arguments were given. listener must be a function`);
	}
	
	let segments = splitPath(path);
	for(let property of segments) { // traverse down the tree
		if(!dataNode[property]) {
			// create data-nodes if needed, but don't create/overwrite proxy-nodes
			createNodes(dataNode, property);
		}

		dataNode = dataNode[property];
	}

	let listenersPool = dataNode[ND].listeners.shallow;
	if(deep) {
		listenersPool = dataNode[ND].listeners.deep;
	}

	let listenerObj = {
		type: events,
		once: once,
		func: listener
	} as ListenerData;

	if(id !== undefined) {
		listenerObj.id = id;
	}
	listenersPool.push(listenerObj);
}

/**
 * just like `on` but the listener will run only once
 * @see on() function
 */
export function once(
	dataNode: DataNode,
	proxyNode: ProxyNode,
	events: eventNames | eventNames[],
	path: string,
	listener: Function,
	options?: OnOptions): void {
	if(typeof options !== 'object') {
		options = {};
	}
	options.once = true;
	on.call(this, dataNode, proxyNode, events, path, listener, options);
}

function removeById(listenersArr: ListenerData[], id: string | number | Function): void {
	for(let i = listenersArr.length - 1; i >= 0; i--) {
		let listenerObj = listenersArr[i];
		if((id !== undefined && listenerObj.id === id) || listenerObj.func === id) {
			listenersArr.splice(i, 1);
		}
	}
}

/**
 * removes a listener from a path by an identifier (can have multiple listeners with the same ID)
 * or by the listener function itself
 * 
 * @remarks
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} proxyNode
 * 
 * @param [path] - path selector
 * @param id - the listener(s) identifier or listener-function
 */
export function removeListener(dataNode: DataNode, proxyNode: ProxyNode, path: string, id: string | number | Function): void {
	if(arguments.length === 3) { // if called without path
		id = path as string | number | Function;
		path = '';
	}

	let fullPath = `${dataNode[ND].path}${path}`;
	let segments = splitPath(path);
	// traverse down the tree
	for(let property of segments) {
		if(!dataNode[property]) {
			console.warn(`can't remove listener from a non-existent path '${fullPath}'`);
			return;
		}
		dataNode = dataNode[property];
	}

	removeById(dataNode[ND].listeners.shallow, id);
	removeById(dataNode[ND].listeners.deep, id);
}

/**
 * removing all listeners of a path
 * 
 * @remarks
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} proxyNode
 * 
 * @param [path] - path selector
 */
export function removeAllListeners(dataNode: DataNode, proxyNode: ProxyNode, path = ''): void {
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

	dataNode[ND].listeners.shallow = [] as ListenerData[];
	dataNode[ND].listeners.deep = [] as ListenerData[];
}

/**
 * the following functions (getOriginalTarget, getProxserveNodes) seem silly
 * because they could have been written directly on the handler's get() method but it's here as part of the convention of
 * exposing proxy-"inherited"-methods
 */
/**
 * get original target that is behind the proxy
 * 
 * @remarks
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} proxyNode
 */
export function getOriginalTarget(dataNode: DataNode, proxyNode: ProxyNode): TargetVariable {
	return proxyNode[ND].target;
}

/**
 * get the data-node of a proxy (which holds all meta data)
 * and also get proxy-node of a proxy (which holds all related objects)
 * 
 * @remarks
 * automatically filled param {Object} dataNode
 * automatically filled param {Object} proxyNode
 */
export function getProxserveNodes(dataNode: DataNode, proxyNode: ProxyNode): {
	dataNode: DataNode;
	proxyNode: ProxyNode;
} {
	return { dataNode, proxyNode };
}