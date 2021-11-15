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

import { eventNamesObject, nodeStatuses, ND, NID } from './globals';
import { ListenerData, StopFunction, BlockFunction, ActivateFunction, OnFunction, OnceFunction,
	RemoveListenerFunction, RemoveAllListenersFunction, GetOriginalTargetFunction, GetProxserveNodesFunction,
	PseudoThis, eventNames } from './types';
import { createNodes } from './supporting-functions';
import { splitPath } from './general-functions';

export const stop = function stop(this: PseudoThis) {
	this.dataNode[NID].status = nodeStatuses.STOPPED;
} as StopFunction;

export const block = function block(this: PseudoThis) {
	this.dataNode[NID].status = nodeStatuses.BLOCKED;
} as BlockFunction;

export const activate = function activate(this: PseudoThis, force = false): void {
	if(force || this.dataNode === this.metadata.dataTree) { // force activation or we are on root proxy
		this.dataNode[NID].status = nodeStatuses.ACTIVE;
	}
	else {
		delete this.dataNode[NID].status;
	}
} as ActivateFunction;

export const on = function on(this: PseudoThis, args) {
	const { path = '', listener, options = {} } = args;
	let { events } = args;

	options.deep = options.deep ?? false;
	options.once = options.once ?? false;

	if((events as string) === 'change') {
		events = Object.keys(eventNamesObject) as eventNames[]; // will listen to all events
	} else if(!Array.isArray(events)) {
		events = [events];
	}

	for(let event of events) {
		if(!eventNamesObject[event]) {
			const names = Object.keys(eventNamesObject);
			throw new Error(`${event} is not a valid event. valid events are ${names.join(',')}`);
		}
	}
	
	let dataNode = this.dataNode;
	let segments = splitPath(path);
	for(let property of segments) { // traverse down the tree
		if(!dataNode[property]) {
			// create data-nodes if needed, but don't create/overwrite proxy-nodes
			createNodes(dataNode, property);
		}

		dataNode = dataNode[property];
	}

	let listenersPool = dataNode[ND].listeners.shallow;
	if(options.deep) {
		listenersPool = dataNode[ND].listeners.deep;
	}

	let listenerObj = {
		type: events,
		once: options.once,
		func: listener
	} as ListenerData;

	if(options.id !== undefined) {
		listenerObj.id = options.id;
	}
	listenersPool.push(listenerObj);
} as OnFunction;

export const once = function once(this: PseudoThis, args) {
	const { events, path, listener, options = {} } = args;
	options.once = true;
	on.call(this, { events, path, listener, options });
} as OnceFunction;

function removeById(listenersArr: ListenerData[], id: string | number | Function): void {
	for(let i = listenersArr.length - 1; i >= 0; i--) {
		let listenerObj = listenersArr[i];
		if((id !== undefined && listenerObj.id === id) || listenerObj.func === id) {
			listenersArr.splice(i, 1);
		}
	}
}

export const removeListener = function removeListener(this: PseudoThis, args) {
	const { id, path = '' } = args;
	const fullPath = `${this.dataNode[ND].path}${path}`;
	let dataNode = this.dataNode;
	const segments = splitPath(path);

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
} as RemoveListenerFunction;

export const removeAllListeners = function removeAllListeners(this: PseudoThis, path = '') {
	const fullPath = `${this.dataNode[ND].path}${path}`;
	const segments = splitPath(path);
	let dataNode = this.dataNode;

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
} as RemoveAllListenersFunction;

export const getOriginalTarget = function getOriginalTarget(this: PseudoThis) {
	return this.proxyNode[ND].target;
} as GetOriginalTargetFunction;

export const getProxserveNodes = function getProxserveNodes(this: PseudoThis) {
	return { dataNode: this.dataNode, proxyNode: this.proxyNode };
} as GetProxserveNodesFunction;