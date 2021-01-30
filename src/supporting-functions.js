/**
 * Copyright 2021 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
"use strict"

import { proxyTypes, ND, NID } from './global-vars.js';
import { realtypeof } from './general-functions.js';

/**
 * Convert property name to valid path segment
 * @param {*} obj 
 * @param {String} property 
 */
export function property2path(obj, property) {
	if(typeof property === 'symbol') {
		throw new Error(`property of type "symbol" isn't path'able`);
	}

	let typeofobj = realtypeof(obj);
	switch(typeofobj) {
		case 'Object': return `.${property}`;
		case 'Array': return `[${property}]`;
		default: console.warn(`Not Implemented (type of '${typeofobj}')`); return property;
	}
}

/**
 * recursively switch between all proxies to their original targets.
 * note: original targets should never hold proxies under them,
 * thus altering the object references (getting from 'value') should be ok.
 * if the programmer decided to
 * 	1. create a proxy with children (sub-proxies)
 * 	2. create a regular object
 * 	3. adding sub-proxies to the regular object
 * 	4. attaching the regular object to the proxy
 * then this regular object will be altered.
 * @param {*} value
 */
export function unproxify(value) {
	let typeofvalue = realtypeof(value);
	if(proxyTypes.includes(typeofvalue)) {
		let target = value;
		try {
			target = value.$getOriginalTarget();
		} catch(error) {}

		switch(typeofvalue) {
			case 'Object':
				let keys = Object.keys(target);
				for(let key of keys) {
					target[key] = unproxify(target[key]); //maybe alters target and maybe returning the exact same object
				}
				break;
			case 'Array':
				for(let i=0; i < target.length; i++) {
					target[i] = unproxify(target[i]); //maybe alters target and maybe returning the exact same object
				}
				break;
			default:
				console.warn(`Not Implemented (type of '${typeofobj}')`);
		}

		return target;
	}
	else {
		return value; //primitive
	}
}

/**
 * create a node in a tree that mimics the proxserve's object and holds meta-data
 * @param {Object} parentNode 
 * @param {String|Number} property 
 */
export function createDataNode(parentNode, property) {
	let propertyPath;
	if(parentNode[ND] && parentNode[ND].objects && parentNode[ND].objects.target) {
		propertyPath = property2path(parentNode[ND].objects.target, property);
	} else {
		propertyPath = property2path({}, property); //if parent doesn't have target then treat it as object
	}
	
	let node = parentNode[property];
	if(!node) {
		node = {
			[NID]: Object.create(parentNode[NID]),
			[ND]: {
				'parentNode': parentNode,
				'listeners': {
					'shallow': [],
					'deep': []
				}
			}
		};
		parentNode[property] = node;
	}

	delete node[NID].status; //clears old status in case a node previously existed
	//updates path (for rare case where parent was array and then changed to object or vice versa)
	//and also makes a new and clean 'objects' property
	Object.assign(node[ND], {
		'path': parentNode[ND].path + propertyPath,
		'propertyPath': propertyPath,
		'objects': Object.assign(Object.create(parentNode[ND].objects), {
			'target': undefined,
			'proxy': undefined,
			'revoke': undefined
			/* inherits status */
		})
	});

	return node;
}
