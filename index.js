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
let objectData = new WeakMap();
let proxyData = new WeakMap();

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
 */
reservedFunctions.stop = function() {
	objectData.get(this).status = statuses[1];
}

/**
 * block object and children from any changes.
 * user can't set nor delete any property
 */
reservedFunctions.block = function() {
	objectData.get(this).status = statuses[2];
}

/**
 * resume default behavior of emitting change events, inherited from parent
 * @param {Boolean} [force] - force being active regardless of parent
 */
reservedFunctions.activate = function(force=false) {
	let data = objectData.get(this);
	if(force || data.property==='') { //force activation or we are on root proxy
		data.status = statuses[0];
	}
	else {
		let data = objectData.get(this);
		delete data.status;
	}
}

/**
 * add event listener on a proxy
 * @param {String} event 
 * @param {Function} listener 
 * @param {String} [id] - identifier for removing this listener
 */
reservedFunctions.on = function(event, listener, id) {
	if(acceptableEvents.includes(event)) {
		objectData.get(this).listeners.push([event, listener, id]);
	}
	else {
		throw new Error(`${event} is not a valid event. valid events are ${acceptableEvents.join(',')}`);
	}
}

/**
 * 
 * @param {String} id - removing listener(s) from an object by an identifier
 */
reservedFunctions.removeListener = function(id) {
	let listeners = objectData.get(this).listeners;
	for(let i = listeners.length - 1; i >= 0; i--) {
		if(listeners[i][2] === id) {
			listeners.splice(i, 1);
		}
	}
}

/**
 * removing all listeners of an object
 */
reservedFunctions.removeAllListeners = function() {
	objectData.get(this).listeners = [];
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

	let data = objectData.get(target);
	
	if(data.status === statuses[1]) { //stopped
		return;
	}

	if(data.listeners.length > 0) {
		let change = {
			'path': path, 'value': value, 'oldValue': oldValue, 'type': changeType
		};
		data.eventPool.push(change);

		if(data.delay <= 0) emit(target); //emit immediately
		else if(data.eventPool.length === 1) setTimeout(emit, data.delay, target); //initiate timeout once, when starting to accumulate events
	}
	
	path = `${data.pathProperty}${path}`; //get path ready for next iteratin
	data = Object.getPrototypeOf(data);
	if(data !== Object.prototype) {
		add2emitQueue(data.target, path, oldValue, value, changeType);
	}
}

function emit(target) {
	let data = objectData.get(target);
	let onChangeListeners = [];

	for(let change of data.eventPool) { //first event in first event out
		for(let listener of data.listeners) { //listener = [event, function]
			if(listener[0] === change.type) { //will invoke create/update/delete listeners one by one.
				listener[1].call(data.proxy, change);
			}
			else if(listener[0] === acceptableEvents[0]) { //change
				onChangeListeners.push(listener);
			}
		}
	}

	for(let listener of onChangeListeners) {
		listener[1].call(data.proxy, data.eventPool); //on(change) always gets an array of one or more changes
	}

	data.eventPool = []; //empty the event pool
}

