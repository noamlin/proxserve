/**
 * Copyright 2021 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
"use strict"

import { proxyTypes, nodeStatuses, proxyStatuses,
	ND, NID, ProxserveInstance, DataNode, ProxyNode,
	TargetVariable, SomeObject, ProxserveInstanceMetadata } from './globals';
import { unproxify, createNodes } from './supporting-functions';
import * as pseudoMethods from './pseudo-methods';
import * as proxyMethods from './proxy-methods';
import { realtypeof, splitPath, evalPath } from './general-functions';
import { initEmitEvent } from './event-emitter';

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

interface MakeOptions {
	/**
	 * should destroy detached child-objects or deleted properties automatically
	 */
	strict: boolean;
	/**
	 * should splice, shift or unshift emit one event or all internal CRUD events
	 */
	emitMethods: boolean;
	debug?: {
		/**
		 * delay before destroying a detached child-object
		 */
		destroyDelay: number;
	};
}

export class Proxserve {
	/**
	 * make a new proxserve instance
	 */
	static make(target: TargetVariable, options = {} as MakeOptions): ProxserveInstance {
		const {
			strict = true,
			emitMethods = true,
			debug = { destroyDelay: 1000 },
		} = options;

		let dataTreePrototype: DataNode = {
			[NID]: { status: nodeStatuses.ACTIVE },
			[ND]: { isTreePrototype: true } as DataNode[typeof ND],
		};
		let proxyTreePrototype: ProxyNode = {
			[NID]: { status: proxyStatuses.ALIVE },
			[ND]: { isTreePrototype: true } as ProxyNode[typeof ND],
		};

		const newNodes = createNodes(dataTreePrototype, '', proxyTreePrototype, target);

		const metadata = {
			strict,
			emitMethods,
			destroyDelay: debug.destroyDelay,
			dataTree: newNodes.dataNode,
			proxyTree: newNodes.proxyNode,
		} as ProxserveInstanceMetadata;

		return Proxserve.createProxy(metadata, metadata.dataTree);
	}

