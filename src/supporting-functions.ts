/**
 * Copyright 2021 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
"use strict"

import { proxyTypes, ND, NID } from './globals';
import { DataNode, ProxyNode, TargetVariable, ListenerData } from './types';
import { realtypeof } from './general-functions';

/**
 * Convert property name to valid path segment
 */
export function property2path(obj: any, property: string|number): string {
	if(typeof property === 'symbol') {
		throw new Error(`property of type "symbol" isn't path'able`);
	}

	const typeofobj = realtypeof(obj);
	switch(typeofobj) {
		case 'Object': {
			return `.${property}`;
		}
		case 'Array': {
			return `[${property}]`;
		}
		default: {
			console.warn(`Not Implemented (type of '${typeofobj}')`);
			return property as string;
		}
	}
}

/**
 * recursively switch between all proxies to their original targets.
 * note: original targets should never hold proxies under them,
 * thus altering the object references (getting from 'value') should be ok.
 * if whoever uses this library decides to
 * 	1. create a proxy with children (sub-proxies)
 * 	2. create a regular object
 * 	3. adding sub-proxies to the regular object
 * 	4. attaching the regular object to the proxy
 * then this regular object will be altered.
 */
export function unproxify(value: any): any {
	const typeofvalue = realtypeof(value);

	if(proxyTypes[typeofvalue]) {
		let target = value;
		try {
			target = value.$getOriginalTarget();
		} catch(error) {}

		switch(typeofvalue) {
			case 'Object':
				let keys = Object.keys(target);
				for(let key of keys) {
					target[key] = unproxify(target[key]); // maybe alters target and maybe returning the exact same object
				}
				break;
			case 'Array':
				for(let i=0; i < target.length; i++) {
					target[i] = unproxify(target[i]); // maybe alters target and maybe returning the exact same object
				}
				break;
			default:
				console.warn(`Not Implemented (type of '${typeofvalue}')`);
		}

		return target;
	}
	else {
		return value; // primitive
	}
}

/**
 * create or reset a node in a tree of meta-data (mainly path related)
 * and optionally create a node in a tree of proxy data (mainly objects related)
 */
export function createNodes(
	parentDataNode: DataNode,
	property: string | number,
	parentProxyNode?: ProxyNode,
	target?: TargetVariable,
): { dataNode: DataNode, proxyNode: ProxyNode } {
	//handle property path
	let propertyPath: string;
	if(parentProxyNode?.[ND].target) {
		propertyPath = property2path(parentProxyNode[ND].target, property);
	} else {
		propertyPath = property2path({}, property); // if parent doesn't have target then treat it as object
	}
	
	//handle data node
	let dataNode: DataNode = parentDataNode[property]; // try to receive existing data-node
	if(!dataNode) {
		dataNode = {
			[NID]: Object.create(parentDataNode[NID]),
			[ND]: {
				parentNode: parentDataNode,
				listeners: {
					shallow: [] as ListenerData[],
					deep: [] as ListenerData[],
				},
			}
		} as DataNode;
		parentDataNode[property] = dataNode;
	}

	delete dataNode[NID].status; // clears old status in case a node previously existed
	// updates path (for rare case where parent was array and then changed to object or vice versa)
	if(!parentDataNode[ND].isTreePrototype) {
		Object.assign(dataNode[ND], {
			path: parentDataNode[ND].path + propertyPath,
			propertyPath
		});
	}
	else {
		Object.assign(dataNode[ND], {
			path: '',
			propertyPath: ''
		});
	}

	// handle proxy node
	let proxyNode: ProxyNode;
	if(parentProxyNode) {
		proxyNode = {
			[NID]: Object.create(parentProxyNode[NID]),
			[ND]: {
				target: target as TargetVariable,
				dataNode,
			},
		};

		parentProxyNode[property] = proxyNode;

		// attach nodes to each other
		dataNode[ND].proxyNode = proxyNode;
	} else {
		// hack to satisfy TS.
		// this scenario is dangerous and exists only for `on()` of future variables (paths) that don't yet exist
		proxyNode = undefined as unknown as ProxyNode;
	}

	return { dataNode, proxyNode };
}
