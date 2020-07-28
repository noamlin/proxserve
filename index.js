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
let ND = Symbol.for('proxserve_node_data'); //key for the data of a node
let NID = Symbol.for('proxserve_node_inherited_data'); //key for the inherited data of a node

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
 * @param {Object} dataNode
 */
reservedFunctions.stop = function(dataNode) {
	dataNode[NID].status = statuses[1];
}

/**
 * block object and children from any changes.
 * user can't set nor delete any property
 * @param {Object} dataNode
 */
reservedFunctions.block = function(dataNode) {
	dataNode[NID].status = statuses[2];
}

/**
 * resume default behavior of emitting change events, inherited from parent
 * @param {Object} dataNode
 * @param {Boolean} [force] - force being active regardless of parent
 */
reservedFunctions.activate = function(dataNode, force=false) {
	if(force || dataNode === this.dataTree) { //force activation or we are on root proxy
		dataNode[NID].status = statuses[0];
	}
	else {
		delete dataNode[NID].status;
	}
}

/**
 * add event listener on a proxy or on a descending path
 * @param {Object} dataNode
 * @param {String} event 
 * @param {String} [path] - path selector
 * @param {Function} listener 
 * @param {String} [id] - identifier for removing this listener
 */
reservedFunctions.on = function(dataNode, event, path, listener, id) {
	if(acceptableEvents.includes(event)) {
		if(arguments.length < 5 && typeof path !== 'string') { //if called without path
			id = listener;
			listener = path;
			path = '';
		}
		
		let segments = Proxserve.splitPath(path);
		for(let property of segments) {
			if(!dataNode[property]) {
				dataNode.createNode(property);
			}
			dataNode = dataNode[property];
		}

		if(!dataNode[ND].listeners) {
			dataNode[ND].listeners = [];
			dataNode[ND].eventPool = [];
		}
		dataNode[ND].listeners.push([event, listener, id]);
	}
	else {
		throw new Error(`${event} is not a valid event. valid events are ${acceptableEvents.join(',')}`);
	}
}

/**
 * removes a listener from a path by an identifier (can have multiple listeners with the same ID)
 * or by the listener function itself
 * @param {Object} dataNode
 * @param {String} [path] - path selector
 * @param {String} id - the listener(s) identifier or listener-function
 */
reservedFunctions.removeListener = function(dataNode, path, id) {
	if(arguments.length === 2) { //if called without path
		id = path;
		path = '';
	}

	let fullPath = `${dataNode[ND].path}${path}`;
	let segments = Proxserve.splitPath(path);
	for(let property of segments) {
		if(!dataNode[property]) {
			console.warn(`can't remove listener from a non-existent path '${fullPath}'`);
			return;
		}
		dataNode = dataNode[property];
	}

	if(dataNode[ND].listeners) {
		let listeners = dataNode[ND].listeners;
	
		for(let i = listeners.length - 1; i >= 0; i--) {
			if((typeof id !== 'function' && listeners[i][2] === id)
			|| (typeof id === 'function' && listeners[i][1] === id)) {
				listeners.splice(i, 1);
			}
		}
	
		if(listeners.length === 0) {
			delete dataNode[ND].listeners;
			delete dataNode[ND].eventPool;
		}
	}
}

/**
 * removing all listeners of a path
 * @param {Object} dataNode
 * @param {String} [path] - path selector
 */
reservedFunctions.removeAllListeners = function(dataNode, path='') {
	let fullPath = `${dataNode[ND].path}${path}`;
	let segments = Proxserve.splitPath(path);
	for(let property of segments) {
		if(!dataNode[property]) {
			console.warn(`can't remove all listeners from a non-existent path '${fullPath}'`);
			return;
		}
		dataNode = dataNode[property];
	}

	if(dataNode[ND].listeners) {
		delete dataNode[ND].listeners;
		delete dataNode[ND].eventPool;
	}
}

/**
 * the following functions (getOriginalTarget, getProxserveDataNode, getProxserveInstance) seem silly because they could have been written directly
 * on the handler's get() method but it's here as part of the convention of exposing proxy-"inherited"-methods
 */
/**
 * get original target that is behind the proxy.
 * @param {Object} proxy
 */
reservedFunctions.getOriginalTarget = function(dataNode) {
	return dataNode[ND].target;
}

/**
 * get the data-node of the proxy or sub-proxy
 */
