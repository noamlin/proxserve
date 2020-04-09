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

let acceptableTypes = ['Object', 'Array']; //acceptable types to be proxied
let objectsDetails = new WeakMap();

return class Proxserve {
	constructor(target) {
		let parent = null, path = '';
		if(arguments.length > 1) {
			parent = arguments[1];
			path = arguments[2];
		}

		let typeoftarget = realtypeof(target);

		if(acceptableTypes.includes(typeoftarget)) {
			let revocable = Proxy.revocable(target, {
				get: function(target, property, receiver) {
					console.log(objectsDetails.get(target));
					return target[property];
				},
			
				set: function(target, property, value, receiver) {
					let typeofvalue = realtypeof(value);
					if(acceptableTypes.includes(typeofvalue)) {
						console.log(value);
						value = new Proxserve(value, target, `${path}.${property}`);
					}
					target[property] = value;
					return true;
				}
			});

			let details = {
				'parent': parent,
				'path': path,
				'proxy': revocable.proxy,
				'revoke': revocable.revoke
			};
			objectsDetails.set(target, details);

			if(typeoftarget === 'Object') {
				let keys = Object.keys(target);
				for(let key of keys) {
					let typeofproperty = realtypeof(target[key]);
					if(acceptableTypes.includes(typeofproperty)) {
						target[key] = new Proxserve(target[key], target, `${path}.${key}`);
					}
				}
			}
			else if(typeoftarget === 'Array') {
				for(let i = 0; i < target.length; i++) {
					let typeofproperty = realtypeof(target[i]);
					if(acceptableTypes.includes(typeofproperty)) {
						target[i] = new Proxserve(target[i], target, `${path}.${i}`);
					}
				}
			}

			return revocable.proxy;
		}
		else {
			throw new Error('Must observe an '+acceptableTypes.join('/'));
		}
	}
}
})();

try { module.exports = exports = Proxserve; } catch (err) {};