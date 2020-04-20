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

/**
 * check if variable is a number or a string of a number
 * @param {*} variable 
 */
function isNumeric(variable) {
	if(typeof variable === 'string' && variable === '') return false;
	else return !isNaN(variable);
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
 * @param {Object} target
 */
reservedFunctions.stop = function(target) {
	this.objectData.get(target).status = statuses[1];
}

/**
 * block object and children from any changes.
 * user can't set nor delete any property
 * @param {Object} target
 */
reservedFunctions.block = function(target) {
	this.objectData.get(target).status = statuses[2];
}

/**
 * resume default behavior of emitting change events, inherited from parent
 * @param {Object} target
 * @param {Boolean} [force] - force being active regardless of parent
 */
reservedFunctions.activate = function(target, force=false) {
	let data = this.objectData.get(target);
	if(force || data.property==='') { //force activation or we are on root proxy
		data.status = statuses[0];
	}
	else {
		let data = this.objectData.get(target);
		delete data.status;
	}
}

/**
 * add event listener on a proxy
 * @param {Object} target
 * @param {String} event 
 * @param {Function} listener 
 * @param {String} [id] - identifier for removing this listener
 */
reservedFunctions.on = function(target, event, listener, id) {
	if(acceptableEvents.includes(event)) {
		this.objectData.get(target).listeners.push([event, listener, id]);
	}
	else {
		throw new Error(`${event} is not a valid event. valid events are ${acceptableEvents.join(',')}`);
	}
}

/**
 * removes a listener from an object by an identifier (can have multiple listeners with the same ID)
 * @param {Object} target
 * @param {String} id - the listener(s) identifier
 */
reservedFunctions.removeListener = function(target, id) {
	let listeners = this.objectData.get(target).listeners;
	for(let i = listeners.length - 1; i >= 0; i--) {
		if(listeners[i][2] === id) {
			listeners.splice(i, 1);
		}
	}
}

/**
 * removing all listeners of an object
 * @param {Object} target
 */
reservedFunctions.removeAllListeners = function(target) {
	this.objectData.get(target).listeners = [];
}

/**
 * the following functions (getOriginalTarget, getProxserveInstance) seem silly because they could have been written directly
 * on the handler's get() method but it's here as part of the convention of exposing proxy-"inherited"-methods
 */
/**
 * get original target that is behind the proxy.
 * @param {Object} target
 */
reservedFunctions.getOriginalTarget = function(target) {
	return target;
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
	let typeofobj = realtypeof(obj);
	switch(typeofobj) {
		case 'Object': return `.${property}`;
		case 'Array': return `[${property}]`;
		default: console.warn(`Not Implemented (type of '${typeofobj}')`); return property;
	}
}

/**
 * 
 * @param {Object} target 
 * @param {String} path 
 * @param {*} oldValue 
 * @param {*} value 
 * @param {String} [changeType]
 */
function add2emitQueue(target, path, oldValue, value, changeType) {
	if(typeof changeType === 'undefined') {
		if(oldValue === value) return; //no new change was made

		if(value === undefined) changeType = 'delete';
		else if(oldValue === undefined) changeType = 'create';
		else changeType = 'update';
	}

	let data = this.objectData.get(target);
	
	if(data.status === statuses[1]) { //stopped
		return;
	}

	if(data.listeners.length > 0) {
		let change = {
			'path': path, 'value': value, 'oldValue': oldValue, 'type': changeType
		};
		data.eventPool.push(change);

		if(this.delay <= 0) {
			emit.call(this, target); //emit immediately
		}
		else if(data.eventPool.length === 1) {
			setTimeout(emit.bind(this), this.delay, target); //initiate timeout once, when starting to accumulate events
		}
	}
	
	path = `${data.pathProperty}${path}`; //get path ready for next iteratin
	data = Object.getPrototypeOf(data);
	if(data !== Object.prototype) {
		add2emitQueue.call(this, data.target, path, oldValue, value, changeType);
	}
}

function emit(target) {
	let data = this.objectData.get(target);

	for(let change of data.eventPool) { //FIFO - first event in, first event out
		for(let listener of data.listeners) { //listener = [event, function]
			if(listener[0] === change.type) { //will invoke create/update/delete listeners one by one.
				listener[1].call(data.proxy, change);
			}
		}
	}

	for(let listener of data.listeners) {
		if(listener[0] === acceptableEvents[0]) { //change
			listener[1].call(data.proxy, data.eventPool); //on(change) is always called with an array of one or more changes
		}
	}

	data.eventPool = []; //empty the event pool
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
		this.objectData = new WeakMap();
		this.proxyData = new WeakMap();

		return this.createProxy(target, null, '', '');
	}

	/**
	 * create a new proxy object from a target object
	 * @param {Object|Array} target
	 * @param {Object|Array} parent
	 * @param {String} path
	 * @param {String} currentProperty
	 */
	createProxy(target, parent, path, currentProperty) {
		let currentPathProperty = (currentProperty === '') ? '' : property2path(target, currentProperty);

		let typeoftarget = realtypeof(target);

		if(acceptableTypes.includes(typeoftarget)) {
			let revocable = Proxy.revocable(target, {
				get: (target, property, receiver) => {
					//can access a function (or its synonym) if their keywords isn't used
					if(reservedFunctionsNames.includes(property) && typeof target[property] === 'undefined') {
						return reservedFunctions[property].bind(this, target);
					}
					else {
						let data = this.objectData.get(target[property]);
						return (data !== undefined) ? data.proxy : target[property];
					}
				},
			
				set: (target, property, value, receiver) => {
					let data = this.objectData.get(target);
					if(data.status === statuses[2]) { //blocked from changing values
						console.error(`can't change value of property '${property}'. object is blocked.`);
						return true;
					}
					else if(data.status === statuses[3]) {
						//if proxy is deleted from tree but user keeps accessing it then it means he saved a reference and is now using it as a regular object
						target[property] = value;
						return true;
					}

					let typeofvalue = realtypeof(value);
					if(acceptableTypes.includes(typeofvalue)) {
						this.createProxy(value, target, `${path}${currentPathProperty}`, property); //if trying to add a new value which is an object then make it a proxy
					}

					let oldValue = data.proxy[property];

					if(this.strict && this.proxyData.has(oldValue)) { //a proxy has been detached from the tree
						Proxserve.destroy(oldValue);
					}

					let newValue = value;
					if(!this.emitReference) { //also prevents emitting proxies
						newValue = simpleClone(value);
						oldValue = simpleClone(target[property]);
					}

					target[property] = value; //assign new value
					add2emitQueue.call(this, target, property2path(target, property), oldValue, newValue);
					return true;
				},

				deleteProperty: (target, property) => {
					let data = this.objectData.get(target);
					if(data.status === statuses[2]) { //blocked from changing values
						console.error(`can't delete property '${property}'. object is blocked.`);
						return true;
					}

					if(property in target) {
						let oldValue = data.proxy[property];
						if(this.strict) {
							Proxserve.destroy(oldValue);
						}

						let propertyData = this.objectData.get(target[property]);
						if(propertyData) {
							propertyData.status = statuses[3]; //deleted
						}

						if(!this.emitReference) {
							oldValue = simpleClone(target[property]); //also prevents emitting proxies
						}

						delete target[property]; //actual delete
						add2emitQueue.call(this, target, property2path(target, property), oldValue, undefined, 'delete');
						return true;
					}
					else {
						return true; //do nothing because there's nothing to delete
					}
				}
			});

			let data;
			if(parent === null) { //dealing with root object
				data = {
					'status': statuses[0],
					'pathProperty': ''
				};
			}
			else {
				//inherit from parent
				data = Object.create(this.objectData.get(parent));
				data.pathProperty = property2path(parent, currentProperty);
			}
			//overwrite properties of its own
			Object.assign(data, {
				'target': target,
				'proxy': revocable.proxy,
				'revoke': revocable.revoke,
				'path': path,
				'property': currentProperty,
				'listeners': [],
				'eventPool': []
			});


			//save important data regarding the proxy and original (raw) object
			this.objectData.set(target, data);
			this.proxyData.set(revocable.proxy, data);

			if(typeoftarget === 'Object') {
				let keys = Object.keys(target);
				for(let key of keys) {
					let typeofproperty = realtypeof(target[key]);
					if(acceptableTypes.includes(typeofproperty)) {
						this.createProxy(target[key], target, `${path}${currentPathProperty}`, key); //recursively make child objects also proxies
					}
				}
			}
			else if(typeoftarget === 'Array') {
				for(let i = 0; i < target.length; i++) {
					let typeofproperty = realtypeof(target[i]);
					if(acceptableTypes.includes(typeofproperty)) {
						this.createProxy(target[i], target, `${path}${currentPathProperty}`, i); //recursively make child objects also proxies
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

		let data = self.proxyData.get(proxy);
		if(data) {
			let typeofproxy = realtypeof(proxy);
			if(acceptableTypes.includes(typeofproxy)) {
				if(typeofproxy === 'Object') {
					let keys = Object.keys(proxy);
					for(let key of keys) {
						let typeofproperty = realtypeof(proxy[key]);
						if(acceptableTypes.includes(typeofproperty)) {
							Proxserve.destroy(proxy[key]);
						}
					}
				}
				else if(typeofproxy === 'Array') {
					for(let i = proxy.length - 1; i >= 0; i--) {
						let typeofproperty = realtypeof(proxy[i]);
						if(acceptableTypes.includes(typeofproperty)) {
							Proxserve.destroy(proxy[i]);
						}
					}
				}
				else {
					console.warn('Not Implemented');
				}

				setTimeout(function() {
					data.revoke();
				}, self.delay + 1000);
			}
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
	 * get the target matching the path from object
	 * @param {Proxy|Object} obj 
	 * @param {String} path 
	 */
	static getPathTarget(obj, path) {
		let segments = Proxserve.splitPath(path);
		let i;
		for(i = 0; i <= segments.length - 2; i++) { //iterate until one before last property because they all must exist
			obj = obj[segments[i]];
			if(typeof obj === 'undefined') {
				throw new Error('Invalid path was given');
			}
		}
		return obj[segments[i]]; //return last property. it can be undefined
	}
}
})();

try { module.exports = exports = Proxserve; } catch (err) {};