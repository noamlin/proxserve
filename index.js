/**
 * Copyright 2020 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
"use strict"

var Proxserve = (function() {
/**
 * return a string representing the full type of the variable
 * @param {*} variable 
 * @returns {String} - Object, Array, Number, String, Boolean, Null, Undefined, BigInt, Symbol, Date ...
 */
function realtypeof(variable) {
	let rawType = Object.prototype.toString.call(variable); //[object Object], [object Array], [object Number] ...
	return rawType.substring(8, rawType.length-1);
}

let acceptableTypes = ['Object', 'Array', 'Map']; //acceptable types to be proxied
let acceptableEvents = ['change', 'create', 'update', 'delete'];
let statuses = ['active', 'stopped', 'blocked', 'deleted']; //statuses of proxies
let reservedFunctions = {}; //functions reserved as property names

/**
 * recursively clones objects and array
 * @param {Proxy|Object|Array} proxy 
 */
let simpleCloneSet = new WeakSet();
function simpleClone(obj) {
	let typeofobj = realtypeof(obj);
	let cloned;
	if(typeofobj === 'Object') {
		simpleCloneSet.add(obj);
		cloned = {};
		let keys = Object.keys(obj);
		for(let key of keys) {
			if(simpleCloneSet.has(obj[key])) {
				cloned[key] = obj[key];
			}
			else {
				cloned[key] = simpleClone(obj[key]);
			}
		}
	}
	else if(typeofobj === 'Array') {
		simpleCloneSet.add(obj);
		cloned = [];
		for(let i = 0; i < obj.length; i++) {
			if(simpleCloneSet.has(obj[i])) {
				cloned[i] = obj[i];
			}
			else {
				cloned[i] = simpleClone(obj[i]);
			}
		}
	}
	else { //hopefully a primitive
		cloned = obj;
	}

	return cloned;
}

/**
 * stop object and children from emitting change events
 * @param {Object} proxy
 */
reservedFunctions.stop = function(proxy) {
	this.proxy2data.get(proxy).status = statuses[1];
}

/**
 * block object and children from any changes.
 * user can't set nor delete any property
 * @param {Object} proxy
 */
reservedFunctions.block = function(proxy) {
	this.proxy2data.get(proxy).status = statuses[2];
}

/**
 * resume default behavior of emitting change events, inherited from parent
 * @param {Object} proxy
 * @param {Boolean} [force] - force being active regardless of parent
 */
reservedFunctions.activate = function(proxy, force=false) {
	let data = this.proxy2data.get(proxy);
	if(force || data.property==='') { //force activation or we are on root proxy
		data.status = statuses[0];
	}
	else {
		delete data.status;
	}
}

/**
 * add event listener on a proxy
 * @param {Object} proxy
 * @param {String} event 
 * @param {Function} listener 
 * @param {String} [id] - identifier for removing this listener
 */
reservedFunctions.on = function(proxy, event, listener, id) {
	if(acceptableEvents.includes(event)) {
		this.proxy2data.get(proxy).listeners.push([event, listener, id]);
	}
	else {
		throw new Error(`${event} is not a valid event. valid events are ${acceptableEvents.join(',')}`);
	}
}

/**
 * removes a listener from an object by an identifier (can have multiple listeners with the same ID)
 * @param {Object} proxy
 * @param {String} id - the listener(s) identifier
 */
reservedFunctions.removeListener = function(proxy, id) {
	let listeners = this.proxy2data.get(proxy).listeners;
	for(let i = listeners.length - 1; i >= 0; i--) {
		if(listeners[i][2] === id) {
			listeners.splice(i, 1);
		}
	}
}

/**
 * removing all listeners of an object
 * @param {Object} proxy
 */
reservedFunctions.removeAllListeners = function(proxy) {
	this.proxy2data.get(proxy).listeners = [];
}

/**
 * the following functions (getOriginalTarget, getProxserveInstance) seem silly because they could have been written directly
 * on the handler's get() method but it's here as part of the convention of exposing proxy-"inherited"-methods
 */
/**
 * get original target that is behind the proxy.
 * @param {Object} proxy
 */
reservedFunctions.getOriginalTarget = function(proxy) {
	return this.proxy2data.get(proxy).target;
}

/**
 * get the Proxserve's instance that created this proxy
 */
reservedFunctions.getProxserveInstance = function() {
	return this;
}

/**
 * save an array of all reserved function names
 * and also add synonyms to these functions
 */
let reservedFunctionsNames = Object.keys(reservedFunctions);
for(let i = reservedFunctionsNames.length - 1; i >= 0; i--) {
	let name = reservedFunctionsNames[i];
	let synonym = '$'+name;
	reservedFunctions[synonym] = reservedFunctions[name];
	reservedFunctionsNames.push(synonym);
}

