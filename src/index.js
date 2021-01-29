/**
 * Copyright 2021 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
"use strict"

import { proxyTypes, proxyStatuses } from './global-vars.js';
import { unproxify, createDataNode } from './supporting-functions.js';
import * as pseudoMethods from './pseudo-methods.js';
import * as proxyMethods from './proxy-methods.js';
import { realtypeof, splitPath, evalPath } from './general-functions.js';
import { initEmitEvent } from './event-emitter.js';

let ND = Symbol.for('proxserve_node_data'); //key for the data of a node
let NID = Symbol.for('proxserve_node_inherited_data'); //key for the inherited data of a node

/**
 * save an array of all reserved function names
 * and also add synonyms to these functions
 */
let pseudoMethodsNames = Object.keys(pseudoMethods);
for(let i = pseudoMethodsNames.length - 1; i >= 0; i--) {
	let name = pseudoMethodsNames[i];
	let synonym = '$'+name;
	pseudoMethods[synonym] = pseudoMethods[name];
	pseudoMethodsNames.push(synonym);
}

class Proxserve {
	/**
	 * construct a new proxserve instance
	 * @param {Object|Array} target 
	 * @param {Object} [options]
	 * 	@property {Boolean} [options.strict] - should destroy detached child-objects or deleted properties automatically
	 * 	@property {Boolean} [options.emitMethods] - should splice/shift/unshift emit one event or all CRUD events
	 */
	constructor(target, { strict=true, emitMethods=true, debug={} } = {}) {
		this.strict = strict;
		this.emitMethods = emitMethods;
		this.destroyDelay = 1000;

		if(debug && debug.destroyDelay) this.destroyDelay = debug.destroyDelay;

		this.dataTree = createDataNode({
			[NID]: { 'status': proxyStatuses.ACTIVE },
			[ND]: { 'objects': { 'isDeleted': false } },
			'isTreePrototype': true
		}, '');
		this.dataTree[ND].path = '';
		this.dataTree[ND].propertyPath = '';
		this.dataTree[ND].objects.target = target;

		return this.createProxy(this.dataTree);
	}

