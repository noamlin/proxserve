/**
 * Copyright 2020 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
"use strict"

/**
 * return a string representing the full type of the variable
 * @param {*} variable 
 * @returns {String} - Object, Array, Number, String, Boolean, Null, Undefined, BigInt, Symbol, Date ...
 */
export function realtypeof(variable) {
	let rawType = Object.prototype.toString.call(variable); //[object Object], [object Array], [object Number] ...
	return rawType.substring(8, rawType.length - 1);
}

/**
 * check if variable is a number or a string of a number
 * @param {*} variable 
 */
/*export function isNumeric(variable) {
	if(typeof variable === 'string' && variable === '') return false;
	else return !isNaN(variable);
}*/

/**
 * recursively clones objects and array
 * @param {Proxy|Object|Array} proxy 
 */
let simpleCloneSet = new WeakSet();
export function simpleClone(obj) {
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

		if(typeofobj !== 'Undefined' && typeofobj !== 'Null' && typeofobj !== 'Boolean' && typeofobj !== 'Number'
		&& typeofobj !== 'BigInt' && typeofobj !== 'String') {
			console.warn(`Can't clone a variable of type ${typeofobj}`);
		}
	}

	return cloned;
}

/**
 * splits a path to an array of properties
 * (benchmarked and is faster than regex and split())
 * @param {String} path 
 */
export function splitPath(path) {
	if(typeof path !== 'string' || path === '') {
		return [];
	}
	
	let i = 0, betweenBrackets = false, onlyDigits = false;
	//loop will skip over openning '.' or '['
	if(path[0] === '.') {
		i = 1;
	} else if(path[0] === '[') {
		i = 1;
		betweenBrackets = true;
		onlyDigits = true;
	}

	let resultsArr = [];
	let tmp='';
	for(; i < path.length; i++) {
		let char = path[i];

		if(betweenBrackets) {
			if(char === ']') {
				if(onlyDigits) resultsArr.push(parseInt(tmp, 10));
				else resultsArr.push(tmp);

				betweenBrackets = false;
				onlyDigits = false;
				tmp = '';
			}
			else {
				if(onlyDigits) {
					let code = char.charCodeAt(0);
					if(code < 48 || code > 57) { //less than '0' char or greater than '9' char
						onlyDigits = false;
					}
				}
				tmp += char;
			}
		}
		else {
			if(char === '[') {
				betweenBrackets = true;
				onlyDigits = true;
			}
			
			//check if starting a new property but avoid special case of [prop][prop]
			if(char === '.' || char === '[') {
				if(tmp !== '') {
					resultsArr.push(tmp);
					tmp = '';
				}
			}
			else {
				tmp += char;
			}
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
export function evalPath(obj, path) {
	if(path === '') {
		return { object: obj, property: undefined, value: obj };
	}

	let segments = splitPath(path);
	let i;
	for(i = 0; i <= segments.length - 2; i++) { //iterate until one before last property because they all must exist
		obj = obj[segments[i]];
		if(typeof obj === 'undefined') {
			throw new Error(`Invalid path was given - "${path}"`);
		}
	}
	return { object: obj, property: segments[i], value: obj[ segments[i] ] };
}