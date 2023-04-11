/**
 * 2023 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
"use strict"

import { SomeObject, SomeArray, VariableTypes } from './types/globals';

/**
 * return a string representing the full type of the variable
 */
export function realtypeof(variable: any): VariableTypes {
	let rawType = Object.prototype.toString.call(variable); //[object Object], [object Array], [object Number]...
	return rawType.substring(8, rawType.length - 1) as VariableTypes;
}

/**
 * check if variable is a number or a string of a number
 * @param variable 
 */
/*export function isNumeric(variable: any): boolean {
	if(typeof variable === 'string' && variable === '') {
		return false;
	}
	
	return !isNaN(variable as number);
}*/

/**
 * recursively clones objects and array
 */
const simpleCloneSet = new WeakSet();
export function simpleClone(variable: any): any {
	let typeofvar = realtypeof(variable);

	if(typeofvar === 'Object') {
		const obj = variable as SomeObject;
		simpleCloneSet.add(obj);
		const cloned = {};
		let keys = Object.keys(obj);
		for(let key of keys) {
			if(simpleCloneSet.has(obj[key])) {
				cloned[key] = obj[key];
			}
			else {
				cloned[key] = simpleClone(obj[key]);
			}
		}
		return cloned;
	}
	else if(typeofvar === 'Array') {
		const arr = variable as SomeArray;
		simpleCloneSet.add(arr);
		const cloned = [] as any[];
		for(let i = 0; i < arr.length; i++) {
			if(simpleCloneSet.has(arr[i])) {
				cloned[i] = arr[i];
			}
			else {
				cloned[i] = simpleClone(arr[i]);
			}
		}
		return cloned;
	}
	else { // hopefully a primitive
		if(typeofvar !== 'Undefined' && typeofvar !== 'Null' && typeofvar !== 'Boolean' && typeofvar !== 'Number'
		&& typeofvar !== 'BigInt' && typeofvar !== 'String') {
			console.warn(`Can't clone a variable of type ${typeofvar}`);
		}
		return variable;
	}
}

/**
 * splits a path to an array of properties
 * (benchmarked and is faster than regex and split())
 * @param path 
 */
export function splitPath(path: string): Array<string|number> {
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

	let resultsArr = [] as Array<string|number>;
	let tmp = '';
	for(; i < path.length; i++) {
		let char = path[i];

		if(betweenBrackets) {
			if(char === ']') {
				if(onlyDigits) {
					resultsArr.push(parseInt(tmp, 10));
				} else {
					resultsArr.push(tmp);
				}

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
	if(tmp !== '') {
		resultsArr.push(tmp);
	}
	return resultsArr;
}

/**
 * evaluate a long path and return the designated object and its referred property
 */
export function evalPath(obj: SomeObject, path: string): {
	object: SomeObject,
	property: string | number,
	value: any,
} {
	if(path === '') {
		return {
			object: obj,
			property: '',
			value: obj,
		};
	}

	let segments = splitPath(path);
	let i: number;
	for(i = 0; i <= segments.length - 2; i++) { // iterate until one before last property because they all must exist
		obj = obj[segments[i]];
		if(typeof obj === 'undefined') {
			throw new Error(`Invalid path was given - "${path}"`);
		}
	}
	return {
		object: obj,
		property: segments[i],
		value: obj[ segments[i] ],
	};
}