return class Proxserve {
	/**
	 * construct a new proxy from a target object
	 * @param {Object|Array} target 
	 * @param {Object} [options] 
	 * 	@property {Number} [options.delay] - delay change-event emitting in milliseconds, letting them pile up and then fire all at once
	 * 	@property {Boolean} [options.strict] - should destroy detached child-objects or deleted properties automatically
	 * 	@property {Boolean} [options.emitReference] - events emit new/old values. true: reference to original objects, false: deep clones that are created on the spot
	 * @param {Object|Array} arguments[2] - parent
	 * @param {String} arguments[3] - path
	 * @param {String} arguments[4] - current property
	 */
	constructor(target, options={}) {
		if(typeof options.delay === 'undefined') options.delay = 10;
		if(typeof options.strict === 'undefined') options.strict = true;
		if(typeof options.emitReference === 'undefined') options.emitReference = true;

		let parent = null, path = '', currentProperty = '', currentPathProperty = '';
		if(arguments.length > 2) {
			parent = arguments[2]; //the parent target
			path = arguments[3]; //the path up to this target
			currentProperty = arguments[4];
			currentPathProperty = property2path(target, currentProperty);
		}

		let typeoftarget = realtypeof(target);

		if(acceptableTypes.includes(typeoftarget)) {
			let revocable = Proxy.revocable(target, {
				get: function(target, property, receiver) {
					//can access a function (or its synonym) if their keywords isn't used
					if(reservedFunctionsNames.includes(property) && typeof target[property] === 'undefined') {
						return reservedFunctions[property].bind(target);
					}
					else {
						return target[property];
					}
				},
			
				set: function(target, property, value, receiver) {
					let data = objectData.get(target);
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
						value = new Proxserve(value, options, target, `${path}${currentPathProperty}`, property); //if trying to add a new value which is an object then make it a proxy
					}

					let oldValue = target[property];
					if(!options.emitReference) {
						oldValue = simpleClone(target[property]); //also prevents emitting proxies
					}
					target[property] = value; //assign new value

					if(options.strict && proxyData.has(oldValue)) { //a proxy has been detached from the tree
						Proxserve.destroy(oldValue);
					}
					let newValue = value;
					if(!options.emitReference) {
						newValue = simpleClone(value); //also prevents emitting proxies
					}
					add2emitQueue(target, property2path(target, property), oldValue, newValue);
					return true;
				},

				deleteProperty: function(target, property) {
					if(objectData.get(target).status === statuses[2]) { //blocked from changing values
						console.error(`can't delete property '${property}'. object is blocked.`);
						return true;
					}

					if(property in target) {
						let oldValue = target[property];
						if(!options.emitReference) {
							oldValue = simpleClone(target[property]); //also prevents emitting proxies
						}
						if(options.strict) {
							Proxserve.destroy(target[property]);
						}

						let propertyData = proxyData.get(target[property]);
						if(propertyData) {
							propertyData.status = statuses[3]; //deleted
						}

						delete target[property]; //actual delete

						add2emitQueue(target, property2path(target, property), oldValue, undefined, 'delete');
						return true;
					}
					else {
						return false;
					}
				}
			});

			let data;
			if(parent === null) { //dealing with root object
				data = {
					'status': statuses[0],
					'delay': options.delay,
					'pathProperty': ''
				};
			}
			else {
				//inherit from parent
				data = Object.create(objectData.get(parent));
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
			objectData.set(target, data);
			proxyData.set(revocable.proxy, data);

			if(typeoftarget === 'Object') {
				let keys = Object.keys(target);
				for(let key of keys) {
					let typeofproperty = realtypeof(target[key]);
					if(acceptableTypes.includes(typeofproperty)) {
						target[key] = new Proxserve(target[key], options, target, `${path}${currentPathProperty}`, key); //recursively make child objects also proxies
					}
				}
			}
			else if(typeoftarget === 'Array') {
				for(let i = 0; i < target.length; i++) {
					let typeofproperty = realtypeof(target[i]);
					if(acceptableTypes.includes(typeofproperty)) {
						target[i] = new Proxserve(target[i], options, target, `${path}${currentPathProperty}`, i); //recursively make child objects also proxies
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
		let data = proxyData.get(proxy);
		if(data) {
			let typeoftarget = realtypeof(data.target);
			if(acceptableTypes.includes(typeoftarget)) {
				let target = data.target;

				if(typeoftarget === 'Object') {
					let keys = Object.keys(target);
					for(let key of keys) {
						let typeofproperty = realtypeof(target[key]);
						if(acceptableTypes.includes(typeofproperty)) {
							Proxserve.destroy(target[key]);
						}
					}
				}
				else if(typeoftarget === 'Array') {
					for(let i = target.length - 1; i >= 0; i--) {
						let typeofproperty = realtypeof(target[i]);
						if(acceptableTypes.includes(typeofproperty)) {
							Proxserve.destroy(target[i]);
						}
					}
				}
				else {
					console.warn('Not Implemented');
				}

				setTimeout(function() {
					data.revoke();
				}, data.delay + 1000);
			}
		}
	}

	static splitPath(path) {
		if(typeof path !== 'string' || path.length < 2) {
			return [''];
		}
		var resultsArr = [];
		var tmp='';
		for(let i=1; i < path.length; i++) { //i=1 and skip over '.' or '[']
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
}
})();

try { module.exports = exports = Proxserve; } catch (err) {};