	/**
	 * create a new proxy and a new node for a property of the parent's target-object
	 * @param {Object} parentNode
	 * @param {String} [targetProperty]
	 */
	createProxy(parentNode, targetProperty) {
		let dataNode;

		if(targetProperty === undefined) { //refering to own node and not a child property (meaning root object)
			dataNode = parentNode;
		}
		else {
			dataNode = createDataNode(parentNode, targetProperty); //either creates new or returns an existing one with cleaned properties
			dataNode[ND].objects.target = parentNode[ND].objects.target[ targetProperty ]; //assign said 'target' to the dataNode
		}

		let objects = dataNode[ND].objects; //a new one for every iteration
		let target = objects.target;

		let typeoftarget = realtypeof(target);

		if(proxyTypes.includes(typeoftarget)) {
			let revocable = Proxy.revocable(target, {
				get: (target/*same as parent scope 'target'*/, property, proxy) => {
					if(this.emitMethods && proxyMethods.hasOwnProperty(property) && property in Object.getPrototypeOf(target)) {
						//use a proxy method instead of the built-in method that is on the prototype chain
						return proxyMethods[property].bind(this, dataNode, objects);
					}
					else if(pseudoMethodsNames.includes(property) && typeof target[property] === 'undefined') {
						//can access a pseudo function (or its synonym) if their keywords isn't used
						return pseudoMethods[property].bind(this, dataNode, objects);
					}
					else if(!target.propertyIsEnumerable(property) || typeof property === 'symbol') {
						return target[property]; //non-enumerable or non-path'able aren't proxied
					}
					else if(dataNode[property] //there's a child node
							&& dataNode[property][ND].objects.proxy //it holds a proxy
							&& Object.getPrototypeOf(dataNode[property][ND].objects) === objects) { //is child of this proxy, and not a ghost object left there after deletion
						return dataNode[property][ND].objects.proxy;
					} else {
						return target[property];
					}
				},
			
				set: (target/*same as parent scope 'target'*/, property, value, proxy) => { //'receiver' is proxy
					/**
					 * property can be a regular object because of 3 possible reasons:
					 * 1. proxy is deleted from tree but user keeps accessing it then it means he saved a reference
					 * 2. it is a non-enumerable property which means it was intentionally hidden
					 * 3. property is a symbol and symbols can't be proxied because we can't create a normal path for them.
					 *    these properties are not proxied and should not emit change-event.
					 *    except for: length
					 * TODO - make a list of all possible properties exceptions (maybe function 'name'?)
					 */
					if(dataNode[NID].status === proxyStatuses.BLOCKED) { //blocked from changing values
						console.error(`can't change value of property '${property}'. object is blocked.`);
						return true;
					}
					else if(typeof property === 'symbol') {
						target[property] = value;
						return true;
					}
					else if(property !== 'length' && !target.propertyIsEnumerable(property)) {
						//if setting a whole new property then it is non-enumerable (yet) so a further test is needed
						let descriptor = Object.getOwnPropertyDescriptor(target, property);
						if(typeof descriptor === 'object' && descriptor.enumerable === false) { //property was previously set
							target[property] = value;
							return true;
						}
					}

					let oldValue = target[property]; //should not be proxy
					let isOldValueProxy = false;
					if(dataNode[property] !== undefined && dataNode[property][ND].objects.proxy !== undefined) {
						//about to overwrite an existing property which is a proxy (about to detach a proxy)
						dataNode[property][ND].objects.isDeleted = true;
						isOldValueProxy = true;
						if(this.strict) {
							//postpone this cpu intense function for later, probably when proxserve is not in use
							setTimeout(Proxserve.destroy, this.destroyDelay, dataNode[property][ND].objects.proxy); 
						}
					}

					value = unproxify(value);
					target[property] = value; //assign new value

					let isValueProxy = false;
					let typeofvalue = realtypeof(value);
					if(proxyTypes.includes(typeofvalue)) {
						this.createProxy(dataNode, property); //if trying to add a new value which is an object then make it a proxy
						isValueProxy = true;
					}

					initEmitEvent(dataNode, property, oldValue, isOldValueProxy, value, isValueProxy);

					return true;
				},

				/**
				 * TODO - this function is incomplete and doesn't handle all of 'descriptor' scenarios
				 */
				defineProperty: (target/*same as parent scope 'target'*/, property, descriptor) => {
					if(typeof property === 'symbol') {
						Object.defineProperty(target, property, descriptor);
						return true;
					}

					let oldValue = target[property]; //should not be proxy
					let isOldValueProxy = false;
					if(dataNode[property] !== undefined && dataNode[property][ND].objects.proxy !== undefined) {
						//about to overwrite an existing property which is a proxy (about to detach a proxy)
						dataNode[property][ND].objects.isDeleted = true;
						isOldValueProxy = true;
						if(this.strict) {
							//postpone this cpu intense function for later, probably when proxserve is not is use
							setTimeout(Proxserve.destroy, this.destroyDelay, dataNode[property][ND].objects.proxy);
						}
					}

					descriptor.value = unproxify(descriptor.value);
					Object.defineProperty(target, property, descriptor); //defining the new value
					let value = descriptor.value;
					let isValueProxy = false;
					//excluding non-enumerable properties from being proxied
					let typeofvalue = realtypeof(descriptor.value);
					if(proxyTypes.includes(typeofvalue) && descriptor.enumerable === true) {
						this.createProxy(dataNode, property); //if trying to add a new value which is an object then make it a proxy
						isValueProxy = true;
					}

					initEmitEvent(dataNode, property, oldValue, isOldValueProxy, value, isValueProxy);

					return true;
				},

				deleteProperty: (target/*same as parent scope 'target'*/, property) => {
					if(!target.propertyIsEnumerable(property) || typeof property === 'symbol') {
						//non-proxied properties simply get deleted and nothing more
						delete target[property];
						return true;
					}

					if(dataNode[NID].status === proxyStatuses.BLOCKED) { //blocked from changing values
						console.error(`can't delete property '${property}'. object is blocked.`);
						return true;
					}

					if(property in target) {
						let oldValue = target[property]; //should not be proxy
						let isOldValueProxy = false;
						if(dataNode[property] !== undefined && dataNode[property][ND].objects.proxy !== undefined) {
							//about to overwrite an existing property which is a proxy (about to detach a proxy)
							dataNode[property][ND].objects.isDeleted = true;
							isOldValueProxy = true;
							if(this.strict) {
								//postpone this cpu intense function for later, probably when proxserve is not is use
								setTimeout(Proxserve.destroy, this.destroyDelay, dataNode[property][ND].objects.proxy);
							}
						}

						delete target[property]; //actual delete

						initEmitEvent(dataNode, property, oldValue, isOldValueProxy, undefined, false);

						return true;
					}
					else {
						return true; //do nothing because there's nothing to delete
					}
				}
			});

			dataNode[ND].objects.proxy = revocable.proxy;
			dataNode[ND].objects.revoke = revocable.revoke;

			if(typeoftarget === 'Object') {
				let keys = Object.keys(target);
				for(let key of keys) {
					let typeofproperty = realtypeof(target[key]);
					if(proxyTypes.includes(typeofproperty)) {
						this.createProxy(dataNode, key); //recursively make child objects also proxies
					}
				}
			}
			else if(typeoftarget === 'Array') {
				for(let i = 0; i < target.length; i++) {
					let typeofproperty = realtypeof(target[i]);
					if(proxyTypes.includes(typeofproperty)) {
						this.createProxy(dataNode, i); //recursively make child objects also proxies
					}
				}
			}
			else {
				console.warn('Not Implemented');
			}

			return revocable.proxy;
		}
		else {
			throw new Error('Must observe an '+proxyTypes.join('/'));
		}
	}

