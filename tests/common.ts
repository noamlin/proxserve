/**
 * 2023 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Common assets for unit tests.
 */

import util from 'util';
import { ND, NID } from '../src/globals';
import type { ProxyNode } from '../src/types/proxserve-class';

export { cloneDeep } from 'lodash';
export const isProxy = util.types.isProxy;

// test if proxy's internal [[handler]] is revoked. according to https://www.ecma-international.org/ecma-262/#sec-proxycreate
// not working as of Jan 2021
/*function isRevoked(value) {
	try {
		new Proxy(value, value); //instantiating with revoked-proxy throws an error
		return false;
	} catch(err) {
		return Object(value) === value; //check if value was an object at all. only revoked proxy will reach here and return true
	}
}*/
/**
 * 
 * @param {Object} proxyNode - the objects related to proxy
 */
export const isRevoked = function isRevoked(proxyNode: ProxyNode): boolean {
	if(!util.types.isProxy(proxyNode[ND].proxy)) {
		return false; // not even a proxy so can't be revoked
	}

	if(proxyNode[NID].status === 'revoked') {
		try {
			proxyNode[ND].proxy!.getSomeProperty; //get on revoked proxy should throw
		} catch(err) {
			return true;
		}
	}

	return false;
}

var consoleFuncs = { log: console.log, warn: console.warn, error: console.error };
export const silentConsole = function silentConsole() {
	console.log = console.warn = console.error = function() { };
}
export const wakeConsole = function wakeConsole() {
	console.log = consoleFuncs.log;
	console.warn = consoleFuncs.warn;
	console.error = consoleFuncs.error;
}

export const testObject = {
	level1_1: {
		arr1: [0,1,2]
	},
	level1_2: {
		level2_1: {
			level3_1: {
				arr2: [
					0,
					1,
					[
						6,
						7,
						[
							14,
							{ deep: { deeper: 'abc' } },
							16
						],
						9
					],
					3,
					4
				]
			}
		}
	}
};

export const deepCountObjects = function deepCountObjects(obj) {
	let numChildObjects = 0;

	if(Array.isArray(obj)) {
		numChildObjects++;
		for(let i = 0; i < obj.length; i++) {
			if(typeof obj[i] === 'object') {
				numChildObjects += deepCountObjects(obj[i]);
			}
		}
	}
	else if(typeof obj === 'object') {
		numChildObjects++;
		let keys = Object.keys(obj);
		for(let key of keys) {
			if(typeof obj[key] === 'object') {
				numChildObjects += deepCountObjects(obj[key]);
			}
		}
	}

	return numChildObjects;
}
