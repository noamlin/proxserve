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
let statuses = ['active', 'paused', 'stopped', 'blocked']; //statuses of proxies
let reservedFunctions = {}; //functions reserved as property names
let objectData = new WeakMap();
let proxyData = new WeakMap();

/**
 * deep extraction of proxy's target and all sub proxies targets.
 * recursively get complete objects behind proxy
 * @param {*} proxy 
 */
function getOriginalTarget(proxy) {
	if(proxyData.has(proxy)) {
		let target = proxyData.get(proxy).target;
		let typeoftarget = realtypeof(target);

		if(typeoftarget === 'Object') {
			let returnObj = {};
			let keys = Object.keys(target);
			for(let key of keys) {
				returnObj[key] = getOriginalTarget(target[key]);
			}
			return returnObj;
		}
		else if(typeoftarget === 'Array') {
			let returnArr = [];
			for(let i = 0; i < target.length; i++) {
				returnArr[i] = getOriginalTarget(target[i]);
			}
			return returnArr;
		}
		else if(typeoftarget === 'Map') {
			console.warn('Not Implemented');
			return null;
		}
	}
	else {
		return proxy; //not in proxies list so is probably a primitive
	}
}

/**
 * stop object and children from emitting change events
 */
reservedFunctions.stop = function() {
	objectData.get(this).status = statuses[2];
}

/**
 * pause object and children from emitting change events.
 * all events are accumulated and will be fired upon resume
 */
reservedFunctions.pause = function() {
	objectData.get(this).status = statuses[1];
}

/**
 * block object and children from any changes.
 * user can't set nor delete any property
 */
reservedFunctions.block = function() {
	objectData.get(this).status = statuses[3];
}

/**
 * resume default behavior of emitting change events, inherited from parent. will fire all changes since last pause
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
 * emit an event upon a change to a proxy's property
 * @param {Object|Array} target 
 * @param {String} property 
 * @param {*} oldValue 
 * @param {*} newValue 
 * @param {String} [changeType]
 */
function $emit(target, property, oldValue, newValue, changeType) {
	if(typeof changeType === 'undefined') {
		if(oldValue === newValue) {
			return; //no new change was made
		}

		if(newValue === undefined) {
			changeType = 'delete';
		}
		else if(oldValue === undefined) {
			changeType = 'create';
		}
		else {
			changeType = 'update';
		}
	}

	let path = property2path(target, property);
	let data = objectData.get(target);

	do {
		let change = {
			'path': path,
			'oldValue': oldValue,
			'value': newValue,
			'type': changeType
		};
	
		for(let item of data.listeners) { //item = [event, listener]
			if(item[0] === 'change' || item[0] === changeType) {
				item[1].call(data.target, change);
			}
		}
	
		path = `${data.property}${path}`; //get path ready for next iteratin
	} while((data = Object.getPrototypeOf(data)) !== Object.prototype);
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
		default: console.warn('Not Implemented'); return property;
	}
}

return class Proxserve {
	/**
	 * construct a new proxy from a target object
	 * @param {Object|Array} target 
	 * @param {Boolean} [delayEmits] - delay change-event emitting for a few milliseconds, letting them pile up and then fire all at once
	 * @param {Object|Array} arguments[1] - parent
	 * @param {String} arguments[2] - path
	 * @param {String} arguments[3] - current property
	 */
	constructor(target, delayEmits=true) {
		let parent = null, path = '', currentProperty = '';
		if(arguments.length > 1) {
			parent = arguments[1]; //the parent target
			path = arguments[2]; //the path up to this target
			currentProperty = property2path(parent, arguments[3]);
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
					if(objectData.get(target).status === statuses[3]) { //blocked from changing values
						console.error(`can't change value of property '${property}'. object is blocked.`);
						return true;
					}

					let typeofvalue = realtypeof(value);
					if(acceptableTypes.includes(typeofvalue)) {
						value = new Proxserve(value, target, `${path}${currentProperty}`, property); //if trying to add a new value which is an object then make it a proxy
					}
					let oldValue = getOriginalTarget(target[property]);
					target[property] = value; //assign new value

					$emit(target, property, oldValue, value);
					return true;
				},

				deleteProperty: function(target, property) {
					if(objectData.get(target).status === statuses[3]) { //blocked from changing values
						console.error(`can't delete property '${property}'. object is blocked.`);
						return true;
					}

					if(property in target) {
						let oldValue = getOriginalTarget(target[property]);
						Proxserve.destroy(target[property]);
						delete target[property]; //actual delete

						$emit(target, property, oldValue, undefined, 'delete');
						return true;
					}
					else {
						return false;
					}
				}
			});

			let data;
			if(parent === null) {
				data = {
					'target': target,
					'proxy': revocable.proxy,
					'revoke': revocable.revoke,
					'path': path,
					'property': currentProperty,
					'listeners': [],
					'status': statuses[0]
				};
			}
			else {
				//inherit from parent
				data = Object.create(objectData.get(parent));
				//overwrite properties of its own
				Object.assign(data, {
					'target': target,
					'proxy': revocable.proxy,
					'revoke': revocable.revoke,
					'path': path,
					'property': currentProperty,
					'listeners': []
				});
			}

			//save important data regarding the proxy and original (raw) object
			objectData.set(target, data);
			proxyData.set(revocable.proxy, data);

			if(typeoftarget === 'Object') {
				let keys = Object.keys(target);
				for(let key of keys) {
					let typeofproperty = realtypeof(target[key]);
					if(acceptableTypes.includes(typeofproperty)) {
						target[key] = new Proxserve(target[key], target, `${path}${currentProperty}`, key); //recursively make child objects also proxies
					}
				}
			}
			else if(typeoftarget === 'Array') {
				for(let i = 0; i < target.length; i++) {
					let typeofproperty = realtypeof(target[i]);
					if(acceptableTypes.includes(typeofproperty)) {
						target[i] = new Proxserve(target[i], target, `${path}${currentProperty}`, i); //recursively make child objects also proxies
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
	 * Recursively revoke proxies
	 * @param {*} proxy 
	 */
	static destroy(proxy) {
		let data = proxyData.get(proxy);
		let target = data.target;
		let typeoftarget = realtypeof(target);
		if(acceptableTypes.includes(typeoftarget)) {
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

			data.revoke();
		}
	}
}
})();

try { module.exports = exports = Proxserve; } catch (err) {};