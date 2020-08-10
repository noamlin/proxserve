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
let statuses = ['active', 'stopped', 'blocked']; //statuses of proxies
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
 * @param {Object} objects
 * @param {Boolean} [force] - force being active regardless of parent
 */
reservedFunctions.activate = function(dataNode, objects, force=false) {
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
 * @param {Object} objects
 * @param {String} event 
 * @param {String} [path] - path selector
 * @param {Function} listener 
 * @param {String} [id] - identifier for removing this listener
 * @param {Boolean} [once] - whether this listener will run only once or always
 */
reservedFunctions.on = function(dataNode, objects, event, path, listener, id, once=false) {
	if(acceptableEvents.includes(event)) {
		if(typeof path === 'function') { //if called without path
			id = listener;
			listener = path;
			path = '';
		} else if(typeof listener !== 'function') {
			throw new Error(`invalid arguments were given. listener must be a function`);
		}
		
		let segments = Proxserve.splitPath(path);
		//traverse down the tree. create data-nodes if needed
		for(let property of segments) {
			if(!dataNode[property]) {
				createDataNode(dataNode, property);
			}
			dataNode = dataNode[property];
		}

		if(!dataNode[ND].listeners) {
			dataNode[ND].listeners = [];
			dataNode[ND].eventPool = [];
		}
		dataNode[ND].listeners.push([event, listener, id, once]);
	}
	else {
		throw new Error(`${event} is not a valid event. valid events are ${acceptableEvents.join(',')}`);
	}
}

/**
 * add event listener on a proxy or on a descending path which will run only once
 * @param {Object} dataNode
 * @param {Object} objects
 * @param {String} event 
 * @param {String} [path] - path selector
 * @param {Function} listener 
 * @param {String} [id] - identifier for removing this listener
 */
reservedFunctions.once = function(dataNode, objects, event, path, listener, id) {
	reservedFunctions.on.call(this, dataNode, objects, event, path, listener, id, true);
}

/**
 * removes a listener from a path by an identifier (can have multiple listeners with the same ID)
 * or by the listener function itself
 * @param {Object} dataNode
 * @param {Object} objects
 * @param {String} [path] - path selector
 * @param {String} id - the listener(s) identifier or listener-function
 */
reservedFunctions.removeListener = function(dataNode, objects, path, id) {
	if(arguments.length === 3) { //if called without path
		id = path;
		path = '';
	}

	let fullPath = `${dataNode[ND].path}${path}`;
	let segments = Proxserve.splitPath(path);
	//traverse down the tree
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
 * @param {Object} objects
 * @param {String} [path] - path selector
 */
reservedFunctions.removeAllListeners = function(dataNode, objects, path='') {
	let fullPath = `${dataNode[ND].path}${path}`;
	let segments = Proxserve.splitPath(path);
	//traverse down the tree
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
 * the following functions (getOriginalTarget, getProxserveObjects, getProxserveDataNode, getProxserveInstance) seem silly
 * because they could have been written directly on the handler's get() method but it's here as part of the convention of
 * exposing proxy-"inherited"-methods
 */
/**
 * get original target that is behind the proxy
 * @param {Object} dataNode
 * @param {Object} objects
 */
reservedFunctions.getOriginalTarget = function(dataNode, objects) {
	return objects.target;
}

/**
 * get 'objects' (which hold all related objects) of a proxy
 * @param {Object} dataNode
 * @param {Object} objects
 */
reservedFunctions.getProxserveObjects = function(dataNode, objects) {
	return objects;
}

/**
 * get the data-node of the proxy or sub-proxy
 * @param {Object} dataNode
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
 * add change-events to a queue and then emits them immediately or later as a batch
 * @param {Number} delay 
 * @param {Object} dataNode 
 * @param {String} path
 * @param {*} oldValue 
 * @param {*} value 
 * @param {String} changeType
 */
function add2emitQueue(delay, dataNode, path, oldValue, value, changeType) {
	if(dataNode[ND].listeners && dataNode[ND].listeners.length > 0) {
		let change = {
			'path': path, 'value': value, 'oldValue': oldValue, 'type': changeType
		};
		dataNode[ND].eventPool.push(change);

		if(delay <= 0) {
			emit(dataNode); //emit immediately
		}
		else if(dataNode[ND].eventPool.length === 1) {
			setTimeout(emit, delay, dataNode); //initiate timeout once, when starting to accumulate events
		}
	}
}

/**
 * bubbles up the data tree for 'add2emitQueue'
 * @param {Number} delay
 * @param {Object} dataNode
 * @param {String} property
 * @param {*} oldValue
 * @param {Boolean} wasOldValueProxy
 * @param {*} value
 * @param {Boolean} isValueProxy
 */
function add2emitQueue_bubble(delay, dataNode, property, oldValue, wasOldValueProxy, value, isValueProxy) {
	if(oldValue === value/*no new change was made*/
		|| dataNode[ND].objects.isDeleted/*altered a deleted or detached proxy*/) {
		return;
	}

	let changeType = acceptableEvents[2]; //update
	if(value === undefined) changeType = acceptableEvents[3]; //delete
	else if(oldValue === undefined) changeType = acceptableEvents[1]; //create

	let path;
	if(dataNode[property]) { //changed a property which has its own data node on the tree
		dataNode = dataNode[property];
		path = '';

		if(wasOldValueProxy || isValueProxy) {
			add2emitQueue_capture(delay, dataNode, oldValue, value, changeType);
		}
	} else {
		path = property2path(dataNode[ND].objects.target, property);
	}

	while(true) {
		if(dataNode[NID].status === statuses[1]) { //stop and don't propagate
			return;
		}
		else {
			add2emitQueue(delay, dataNode, path, oldValue, value, changeType);
		}

		if(!dataNode[ND].parentNode.isTreePrototype) { //we are not on root node yet
			path = dataNode[ND].propertyPath + path;
			dataNode = dataNode[ND].parentNode;
		} else {
			break;
		}
	}
}

/**
 * capturing phase - going down the data tree for 'add2emitQueue'
 * @param {Number} delay 
 * @param {Object} dataNode - traverse down this node
 * @param {*} oldValue 
 * @param {*} value 
 */
function add2emitQueue_capture(delay, dataNode, oldValue, value) {
	let keys = Object.keys(dataNode);
	for(let key of keys) {
		let subValue = (typeof value === 'object' && value !== null) ? value[key] : undefined;
		let subOldValue = (typeof oldValue === 'object' && oldValue !== null) ? oldValue[key] : undefined;
		if(subValue !== subOldValue) { //if not both undefined or same primitive or the same object
			//TODO - both will never be the same object because 'oldValue' is the target object while 'value' is the proxy,
			//			but can a concerning scenario even happen?
			let changeType = acceptableEvents[2]; //update
			if(subValue === undefined) changeType = acceptableEvents[3]; //delete
			else if(subOldValue === undefined) changeType = acceptableEvents[1]; //create
			add2emitQueue(delay, dataNode[key], '', subOldValue, subValue, changeType);
			add2emitQueue_capture(delay, dataNode[key], subOldValue, subValue);
		}
	}
}

function emit(dataNode) {
	//save a reference to the event-pool because we are about to immediately empty it, so all future changes, even those
	//that can occur now because of the listeners, will go to a new event-pool and will be emitted next round (after delay).
	//NOTICE - an event listener for one path can still manipulate event-pools of other path's that are next on this cycle
	let listeners = dataNode[ND].listeners;
	let eventPool = dataNode[ND].eventPool;
	dataNode[ND].eventPool = [];

	if(!listeners || !eventPool) {
		//rare case where an event triggers a listener that removed-all-listeners and also causes a new event
		//before all emits of this loop have finished
		return;
	}

	//FIFO - first event in, first event out. listeners will be called by their turn according to which event fires first
	for(let change of eventPool) {
		for(let i = listeners.length-1; i >= 0; i--) {
			let listener = listeners[i]; //listener = [event, function, id, once]

			if(listener[0] === change.type) { //will invoke only create/update/delete listeners
				if(listener[3] === true) { //first delete the one-time listener, so the upcoming listener's-function won't meddle with it
					listeners.splice(i, 1);
				}

				listener[1].call(dataNode[ND].objects.proxy, change);
			}
		}
	}

	//iterate over all 'change' listeners and emit with an (ordered) array of all events
	for(let i = listeners.length-1; i >= 0; i--) {
		let listener = listeners[i]; //listener = [event, function, id, once]

		if(listener[0] === acceptableEvents[0]) { // 'change'
			if(listener[3] === true) { //first delete the one-time listener, so the upcoming listener's-function won't meddle with it
				listeners.splice(i, 1);
			}

			listener[1].call(dataNode[ND].objects.proxy, eventPool); //on(change) is always called with an array of one or more changes
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

function createDataNode(parentNode, property) {
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
				'parentNode': parentNode
			}
		};
		parentNode[property] = node;
	}

	delete node[NID].status; //clear old status in case if node previously existed
	//updates path (for rare case where parent was array and then changed to object or vice versa)
	//and also makes a new and clean 'objects' property
	Object.assign(node[ND], {
		'path': parentNode[ND].path + propertyPath,
		'propertyPath': propertyPath,
		'objects': Object.assign(Object.create(parentNode[ND].objects), {
			'target': null,
			'proxy': null
		})
	});

	return node;
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

		this.dataTree = createDataNode({
			[NID]: { 'status': statuses[0] },
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

		if(acceptableTypes.includes(typeoftarget)) {
			let revocable = Proxy.revocable(target, {
				get: (target/*same as parent scope 'target'*/, property, proxy) => {
					//can access a function (or its synonym) if their keywords isn't used
					if(reservedFunctionsNames.includes(property) && typeof target[property] === 'undefined') {
						return reservedFunctions[property].bind(this, dataNode, objects);
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
					if(dataNode[NID].status === statuses[2]) { //blocked from changing values
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

					let oldValue;
					let emitOldValue = target[property]; //should not be proxy
					let shouldDestroy = false;
					if(dataNode[property] !== undefined && dataNode[property][ND].objects.proxy !== undefined) {
						//about to overwrite an existing property which is a proxy (about to detach a proxy)
						oldValue = dataNode[property][ND].objects.proxy; //the sub-proxy
						dataNode[property][ND].objects.isDeleted = true;
						if(this.strict) {
							shouldDestroy = true;
						}
					}

					value = unproxify(value);
					target[property] = value; //assign new value

					let emitValue = value; //currently not a proxy but this might change later
					let isValueProxy = false;
					let typeofvalue = realtypeof(value);
					if(acceptableTypes.includes(typeofvalue)) {
						this.createProxy(dataNode, property); //if trying to add a new value which is an object then make it a proxy
						emitValue = dataNode[property][ND].objects.proxy; //is a proxy
						isValueProxy = true;
					}

					if(!this.emitReference) { //deep copy with no proxies inside
						emitValue = simpleClone(emitValue);
						emitOldValue = simpleClone(emitOldValue);
					}

					add2emitQueue_bubble(this.delay, dataNode, property, emitOldValue, oldValue!==undefined, emitValue, isValueProxy);
					if(shouldDestroy) {
						setTimeout(() => {
							Proxserve.destroy(oldValue);
						}, this.delay + 1000); //postpone this cpu intense function for later, probably when proxserve is not is use
					}

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

					let oldValue;
					let emitOldValue = target[property]; //should not be proxy
					let shouldDestroy = false;
					if(dataNode[property] !== undefined && dataNode[property][ND].objects.proxy !== undefined) {
						//about to overwrite an existing property which is a proxy (about to detach a proxy)
						oldValue = dataNode[property][ND].objects.proxy; //the sub-proxy
						dataNode[property][ND].objects.isDeleted = true;
						if(this.strict) {
							shouldDestroy = true;
						}
					}

					descriptor.value = unproxify(descriptor.value);
					Object.defineProperty(target, property, descriptor); //defining the new value
					let value = descriptor.value;
					let emitValue = value; //currently not a proxy but this might change later

					let isValueProxy = false;
					//excluding non-enumerable properties from being proxied
					let typeofvalue = realtypeof(descriptor.value);
					if(acceptableTypes.includes(typeofvalue) && descriptor.enumerable === true) {
						this.createProxy(dataNode, property); //if trying to add a new value which is an object then make it a proxy

						value = dataNode[property][ND].objects.proxy; //value is now the proxy, not the target
						isValueProxy = true;
						emitValue = value; //is a proxy
						if(!this.emitReference) {
							emitValue = simpleClone(emitValue);
							emitOldValue = simpleClone(emitOldValue); //deep copy with no proxies inside
						}
					}

					add2emitQueue_bubble(this.delay, dataNode, property, emitOldValue, oldValue!==undefined, emitValue, isValueProxy);
					if(shouldDestroy) {
						setTimeout(() => {
							Proxserve.destroy(oldValue);
						}, this.delay + 1000); //postpone this cpu intense function for later, probably when proxserve is not is use
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
						let oldValue;
						let emitOldValue = target[property]; //should not be proxy
						if(!this.emitReference) {
							emitOldValue = simpleClone(emitOldValue); //deep copy with no proxies inside
						}
						let shouldDestroy = false;
						if(dataNode[property] !== undefined && dataNode[property][ND].objects.proxy !== undefined) {
							//about to overwrite an existing property which is a proxy (about to detach a proxy)
							oldValue = dataNode[property][ND].objects.proxy; //the sub-proxy
							dataNode[property][ND].objects.isDeleted = true;
							if(this.strict) {
								shouldDestroy = true;
							}
						}

						delete target[property]; //actual delete

						add2emitQueue_bubble(this.delay, dataNode, property, emitOldValue, oldValue!==undefined, undefined, false);
						if(shouldDestroy) {
							setTimeout(() => {
								Proxserve.destroy(oldValue);
							}, this.delay + 1000); //postpone this cpu intense function for later, probably when proxserve is not is use
						}

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
		let dataNode, objects;
		try {
			dataNode = proxy.$getProxserveDataNode();
			objects = proxy.$getProxserveObjects();
		} catch(error) {
			return; //proxy variable isn't a proxy
		}

		if(!objects.isDeleted) {
			objects.isDeleted = true;
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

			objects.revoke();
			objects.proxy = null;
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
				throw new Error(`Invalid path was given - "${path}"`);
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