reservedFunctions.getProxserveDataNode = function(dataNode) {
	return dataNode;
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
 * add change-events to a queue and then emits them wither immediately or later as a batch
 * @param {Object} dataNode 
 * @param {String} property
 * @param {*} oldValue 
 * @param {*} value 
 * @param {String} [changeType]
 */
function add2emitQueue(dataNode, property, oldValue, value, changeType) {
	if(oldValue === value) {
		return; //no new change was made
	}

	if(typeof changeType === 'undefined') {
		if(value === undefined) changeType = 'delete';
		else if(oldValue === undefined) changeType = 'create';
		else changeType = 'update';
	}

	let path;
	if(dataNode[property]) { //changed a property which has its own data node on the tree
		dataNode = dataNode[property];
		path = '';
	} else {
		path = property2path(dataNode[ND].target, property);
	}

	while(true) {
		if(dataNode[NID].status === statuses[1]) { //stop and don't propagate
			return;
		}
		else if(dataNode[ND].listeners && dataNode[ND].listeners.length > 0) {
			let change = {
				'path': path, 'value': value, 'oldValue': oldValue, 'type': changeType
			};
			dataNode[ND].eventPool.push(change);
	
			if(this.delay <= 0) {
				emit.call(this, dataNode); //emit immediately
			}
			else if(dataNode[ND].eventPool.length === 1) {
				setTimeout(emit.bind(this), this.delay, dataNode); //initiate timeout once, when starting to accumulate events
			}
		}

		if(dataNode !== this.dataTree) { //we are not on root node yet
			path = dataNode[ND].propertyPath + path;
			dataNode = dataNode[ND].parentNode;
		} else {
			break;
		}
	}
}

function emit(dataNode) {
	//save a reference to the event-pool because we are about to immediately empty it, so all future changes, even those
	//that can occur now because of the listeners, will go to a new event-pool and will be emitted next round (after delay)
	let eventPool = dataNode[ND].eventPool;
	dataNode[ND].eventPool = [];

	for(let change of eventPool) { //FIFO - first event in, first event out
		for(let listener of dataNode[ND].listeners) { //listener = [event, function, id]
			if(listener[0] === change.type) { //will invoke create/update/delete listeners one by one.
				listener[1].call(dataNode[ND].proxy, change);
			}
		}
	}

	for(let listener of dataNode[ND].listeners) {
		if(listener[0] === acceptableEvents[0]) { // 'change'
			listener[1].call(dataNode[ND].proxy, eventPool); //on(change) is always called with an array of one or more changes
		}
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
function unproxify(value) {
	let typeofvalue = realtypeof(value);
	if(acceptableTypes.includes(typeofvalue)) {
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

		let dataTreePrototype = {
			createNode: function(property) {
				let propertyPath = property2path(this[ND].target || {}, property); //if parent doesn't have target then treat it as object

				if(!this[property]) {
					this[property] = Object.create(dataTreePrototype);
					this[property][NID] = Object.create(this[NID]);
					this[property][ND] = {
						'parentNode': this
					};
				}

				delete this[property][NID].status; //clear old status in case if node previously existed
				//update path for rare case where parent was array and then changed to object or vice versa
				this[property][ND].path = this[ND].path + propertyPath;
				this[property][ND].propertyPath = propertyPath;

				return this[property];
			}
		}

		this.dataTree = Object.create(dataTreePrototype);
		this.dataTree[NID] = {
			'status': statuses[0]
		};
		this.dataTree[ND] = {
			'parentNode': null,
			'target': target,
			'path': '',
			'propertyPath': ''
		};

		this.revokesMap = new WeakMap();

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
			dataNode = parentNode.createNode(targetProperty);
			dataNode[ND].target = parentNode[ND].target[ targetProperty ]; //assign said 'target' to the dataNode
		}

		let target = dataNode[ND].target;

		let typeoftarget = realtypeof(target);

		if(acceptableTypes.includes(typeoftarget)) {
			let revocable = Proxy.revocable(target, {
				get: (target/*same as parent scope 'target'*/, property, proxy) => {
					//can access a function (or its synonym) if their keywords isn't used
					if(reservedFunctionsNames.includes(property) && typeof target[property] === 'undefined') {
						return reservedFunctions[property].bind(this, dataNode);
					}
					else if(!target.propertyIsEnumerable(property) || typeof property === 'symbol') {
						return target[property]; //non-enumerable or non-path'able aren't proxied
					}
					else if(dataNode[property] && dataNode[property][ND].proxy) { //there's a child node and it holds a proxy
						return dataNode[property][ND].proxy;
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
					if(dataNode[NID].status === statuses[2]) { //blocked from changing values
						console.error(`can't change value of property '${property}'. object is blocked.`);
						return true;
					}
					else if(dataNode[NID].status === statuses[3] || typeof property === 'symbol') {
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

					let oldValue = dataNode[ND].proxy[property];
					let emitValue = value;
					let emitOldValue = oldValue;
					if(!this.emitReference) {
						emitValue = simpleClone(emitValue); //deep copy with no proxies inside
						emitOldValue = simpleClone(emitOldValue); //deep copy with no proxies inside
					}

					if(this.strict && dataNode[property] && dataNode[property][ND].proxy) { //a proxy will be detached from the tree
						Proxserve.destroy(oldValue);
					}
					
					value = unproxify(value);

					target[property] = value; //assign new value

					let typeofvalue = realtypeof(value);
					if(acceptableTypes.includes(typeofvalue)) {
						this.createProxy(dataNode, property); //if trying to add a new value which is an object then make it a proxy
					}

					add2emitQueue.call(this, dataNode, property, emitOldValue, emitValue);

					return true;
				},

				defineProperty: (target/*same as parent scope 'target'*/, property, descriptor) => {
					let oldValue = dataNode[ND].proxy[property];

					//if a proxy will be detached from the tree
					if(typeof property !== 'symbol' && this.strict && dataNode[property] && dataNode[property][ND].proxy) {
						Proxserve.destroy(dataNode[property][ND].proxy);
					}

					Object.defineProperty(target, property, descriptor);
					let typeofvalue = realtypeof(descriptor.value);

					//excluding non-enumerable properties from being proxied and also excludes symbol properties as they can't have a path
					if(acceptableTypes.includes(typeofvalue) && descriptor.enumerable === true && typeof property !== 'symbol') {
						this.createProxy(dataNode, property); //if trying to add a new value which is an object then make it a proxy
						
						let value = descriptor.value;
						if(!this.emitReference) { //also prevents emitting proxies
							value = simpleClone(value);
							oldValue = simpleClone(oldValue);
						} else {
							add2emitQueue.call(this, dataNode, property, oldValue, value);
						}
					}

					return true;
				},

				deleteProperty: (target/*same as parent scope 'target'*/, property) => {
					if(!target.propertyIsEnumerable(property) || typeof property === 'symbol') {
						//non-proxied properties simply get deleted and nothing more
						delete target[property];
						return true;
					}

					if(dataNode[NID].status === statuses[2]) { //blocked from changing values
						console.error(`can't delete property '${property}'. object is blocked.`);
						return true;
					}

					if(property in target) {
						let oldValue = dataNode[ND].proxy[property];
						let emitOldValue = oldValue;
						if(!this.emitReference) {
							emitOldValue = simpleClone(emitOldValue); //deep copy with no proxies inside
						}

						if(dataNode[property] && dataNode[property][ND].proxy) {
							dataNode[property][NID].status = statuses[3]; //deleted
							if(this.strict) {
								Proxserve.destroy(oldValue); //will destroy this proxy and all sub-proxies
							}
						}

						delete target[property]; //actual delete

						add2emitQueue.call(this, dataNode, property, emitOldValue, undefined, 'delete');

						return true;
					}
					else {
						return true; //do nothing because there's nothing to delete
					}
				}
			});

			dataNode[ND].proxy = revocable.proxy;
			this.revokesMap.set(revocable.proxy, revocable.revoke);

			if(typeoftarget === 'Object') {
				let keys = Object.keys(target);
				for(let key of keys) {
					let typeofproperty = realtypeof(target[key]);
					if(acceptableTypes.includes(typeofproperty)) {
						this.createProxy(dataNode, key); //recursively make child objects also proxies
					}
				}
			}
			else if(typeoftarget === 'Array') {
				for(let i = 0; i < target.length; i++) {
					let typeofproperty = realtypeof(target[i]);
					if(acceptableTypes.includes(typeofproperty)) {
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
			throw new Error('Must observe an '+acceptableTypes.join('/'));
		}
	}

	/**
	 * Recursively revoke proxies, allowing them to be garbage collected.
	 * this functions delays by delay+1000 milliseconds to let time for all events to finish
	 * @param {*} proxy 
	 */
	static destroy(proxy) {
		let self, dataNode;
		try {
			self = proxy.$getProxserveInstance();
			dataNode = proxy.$getProxserveDataNode();
		} catch(error) {
			return; //proxy variable isn't a proxy
		}

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
						console.error(error); //don't throw and kill the whole process just if this iteration fails
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
						console.error(error); //don't throw and kill the whole process just if this iteration fails
					}
				}
			}
			else {
				console.warn('Not Implemented');
			}

			setTimeout(function() {
				let revoke = self.revokesMap.get(proxy);
				if(revoke) {
					revoke();
				}

				if(dataNode[ND].proxy === proxy) { //this runs async so check if meanwhile the data for this path wasn't replaced with a new proxy
					delete dataNode[ND].target;
					delete dataNode[ND].proxy;
				}
			}, self.delay + 1000); //postpone this cpu intense function for later, probably when proxserve is not is use
		}
	}

	/**
	 * splits a path to an array of properties
	 * (benchmarked and is faster than regex and split())
	 * @param {String} path 
	 */
	static splitPath(path) {
		if(typeof path !== 'string' || path === '') {
			return [];
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