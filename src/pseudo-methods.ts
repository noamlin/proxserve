/**
 * 2022 Noam Lin <noamlin@gmail.com>
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

import { EVENTS, NODE_STATUSES, ND, NID } from './globals';
import { ListenerData, EVENT_NAMES } from './types/globals';
import {
	StopFunction, BlockFunction, ActivateFunction,
	OnFunction, OnceFunction,
	RemoveListenerFunction, RemoveAllListenersFunction,
	GetProxserveNameFunction, WhoAMI,
	GetOriginalTargetFunction, GetProxserveNodesFunction,
} from './types/pseudo-methods';
import { createNodes } from './supporting-functions';
import { splitPath } from './general-functions';

export const stop: StopFunction = function stop(this) {
	this.dataNode[NID].status = NODE_STATUSES.stopped;
};

export const block: BlockFunction = function block(this) {
	this.dataNode[NID].status = NODE_STATUSES.blocked;
};

export const activate: ActivateFunction = function activate(this, force = false): void {
	if(force || this.dataNode === this.metadata.dataTree) { // force activation or we are on root proxy
		this.dataNode[NID].status = NODE_STATUSES.active;
	}
	else {
		delete this.dataNode[NID].status;
	}
};

export const on: OnFunction = function on(this, args) {
	const {
		path = '',
		listener,
		id,
		deep = false,
		once = false,
	} = args;
	// its nicer to expose `event` to the user,
	// but since it is semi-reserved word, we internally rename it to `events`
	let { event: events } = args;

	if(events === 'change') {
		events = Object.keys(EVENTS) as EVENT_NAMES[]; // will listen to all events
	} else if(!Array.isArray(events)) {
		events = [events];
	}

	for(let event of events) {
		if(!EVENTS[event]) {
			const names = Object.keys(EVENTS);
			throw new Error(`${event} is not a valid event. valid events are ${names.join(',')}`);
		}
	}
	
	let dataNode = this.dataNode;
	let segments = splitPath(path);
	for(let property of segments) { // traverse down the tree
		if(!dataNode[property]) {
			// create data-nodes if needed (in dataNode[property]), but don't create/overwrite proxy-nodes
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
		once,
		func: listener
	} as ListenerData;

	if(id !== undefined) {
		listenerObj.id = id;
	}
	listenersPool.push(listenerObj);
};

export const once: OnceFunction = function once(this, args) {
	args.once = true;
	on.call(this, args);
};

function removeById(listenersArr: ListenerData[], id: string | number | Function): void {
	for(let i = listenersArr.length - 1; i >= 0; i--) {
		let listenerObj = listenersArr[i];
		if((id !== undefined && listenerObj.id === id) || listenerObj.func === id) {
			listenersArr.splice(i, 1);
		}
	}
}

export const removeListener: RemoveListenerFunction = function removeListener(this, args) {
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
};

export const removeAllListeners: RemoveAllListenersFunction = function removeAllListeners(this, path = '') {
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
};

export const getOriginalTarget: GetOriginalTargetFunction = function getOriginalTarget(this) {
	return this.proxyNode[ND].target;
};

export const getProxserveName: GetProxserveNameFunction = function getProxserveName(this) {
	return this.dataNode[NID].name;
};

export const whoami: WhoAMI = function whoami(this) {
	return this.dataNode[NID].name + this.dataNode[ND].path;
};

export const getProxserveNodes: GetProxserveNodesFunction = function getProxserveNodes(this) {
	return { dataNode: this.dataNode, proxyNode: this.proxyNode };
};