/**
 * Convert property name to valid path segment
 * @param {*} obj 
 * @param {String} property 
 */
function property2path(obj, property) {
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
 * 
 * @param {Object} proxy 
 * @param {String} path - segments from current object until desired descendant property
 * @param {*} oldValue 
 * @param {*} value 
 * @param {String} [changeType]
 */
function add2emitQueue(proxy, path, oldValue, value, changeType) {
	if(typeof changeType === 'undefined') {
		if(oldValue === value) return; //no new change was made

		if(value === undefined) changeType = 'delete';
		else if(oldValue === undefined) changeType = 'create';
		else changeType = 'update';
	}

	let data = this.proxy2data.get(proxy);
	
	if(data.status === statuses[1]) { //stopped
		return;
	}

	if(data.listeners.length > 0) {
		let change = {
			'path': path, 'value': value, 'oldValue': oldValue, 'type': changeType
		};
		data.eventPool.push(change);

		if(this.delay <= 0) {
			emit.call(this, proxy); //emit immediately
		}
		else if(data.eventPool.length === 1) {
			setTimeout(emit.bind(this), this.delay, proxy); //initiate timeout once, when starting to accumulate events
		}
	}
	
	path = `${data.propertyPath}${path}`; //get path ready for next iteratin
	data = Object.getPrototypeOf(data); //get parent
	if(data !== Object.prototype) {
		add2emitQueue.call(this, data.proxy, path, oldValue, value, changeType);
	}
}

function emit(proxy) {
	let data = this.proxy2data.get(proxy);
	//save a reference to the event-pool because we are about to immediately empty it, so all future changes, even those
	//that can occur now because of the listeners, will go to a new event-pool and will be emitted next round (after delay)
	let eventPool = data.eventPool;
	data.eventPool = [];

	for(let change of eventPool) { //FIFO - first event in, first event out
		for(let listener of data.listeners) { //listener = [event, function]
			if(listener[0] === change.type) { //will invoke create/update/delete listeners one by one.
				listener[1].call(data.proxy, change);
			}
		}
	}

	for(let listener of data.listeners) {
		if(listener[0] === acceptableEvents[0]) { //change
			listener[1].call(data.proxy, eventPool); //on(change) is always called with an array of one or more changes
		}
	}
}

/**
 * recursively switch between all proxies to their original targets.
 * note: original targets should never hold proxies under them,
 * thus altering the object references (getting from 'value') should be ok.
 * if the programmer decided to create a proxy and then another regular-object and adding to that different children
 * from the proxy and then attaching the regular-object to the proxy then this outer regular-object will be altered.
 * @param {*} value
 */
function unproxify(value) {
	let typeofvalue = realtypeof(value);
	if(acceptableTypes.includes(typeofvalue)) {
		let target = value;
		try {
			target = value.getOriginalTarget();
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

return class Proxserve {
	/**
	 * construct a new proxserve instance
	 * @param {Object|Array} target 
	 * @param {Object} [options] 
	 * 	@property {Number} [options.delay] - delay change-event emitting in milliseconds, letting them pile up and then fire all at once
	 * 	@property {Boolean} [options.strict] - should destroy detached child-objects or deleted properties automatically
	 * 	@property {Boolean} [options.emitReference] - events emit new/old values. true: reference to original objects, false: deep clones that are created on the spot
	 */
	constructor(target, options = {}) {
		this.delay = (options.delay !== undefined) ? options.delay : 10;
		this.strict = (options.strict !== undefined) ? options.strict : true;
		this.emitReference = (options.emitReference !== undefined) ? options.emitReference : true;
		this.path2data = new Map();
		this.proxy2data = new WeakMap();

		return this.createProxy(target, '', '');
	}

	/**
	 * create a new proxy object from a target object
	 * @param {Object|Array} target
	 * @param {Object|Array} parent
	 * @param {String} path
	 * @param {String} currentProperty
	 */
	createProxy(parent, parentPath, targetProperty) {
		let target;
		let path;
		if(targetProperty !== '') {
			target = parent[ targetProperty ];
			path = parentPath + property2path(parent, targetProperty);
		}
		else {
			target = parent; //root object
			path = parentPath;
		}

		let data; //important. will be set after creating the proxy

		let typeoftarget = realtypeof(target);

		if(acceptableTypes.includes(typeoftarget)) {
			let revocable = Proxy.revocable(target, {
				get: (target/*same as parent scope 'target'*/, property, proxy) => {
					//can access a function (or its synonym) if their keywords isn't used
					if(reservedFunctionsNames.includes(property) && typeof target[property] === 'undefined') {
						return reservedFunctions[property].bind(this, proxy);
					}
					else if(!target.propertyIsEnumerable(property) || typeof property === 'symbol') {
						return target[property]; //non-enumerable or non-path'able aren't proxied
					}
					else {
						let propertyPath = property2path(target, property);
						let propertyData = this.path2data.get(`${path}${propertyPath}`);
						return (propertyData !== undefined) ? propertyData.proxy : target[property];
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
					if(data.status === statuses[2]) { //blocked from changing values
						console.error(`can't change value of property '${property}'. object is blocked.`);
						return true;
					}
					else if(data.status === statuses[3] || typeof property === 'symbol') {
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

					let propertyPath = property2path(target, property);
					let oldValue = proxy[property];
					let valueClone, oldValueClone;
					if(!this.emitReference) {
						valueClone = simpleClone(value); //deep copy with no proxies inside
						oldValueClone = simpleClone(oldValue); //deep copy with no proxies inside
					}

					let oldValueWasProxy = this.path2data.has(`${path}${propertyPath}`);
					if(this.strict && oldValueWasProxy) { //a proxy will be detached from the tree
						Proxserve.destroy(oldValue);
					}
					
					value = unproxify(value);

					target[property] = value; //assign new value

					let typeofvalue = realtypeof(value);
					if(acceptableTypes.includes(typeofvalue)) {
						this.createProxy(target, path, property); //if trying to add a new value which is an object then make it a proxy
					}

					if(!this.emitReference) { //also prevents emitting proxies
						add2emitQueue.call(this, proxy, propertyPath, oldValueClone, valueClone);
					} else {
						add2emitQueue.call(this, proxy, propertyPath, oldValue, value);
					}

					return true;
				},

				defineProperty: (target/*same as parent scope 'target'*/, property, descriptor) => {
					let propertyPath;
					if(typeof property !== 'symbol') {
						propertyPath = property2path(target, property);

						let oldValueWasProxy = this.path2data.has(`${path}${propertyPath}`);
						if(this.strict && oldValueWasProxy) { //a proxy will be detached from the tree
							Proxserve.destroy(data.proxy[property]);
						}
					}

					Object.defineProperty(target, property, descriptor);
					let typeofvalue = realtypeof(descriptor.value);

					//excluding non-enumerable properties from being proxied and also excludes symbol properties as they can't have a path
					if(acceptableTypes.includes(typeofvalue) && descriptor.enumerable === true && typeof property !== 'symbol') {
						this.createProxy(target, path, property); //if trying to add a new value which is an object then make it a proxy
						
						if(!this.emitReference) { //also prevents emitting proxies
							add2emitQueue.call(this, data.proxy, propertyPath, undefined, simpleClone(descriptor.value));
						} else {
							add2emitQueue.call(this, data.proxy, propertyPath, undefined, descriptor.value);
						}
					}

					return true;
				},

				deleteProperty: (target, property) => {
					if(!target.propertyIsEnumerable(property) || typeof property === 'symbol') {
						//non-proxied properties simply get deleted and nothing more
						delete target[property];
						return true;
					}

					if(data.status === statuses[2]) { //blocked from changing values
						console.error(`can't delete property '${property}'. object is blocked.`);
						return true;
					}

					let propertyPath = property2path(target, property);

					if(property in target) {
						let oldValue = data.proxy[property];
						let oldValueClone;
						if(!this.emitReference) {
							oldValueClone = simpleClone(oldValue); //deep copy with no proxies inside
						}

						let oldValueData = this.path2data.get(`${path}${propertyPath}`);
						if(oldValueData) {
							oldValueData.status = statuses[3]; //deleted
							if(this.strict) {
								Proxserve.destroy(oldValue); //will destroy this proxy and all sub-proxies
							}
						}

						delete target[property]; //actual delete

						if(!this.emitReference) { //also prevents emitting proxies
							add2emitQueue.call(this, data.proxy, propertyPath, oldValueClone, undefined, 'delete');
						} else {
							add2emitQueue.call(this, data.proxy, propertyPath, oldValue, undefined, 'delete');
						}

						return true;
					}
					else {
						return true; //do nothing because there's nothing to delete
					}
				}
			});

			if(parent === target) { //dealing with root object
				data = {
					'status': statuses[0],
					'propertyPath': ''
				};
			}
			else {
				//inherit from parent
				data = Object.create(this.path2data.get(parentPath));
				data.propertyPath = property2path(parent, targetProperty);
			}
			//overwrite properties of its own
			Object.assign(data, {
				'target': target,
				'proxy': revocable.proxy,
				'revoke': revocable.revoke,
				'parentPath': parentPath,
				'property': targetProperty,
				'listeners': [],
				'eventPool': []
			});


			//save important data regarding the proxy and original (raw) object
			this.path2data.set(path, data);
			this.proxy2data.set(revocable.proxy, data);

			if(typeoftarget === 'Object') {
				let keys = Object.keys(target);
				for(let key of keys) {
					let typeofproperty = realtypeof(target[key]);
					if(acceptableTypes.includes(typeofproperty)) {
						this.createProxy(target, path, key); //recursively make child objects also proxies
					}
				}
			}
			else if(typeoftarget === 'Array') {
				for(let i = 0; i < target.length; i++) {
					let typeofproperty = realtypeof(target[i]);
					if(acceptableTypes.includes(typeofproperty)) {
						this.createProxy(target, path, i); //recursively make child objects also proxies
					}
				}
			}
			else {
				console.warn('Not Implemented');
			}

			return revocable.proxy;
		}
		else {
			throw new Error('Must observe an '+acceptableTypes.join('/'));
		}
	}

	/**
	 * Recursively revoke proxies, allowing them to be garbage collected.
	 * this functions delays by delay+1000 milliseconds to let time for all events to finish
	 * @param {*} proxy 
	 */
	static destroy(proxy) {
		let self;
		try {
			self = proxy.getProxserveInstance();
		} catch(error) {
			return; //proxy variable isn't a proxy
		}

		let data = self.proxy2data.get(proxy);

		let typeofproxy = realtypeof(proxy);
		if(acceptableTypes.includes(typeofproxy)) {
			if(typeofproxy === 'Object') {
				let keys = Object.keys(proxy);
				for(let key of keys) {
					try {
						let typeofproperty = realtypeof(proxy[key]);
						if(acceptableTypes.includes(typeofproperty)) {
							Proxserve.destroy(proxy[key]);
						}
					} catch(error) {
						console.error(error); //don't throw and kill the whole process just if this recursion fails
					}
				}
			}
			else if(typeofproxy === 'Array') {
				for(let i = proxy.length - 1; i >= 0; i--) {
					try {
						let typeofproperty = realtypeof(proxy[i]);
						if(acceptableTypes.includes(typeofproperty)) {
							Proxserve.destroy(proxy[i]);
						}
					} catch(error) {
						console.error(error); //don't throw and kill the whole process just if this recursion fails
					}
				}
			}
			else {
				console.warn('Not Implemented');
			}

			setTimeout(function() {
				let dataByPath = self.path2data.get(`${data.parentPath}${data.propertyPath}`);
				//this runs async so check if meanwhile data for this path wasn't replaced with a new proxy
				if(dataByPath.proxy === data.proxy) {
					self.path2data.delete(`${data.parentPath}${data.propertyPath}`);
				}
				self.proxy2data.delete(data.proxy);
				data.revoke();
			}, self.delay + 1000);
		}
	}

	/**
	 * splits a path to an array of properties
	 * (benchmarked and is faster than regex and split())
	 * @param {String} path 
	 */
	static splitPath(path) {
		if(typeof path !== 'string' || path === '') {
			return [''];
		}
		
		let i = 0;
		if(path[0] === '.' || path[0] === '[') {
			i = 1; //loop will skip over openning '.' or '['
		}

		var resultsArr = [];
		var tmp='';
		for(; i < path.length; i++) {
			let char = path[i];
			if(char === '.' || char === '[') {
				resultsArr.push(tmp);
				tmp = '';
			} else if(char !== ']') {
				tmp += char;
			}
		}
		if(tmp!=='') {
			resultsArr.push(tmp);
		}
		return resultsArr;
	}

	/**
	 * evaluate a long path and return the designated object and its referred property
	 * @param {Object} obj
	 * @param {String} path
	 * @returns {Object} - returns {object, property, value}
	 */
	static evalPath(obj, path) {
		if(path === '') {
			return { object: obj, property: undefined, value: obj };
		}

		let segments = Proxserve.splitPath(path);
		let i;
		for(i = 0; i <= segments.length - 2; i++) { //iterate until one before last property because they all must exist
			obj = obj[segments[i]];
			if(typeof obj === 'undefined') {
				throw new Error('Invalid path was given');
			}
		}
		return { object: obj, property: segments[i], value: obj[ segments[i] ] };
	}

	static simpleClone(obj) {
		return simpleClone(obj);
	}
}
})();

try { module.exports = exports = Proxserve; } catch (err) {};