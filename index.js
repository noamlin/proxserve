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
let objectsDetails = new WeakMap();

return class Proxserve {
	constructor(target) {
		let parent = null, path = '', currentProperty = '';
		if(arguments.length > 1) {
			parent = arguments[1]; //the parent target
			path = arguments[2]; //the path up to this target
			currentProperty = arguments[3]; //this target property name
		}

		let typeoftarget = realtypeof(target);

		if(acceptableTypes.includes(typeoftarget)) {
			let revocable = Proxy.revocable(target, {
				get: function(target, property, receiver) {
					return target[property];
				},
			
				set: function(target, property, value, receiver) {
					let typeofvalue = realtypeof(value);
					if(acceptableTypes.includes(typeofvalue)) {
						value = new Proxserve(value, target, `${path}.${currentProperty}`, property); //if trying to add a new value which is an object then make it a proxy
					}
					target[property] = value;
					return true;
				},

				deleteProperty: function(target, property) {
					if(property in target) {
						Proxserve.destroy(target[property]);
						delete target[property];
						return true;
					}
					else {
						return false;
					}
				}
			});

			let details = {
				'parent': parent,
				'path': path,
				'proxy': revocable.proxy,
				'revoke': revocable.revoke
			};
			objectsDetails.set(target, details); //save important details regarding the original (raw) object

			if(typeoftarget === 'Object') {
				let keys = Object.keys(target);
				for(let key of keys) {
					let typeofproperty = realtypeof(target[key]);
					if(acceptableTypes.includes(typeofproperty)) {
						target[key] = new Proxserve(target[key], target, `${path}.${currentProperty}`, key); //recursively make child objects also proxies
					}
				}
			}
			else if(typeoftarget === 'Array') {
				for(let i = 0; i < target.length; i++) {
					let typeofproperty = realtypeof(target[i]);
					if(acceptableTypes.includes(typeofproperty)) {
						target[i] = new Proxserve(target[i], target, `${path}.${currentProperty}`, i); //recursively make child objects also proxies
					}
				}
			}

			return revocable.proxy;
		}
		else {
			throw new Error('Must observe an '+acceptableTypes.join('/'));
		}
	}

	/**
	 * Recursively revoke proxies
	 * @param {*} target 
	 */
	static destroy(target) {
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
			objectsDetails.get(target).revoke();
			//objectsDetails.delete(target); //not necessary because it's a WeakMap so garbage collector will clean unused objects anyway
		}
	}
}
})();

try { module.exports = exports = Proxserve; } catch (err) {};