	/**
	 * create a new proxy and a new node for a property of the parent's target-object
	 */
	static createProxy(metadata: ProxserveInstanceMetadata, parentDataNode: DataNode, targetProperty?: string): ProxserveInstance {
		let parentProxyNode = parentDataNode[ND].proxyNode
		let dataNode: DataNode, proxyNode: ProxyNode;

		if(targetProperty === undefined) { //refering to own node and not a child property (meaning root object)
			dataNode = parentDataNode;
			proxyNode = parentProxyNode;
		}
		else {
			//creates new or reset an existing data-node and then creates a new proxy-node
			const newNodes = createNodes(
				parentDataNode,
				targetProperty,
				parentProxyNode,
				parentProxyNode[ND].target[targetProperty],
			);
			dataNode = newNodes.dataNode;
			proxyNode = newNodes.proxyNode;
		}

		let target = proxyNode[ND].target;

		let typeoftarget = realtypeof(target);

		if(proxyTypes[typeoftarget]) {
			let revocable = Proxy.revocable<TargetVariable>(target, {
				get: (target: TargetVariable/*same as parent scope 'target'*/, property: string|symbol, proxy) => {
					if(metadata.emitMethods && Object.prototype.hasOwnProperty.call(proxyMethods, property) && property in Object.getPrototypeOf(target)) {
						// use a proxy method instead of the built-in method that is on the prototype chain
						return proxyMethods[property].bind(metadata, dataNode, proxyNode);
					}
					else if(pseudoMethodsNames.includes(property as string) && typeof target[property] === 'undefined') {
						// can access a pseudo function (or its synonym) if their keywords isn't used
						return pseudoMethods[property].bind(metadata, dataNode, proxyNode);
					}
					else if(!target.propertyIsEnumerable(property) || typeof property === 'symbol') {
						return target[property]; // non-enumerable or non-path'able aren't proxied
					}
					else if(proxyNode[property] // there's a child node
							&& proxyNode[property][ND].proxy // it holds a proxy
							&& proxyNode[property][NID].status === proxyStatuses.ALIVE) {
						return proxyNode[property][ND].proxy;
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
					if(dataNode[NID].status === nodeStatuses.BLOCKED) { //blocked from changing values
						console.error('object is blocked. can\'t change value of property:', property);
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

					let oldValue = target[property]; // should not be proxy
					let isOldValueProxy = false;
					if(proxyNode[property] !== undefined && proxyNode[property][ND].proxy !== undefined) {
						// about to overwrite an existing property which is a proxy (about to detach a proxy)
						proxyNode[property][NID].status = proxyStatuses.DELETED;
						delete dataNode[property][ND].proxyNode; // detach reference from data-node to proxy-node
						isOldValueProxy = true;
						if(metadata.strict) {
							// postpone this cpu intense function for later, probably when proxserve is not in use
							setTimeout(Proxserve.destroy, metadata.destroyDelay, proxyNode[property][ND].proxy);
						}
					}

					value = unproxify(value);
					target[property] = value; //assign new value

					let isValueProxy = false;
					let typeofvalue = realtypeof(value);
					if(proxyTypes[typeofvalue]) {
						Proxserve.createProxy(metadata, dataNode, property); // if trying to add a new value which is an object then make it a proxy
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
					if(proxyNode[property] !== undefined && proxyNode[property][ND].proxy !== undefined) {
						//about to overwrite an existing property which is a proxy (about to detach a proxy)
						proxyNode[property][NID].status = proxyStatuses.DELETED;
						delete dataNode[property][ND].proxyNode; //detach reference from data-node to proxy-node
						isOldValueProxy = true;
						if(metadata.strict) {
							//postpone this cpu intense function for later, probably when proxserve is not is use
							setTimeout(Proxserve.destroy, metadata.destroyDelay, proxyNode[property][ND].proxy);
						}
					}

					descriptor.value = unproxify(descriptor.value);
					Object.defineProperty(target, property, descriptor); //defining the new value
					let value = descriptor.value;
					let isValueProxy = false;
					//excluding non-enumerable properties from being proxied
					let typeofvalue = realtypeof(descriptor.value);
					if(proxyTypes[typeofvalue] && descriptor.enumerable === true) {
						Proxserve.createProxy(metadata, dataNode, property); //if trying to add a new value which is an object then make it a proxy
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

					if(dataNode[NID].status === nodeStatuses.BLOCKED) { //blocked from changing values
						console.error(`can't delete property '${property}'. object is blocked.`);
						return true;
					}

					if(property in target) {
						let oldValue = target[property]; //should not be proxy
						let isOldValueProxy = false;
						if(proxyNode[property] !== undefined && proxyNode[property][ND].proxy !== undefined) {
							//about to overwrite an existing property which is a proxy (about to detach a proxy)
							proxyNode[property][NID].status = proxyStatuses.DELETED;
							delete dataNode[property][ND].proxyNode; //detach reference from data-node to proxy-node
							isOldValueProxy = true;
							if(metadata.strict) {
								//postpone this cpu intense function for later, probably when proxserve is not is use
								setTimeout(Proxserve.destroy, metadata.destroyDelay, proxyNode[property][ND].proxy);
							}
						}

						delete target[property]; // actual delete

						initEmitEvent(dataNode, property, oldValue, isOldValueProxy, undefined, false);

						return true;
					}
					else {
						return true; //do nothing because there's nothing to delete
					}
				}
			} as ProxyHandler<TargetVariable>) as { proxy: ProxserveInstance, revoke: ()=>void };

			proxyNode[ND].proxy = revocable.proxy;
			proxyNode[ND].revoke = revocable.revoke;

			if(proxyTypes[typeoftarget]) {
				let keys = Object.keys(target); //handles both Objects and Arrays
				for(let key of keys) {
					let typeofproperty = realtypeof(target[key]);
					if(proxyTypes[typeofproperty]) {
						Proxserve.createProxy(metadata, dataNode, key); //recursively make child objects also proxies
					}
				}
			}
			else {
				console.warn(`Type of "${typeoftarget}" is not implemented`);
			}

			return revocable.proxy;
		}
		else {
			const types = Object.keys(proxyTypes);
			throw new Error(`Must observe an ${types.join('/')}`);
		}
	}

	/**
	 * Recursively revoke proxies, allowing them to be garbage collected.
	 * this functions delays 1000 milliseconds to let time for all events to finish
	 */
	static destroy(proxy: ProxserveInstance) {
		let proxyNode;
		try {
			const nodes = proxy.$getProxserveNodes();
			proxyNode = nodes.proxyNode;
		} catch(error) {
			return; // proxy variable isn't a proxy
		}

		if(proxyNode[NID].status === proxyStatuses.ALIVE) {
			proxyNode[NID].status = proxyStatuses.DELETED;
		}

		let typeofproxy = realtypeof(proxy);

		if(proxyTypes[typeofproxy]) {
			let keys = Object.keys(proxy); // handles both Objects and Arrays
			for(let key of keys) {
				try {
					let typeofproperty = realtypeof(proxy[key]);
					if(proxyTypes[typeofproperty]) {
						// going to proxy[key], which is deleted, will return the original target so we will bypass it
						Proxserve.destroy(proxyNode[key][ND].proxy);
					}
				} catch(error) {
					console.error(error); // don't throw and kill the whole process just if this iteration fails
				}
			}

			proxyNode[ND].revoke();
			//proxyNode[ND].proxy = undefined;
			proxyNode[NID].status = proxyStatuses.REVOKED;
		}
		else {
			console.warn(`Type of "${typeofproxy}" is not implemented`);
		}
	}

	static splitPath(path: string): Array<string|number> {
		return splitPath(path);
	}

	static evalPath(obj: SomeObject, path: string): {
		object: SomeObject,
		property: string|number,
		value: any,
	} {
		return evalPath(obj, path);
	}
}