	/**
	 * Recursively revoke proxies, allowing them to be garbage collected.
	 * this functions delays 1000 milliseconds to let time for all events to finish
	 * @param {*} proxy 
	 */
	static destroy(proxy) {
		let objects;
		try {
			objects = proxy.$getProxserveObjects();
		} catch(error) {
			return; //proxy variable isn't a proxy
		}

		if(!objects.isDeleted) {
			objects.isDeleted = true;
		}

		let typeofproxy = realtypeof(proxy);

		if(proxyTypes.includes(typeofproxy)) {
			if(typeofproxy === 'Object') {
				let keys = Object.keys(proxy);
				for(let key of keys) {
					try {
						let typeofproperty = realtypeof(proxy[key]);
						if(proxyTypes.includes(typeofproperty)) {
							Proxserve.destroy(proxy[key]);
						}
					} catch(error) {
						console.error(error); //don't throw and kill the whole process just if this iteration fails
					}
				}
			}
			else if(typeofproxy === 'Array') {
				for(let i = proxy.length - 1; i >= 0; i--) {
					try {
						let typeofproperty = realtypeof(proxy[i]);
						if(proxyTypes.includes(typeofproperty)) {
							Proxserve.destroy(proxy[i]);
						}
					} catch(error) {
						console.error(error); //don't throw and kill the whole process just if this iteration fails
					}
				}
			}
			else {
				console.warn('Not Implemented');
			}

			objects.revoke();
			objects.proxy = undefined;
		}
	}

	static splitPath(path) {
		return splitPath(path);
	}

	static evalPath(obj, path) {
		return evalPath(obj, path);
	}
}

module.exports = exports = Proxserve; //makes ParcelJS expose this globally (for all platforms) after bundling everything