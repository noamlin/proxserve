/**
 * Copyright 2020 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Complex unit tests. CPU heavy.
 */
"use strict"

const Proxserve = require('../index.js');
const util = require('util');
const { cloneDeep } = require('lodash');

//test if proxy's internal [[handler]] is revoked. according to http://www.ecma-international.org/ecma-262/6.0/#sec-proxycreate
function isRevoked(value) {
	try {
		new Proxy(value, value); //instantiating with revoked-proxy throws an error
		return false;
	} catch(err) {
		return Object(value) === value; //check if value was an object at all. only revoked proxy will reach here and return true
	}
}

var consoleFuncs = { log: console.log, warn: console.warn, error: console.error };
function silentConsole() {
	console.log = console.warn = console.error = function() { };
}
function wakeConsole() {
	console.log = consoleFuncs.log;
	console.warn = consoleFuncs.warn;
	console.error = consoleFuncs.error;
}

function deepCountObjects(obj) {
	let numChildObjects = 0;

	if(Array.isArray(obj)) {
		numChildObjects++;
		for(let i = 0; i < obj.length; i++) {
			if(typeof obj[i] === 'object') {
				numChildObjects += deepCountObjects(obj[i]);
			}
		}
	}
	else if(typeof obj === 'object') {
		numChildObjects++;
		let keys = Object.keys(obj);
		for(let key of keys) {
			if(typeof obj[key] === 'object') {
				numChildObjects += deepCountObjects(obj[key]);
			}
		}
	}

	return numChildObjects;
}

const testObject = {
	level1_1: {
		arr1: [0,1,2]
	},
	level1_2: {
		level2_1: {
			level3_1: {
				arr2: [
					0,
					1,
					[
						6,
						7,
						[
							14,
							{ deep: { deeper: 'abc' } },
							16
						],
						9
					],
					3,
					4
				]
			}
		}
	}
};

test('1. Destroy proxy and sub-proxies', (done) => {
	let proxy = new Proxserve(cloneDeep(testObject), {delay:-950}); //hack to decrease the 1000ms delay of destroy
	Proxserve.destroy(proxy);
	expect(isRevoked(proxy)).toBe(false); //will live for 50 ms (1000 minus 950)
	setTimeout(() => {
		expect(isRevoked(proxy)).toBe(true);
		part2();
	}, 100);

	function part2() {
		proxy = new Proxserve(cloneDeep(testObject), {delay:-950});
		let reference2level3 = proxy.level1_2.level2_1.level3_1;
		let reference2arr2 = reference2level3.arr2;

		let level1_2 = proxy.level1_2; //reference to proxy
		let level1_2_target = proxy.level1_2.getOriginalTarget();
		Proxserve.destroy(level1_2);
		expect(isRevoked(proxy.level1_2)).toBe(false); //will live for 1 more second

		setTimeout(() => {
			expect(isRevoked(proxy)).toBe(false);
			expect(isRevoked(level1_2)).toBe(true); //proxy was revoked
			expect(proxy.level1_2 === level1_2_target).toBe(true); //getting property of destroyed proxy will give the original target
			expect(isRevoked(reference2level3)).toBe(true);
			expect(isRevoked(reference2arr2)).toBe(true);
			part3();
		}, 100);
	}

	function part3() {
		proxy = new Proxserve(cloneDeep(testObject), {delay:-950, strict: true});
		let reference2level3 = proxy.level1_2.level2_1.level3_1;
		let reference2arr2 = reference2level3.arr2;
		proxy.level1_2 = 5; //change from object to a primitive

		let reference2arr1 = proxy.level1_1.arr1;
		delete proxy.level1_1.arr1; //delete an array

		setTimeout(() => {
			expect(isRevoked(reference2level3)).toBe(true);
			expect(isRevoked(reference2arr2)).toBe(true);
			expect(typeof proxy.level1_1.arr1).toBe('undefined');
			expect(isRevoked(reference2arr1)).toBe(true);
			part4();
		}, 100);
	}

	function part4() {
		let proxy = new Proxserve({arr1: []}, {delay:-950, strict: true});
		let o1 = proxy.arr1;
		proxy.arr1[0] = {a:'a'};
		let o2 = proxy.arr1[0];
		proxy.arr1[1] = {b:'b'};
		let o3 = proxy.arr1[1];
		proxy.arr1 = [0, 1]; //cause a destroy of the array and its child objects
		let o4 = proxy.arr1;
		proxy.arr1 = [{}, {}]; //immediately cause another destroy of the new array and create child objects
		let o5 = proxy.arr1;
		let o6 = proxy.arr1[0];
		let o7 = proxy.arr1[1];
		proxy.arr1 = [null, null]; //immediately cause another destroy of the new-new array with child NULL objects
		let o8 = proxy.arr1;
		proxy.arr1 = 3; //immediately completely destroy the new-new-new array

		setTimeout(() => {
			expect(isRevoked(o1)).toBe(true);
			expect(isRevoked(o2)).toBe(true);
			expect(isRevoked(o3)).toBe(true);
			expect(isRevoked(o4)).toBe(true);
			expect(isRevoked(o5)).toBe(true);
			expect(isRevoked(o6)).toBe(true);
			expect(isRevoked(o7)).toBe(true);
			expect(isRevoked(o8)).toBe(true);
			done();
		}, 100);
	}
});

test('2. Dont revoke sub-proxies that are still in use in the main proxy after a deletion', (done) => {
	let proxy = new Proxserve({
		sub_obj: {
			sub_arr: [{a:'a'}, {b:'b'}, {c:'c'}, {d:'d'}]
		}
	}, {delay:-950}); //hack to decrease the 1000ms delay of destroy

	let a = proxy.sub_obj.sub_arr[0];
	let b = proxy.sub_obj.sub_arr[1];
	let c = proxy.sub_obj.sub_arr[2], cTarget = c.getOriginalTarget();
	let d = proxy.sub_obj.sub_arr[3], dTarget = d.getOriginalTarget();

	expect(isRevoked(proxy.sub_obj.sub_arr[2])).toBe(false);
	
	//will delete cell at index 1 and then copy 2 to 1 and move 3 to 2 and then delete cell index 3 and update length
	proxy.sub_obj.sub_arr.splice(1, 1);
	
	setTimeout(() => {
		expect(a === proxy.sub_obj.sub_arr[0]).toBe(true); //wasn't touched
		expect(isRevoked(a)).toBe(false);

		expect(isRevoked(b)).toBe(true); //was deleted

		expect(cTarget === proxy.sub_obj.sub_arr[1].getOriginalTarget()).toBe(true); //same target
		expect(c === proxy.sub_obj.sub_arr[1]).toBe(false); //but different path thus different proxy
		expect(isRevoked(c)).toBe(true);

		expect(dTarget === proxy.sub_obj.sub_arr[2].getOriginalTarget()).toBe(true); //same target
		expect(d === proxy.sub_obj.sub_arr[2]).toBe(false); //but different path thus different proxy
		expect(isRevoked(c)).toBe(true);

		part2();
	}, 100);

	function part2() {
		delete proxy.sub_obj.sub_arr[0];
		expect(isRevoked(a)).toBe(false); //will be destroyed async later
		setTimeout(() => {
			expect(isRevoked(a)).toBe(true);
			part3();
		}, 100);
	}

	function part3() {
		proxy.arr = [{a:'a'}, {b:'b'}, {c:'c'}, {d:'d'}];
		let instance = proxy.getProxserveInstance();
		let a = proxy.arr[0], aTarget = proxy.arr[0].getOriginalTarget();
		let b = proxy.arr[1], bTarget = proxy.arr[1].getOriginalTarget();
		let c = proxy.arr[2], cTarget = proxy.arr[2].getOriginalTarget();
		let d = proxy.arr[3], dTarget = proxy.arr[3].getOriginalTarget();

		let aData = instance.path2data.get('.arr[0]');
		let bData = instance.path2data.get('.arr[1]');
		let dData = instance.path2data.get('.arr[3]');
		expect(aData.proxy === a).toBe(true);
		expect(aData.target === aTarget).toBe(true);

		proxy.arr.splice(1,2); //delete 'b' and 'c', then move 'd' to [1]
		delete proxy.arr[0];
		proxy.arr[3] = [];

		aData = instance.path2data.get('.arr[0]'); //should still be there, until revocation
		let new_bData = instance.path2data.get('.arr[1]'); //should be replaced (overwritten) immediately
		let cData = instance.path2data.get('.arr[2]'); //should still be there, until revocation
		let new_dData = instance.path2data.get('.arr[3]'); //should be replaced (overwritten) immediately

		expect(typeof aData).toBe('object');
		expect(bData === new_bData).toBe(false);
		expect(typeof cData).toBe('object');
		expect(dData === new_dData).toBe(false);

		setTimeout(() => {
			aData = instance.path2data.get('.arr[0]');
			cData = instance.path2data.get('.arr[2]');
			expect(aData).toBe(undefined);
			expect(cData).toBe(undefined);
			done();
		}, 100);
	}
});

test('3. Keep using proxies after deletion/detachment in non-strict instantiation', (done) => {
	let proxy = new Proxserve(cloneDeep(testObject), {delay:-1000, strict:false});
	let level1_1 = proxy.level1_1;
	let arr2 = proxy.level1_2.level2_1.level3_1.arr2;
	proxy.level1_1 = 5;
	delete proxy.level1_2.level2_1.level3_1;
	setTimeout(() => {
		expect(isRevoked(level1_1)).toBe(false);
		expect(level1_1).toEqual(testObject.level1_1);
		expect(isRevoked(arr2)).toBe(false);
		expect(arr2).toEqual(testObject.level1_2.level2_1.level3_1.arr2);
		done();
	}, 5);
});

test('4. Find recursively and handle proxies inside objects inserted to main proxy', () => {
	let proxy = new Proxserve({
		arr: [{a:'a'}, {b:'b'}, {c:'c'}, {d:'d'}]
	}, {delay:-950}); //hack to decrease the 1000ms delay of destroy

	let newObj = {
		subObj_1: proxy.arr[0],
		subObj_2: proxy.arr[1],
		subArr: [proxy.arr[2], [proxy.arr[3]]]
	};

	function getPath(subProxy) {
		let instance = subProxy.getProxserveInstance();
		let data = instance.proxy2data.get(subProxy);
		return `${data.parentPath}${data.propertyPath}`;
	}

	expect(util.types.isProxy(newObj)).toBe(false); //regular object (for now)
	expect(util.types.isProxy(newObj.subObj_1)).toBe(true);
	expect(getPath(newObj.subObj_1)).toBe('.arr[0]');
	expect(util.types.isProxy(newObj.subObj_2)).toBe(true);
	expect(getPath(newObj.subObj_2)).toBe('.arr[1]');
	expect(util.types.isProxy(newObj.subArr)).toBe(false);
	expect(util.types.isProxy(newObj.subArr[0])).toBe(true);
	expect(getPath(newObj.subArr[0])).toBe('.arr[2]');
	expect(util.types.isProxy(newObj.subArr[1])).toBe(false);
	expect(util.types.isProxy(newObj.subArr[1][0])).toBe(true);
	expect(getPath(newObj.subArr[1][0])).toBe('.arr[3]');

	proxy.newObj = newObj;

	expect(util.types.isProxy(proxy.newObj)).toBe(true);

	expect(util.types.isProxy(newObj.subObj_1)).toBe(false); //unproxified
	expect(util.types.isProxy(proxy.newObj.subObj_1)).toBe(true); //proxified again
	expect(getPath(proxy.arr[0])).toBe('.arr[0]');
	expect(getPath(proxy.newObj.subObj_1)).toBe('.newObj.subObj_1');
	expect(proxy.newObj.subObj_1.getOriginalTarget() === proxy.arr[0].getOriginalTarget()).toBe(true);

	expect(util.types.isProxy(newObj.subObj_2)).toBe(false);
	expect(util.types.isProxy(proxy.newObj.subObj_2)).toBe(true);
	expect(getPath(proxy.arr[1])).toBe('.arr[1]');
	expect(getPath(proxy.newObj.subObj_2)).toBe('.newObj.subObj_2');
	expect(proxy.newObj.subObj_2.getOriginalTarget() === proxy.arr[1].getOriginalTarget()).toBe(true);

	expect(util.types.isProxy(newObj.subArr)).toBe(false);
	expect(util.types.isProxy(proxy.newObj.subArr)).toBe(true);

	expect(getPath(proxy.arr[2])).toBe('.arr[2]');
	expect(getPath(proxy.newObj.subArr[0])).toBe('.newObj.subArr[0]');
	expect(proxy.newObj.subArr[0].getOriginalTarget() === proxy.arr[2].getOriginalTarget()).toBe(true);

	expect(util.types.isProxy(newObj.subArr[1])).toBe(false);
	expect(util.types.isProxy(proxy.newObj.subArr[1])).toBe(true);

	expect(getPath(proxy.arr[3])).toBe('.arr[3]');
	expect(getPath(proxy.newObj.subArr[1][0])).toBe('.newObj.subArr[1][0]');
	expect(proxy.newObj.subArr[1][0].getOriginalTarget() === proxy.arr[3].getOriginalTarget()).toBe(true);
});

test('5. Observe on referenced changes and cloned changes', (done) => {
	let proxy = new Proxserve(cloneDeep(testObject), {emitReference: false});
	proxy.level1_1.on('change', function(changes) {
		expect(changes.length).toEqual(3);
		expect(changes[0]).toEqual({ oldValue: [0,1,2], value: {a:'a'}, type: 'update', path: '.arr1' });
		expect(changes[1]).toEqual({ oldValue: undefined, value: 'b', type: 'create', path: '.arr1.b' });
		expect(changes[2]).toEqual({ oldValue: {a:'a', b:'b'}, value: undefined, type: 'delete', path: '.arr1' });
		setImmediate(part2);
	});
	proxy.level1_1.arr1 = {a:'a'};
	proxy.level1_1.arr1.b = 'b';
	let tmp = proxy.level1_1.arr1;
	delete proxy.level1_1.arr1;
	tmp.a = tmp.b = 'cc';

	function part2() {
		proxy = new Proxserve(cloneDeep(testObject), {emitReference: true});
		proxy.level1_1.on('change', function(changes) {
			expect(changes.length).toEqual(3);
			expect(changes[0]).toEqual({ oldValue: [0,1,2], value: {a:'cc', b:'cc'}, type: 'update', path: '.arr1' });
			expect(changes[1]).toEqual({ oldValue: undefined, value: 'b', type: 'create', path: '.arr1.b' });
			expect(changes[2]).toEqual({ oldValue: {a:'cc', b:'cc'}, value: undefined, type: 'delete', path: '.arr1' });
			setImmediate(done);
		});
		proxy.level1_1.arr1 = {a:'a'};
		proxy.level1_1.arr1.b = 'b';
		let tmp = proxy.level1_1.arr1;
		delete proxy.level1_1.arr1;
		tmp.a = tmp.b = 'cc';
	}
});

//benchmark on a CPU with baseclock of 3.6 GHz is around 0.5s
test('6. Proxserve 50,000 objects in less than 1 second', () => {
	let objectsInTest = deepCountObjects(testObject);
	let repeatitions = Math.ceil(50000 / objectsInTest);
	let objs = [];
	let proxies = [];

	for(let i=0; i < repeatitions; i++) {
		objs.push(cloneDeep(testObject)); //cloning should not be counted against proxserve speed
	}

	let start = Date.now();
	for(let i=0; i < repeatitions; i++) {
		proxies.push(new Proxserve(objs[i]));
	}
	let end = Date.now();
	
	expect(end - start).toBeLessThan(1000);
	console.log(`Proxserve 50,000 objects: ${end - start}`);
});

//benchmark on a CPU with baseclock of 3.6 GHz is around 0.9s
test('7. Destroy 50,000 proxserves in less than 1.5 seconds', (done) => {
	let objectsInTest = deepCountObjects(testObject);
	let repeatitions = Math.ceil(50000 / objectsInTest);
	let proxies = [];

	for(let i=0; i < repeatitions; i++) {
		proxies.push(new Proxserve(cloneDeep(testObject), {delay:-1000})); //hack to negate the 1000ms delay of destroy
	}

	let start = Date.now();
	for(let i=0; i < repeatitions; i++) {
		Proxserve.destroy(proxies[i]);
	}
	setTimeout(() => {
		let end = Date.now();
		proxies;
		expect(end - start - 20).toBeLessThan(1500);
		console.log(`Destroy 50,000 proxserves: ${end - start - 20}`);
		done();
	}, 20);
});

test('8. Comprehensive events of changes', (done) => {
	let proxy = new Proxserve(cloneDeep(testObject), {emitReference: false});
	proxy.on('create', function(change) {
		expect(this).toBe(proxy);
		expect(change.oldValue).toBe(undefined);
		expect(change.value).toBe(17);
		expect(change.path).toBe('.level1_2.level2_1.level3_1.arr2[2][2][1].deep.new');
		expect(change.type).toBe('create');
	});
	proxy.level1_2.on('create', function(change) {
		expect(this).toBe(proxy.level1_2);
		expect(change.oldValue).toBe(undefined);
		expect(change.value).toBe(17);
		expect(change.path).toBe('.level2_1.level3_1.arr2[2][2][1].deep.new');
		expect(change.type).toBe('create');
	});
	proxy.level1_2.level2_1.level3_1.arr2[2].on('create', function(change) {
		expect(this).toBe(proxy.level1_2.level2_1.level3_1.arr2[2]);
		expect(change.oldValue).toBe(undefined);
		expect(change.value).toBe(17);
		expect(change.path).toBe('[2][1].deep.new');
		expect(change.type).toBe('create');
	});
	proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.on('create', function(change) {
		expect(this).toBe(proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep);
		expect(change.oldValue).toBe(undefined);
		expect(change.value).toBe(17);
		expect(change.path).toBe('.new');
		expect(change.type).toBe('create');
		setImmediate(part2);
	});
	proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.new = 17;
	
	function part2() {
		proxy.removeAllListeners();
		proxy.on('update', function(change) {
			expect(change.oldValue).toBe(17);
			expect(change.value).toBe(21);
			expect(change.path).toBe('.level1_2.level2_1.level3_1.arr2[2][2][1].deep.new');
			expect(change.type).toBe('update');
		});
		proxy.level1_2.removeAllListeners();
		proxy.level1_2.on('update', function(change) {
			expect(change.oldValue).toBe(17);
			expect(change.value).toBe(21);
			expect(change.path).toBe('.level2_1.level3_1.arr2[2][2][1].deep.new');
			expect(change.type).toBe('update');
		});
		proxy.level1_2.level2_1.level3_1.arr2[2].removeAllListeners();
		proxy.level1_2.level2_1.level3_1.arr2[2].on('update', function(change) {
			expect(change.oldValue).toBe(17);
			expect(change.value).toBe(21);
			expect(change.path).toBe('[2][1].deep.new');
			expect(change.type).toBe('update');
		});
		proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.removeAllListeners();
		proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.on('update', function(change) {
			expect(change.oldValue).toBe(17);
			expect(change.value).toBe(21);
			expect(change.path).toBe('.new');
			expect(change.type).toBe('update');
			setImmediate(part3);
		});
		proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.new = 21;
	}

	function part3() {
		proxy.removeAllListeners();
		proxy.on('delete', function(change) {
			expect(change.oldValue).toBe(21);
			expect(change.value).toBe(undefined);
			expect(change.path).toBe('.level1_2.level2_1.level3_1.arr2[2][2][1].deep.new');
			expect(change.type).toBe('delete');
		});
		proxy.level1_2.removeAllListeners();
		proxy.level1_2.on('delete', function(change) {
			expect(change.oldValue).toBe(21);
			expect(change.value).toBe(undefined);
			expect(change.path).toBe('.level2_1.level3_1.arr2[2][2][1].deep.new');
			expect(change.type).toBe('delete');
		});
		proxy.level1_2.level2_1.level3_1.arr2[2].removeAllListeners();
		proxy.level1_2.level2_1.level3_1.arr2[2].on('delete', function(change) {
			expect(change.oldValue).toBe(21);
			expect(change.value).toBe(undefined);
			expect(change.path).toBe('[2][1].deep.new');
			expect(change.type).toBe('delete');
		});
		proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.removeAllListeners();
		proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.on('delete', function(change) {
			expect(change.oldValue).toBe(21);
			expect(change.value).toBe(undefined);
			expect(change.path).toBe('.new');
			expect(change.type).toBe('delete');
			setImmediate(part4);
		});
		delete proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.new;
	}

	function part4() {
		let oldValue = [14, { deep: { deeper: 'abc' } }, 16];

		proxy.removeAllListeners();
		proxy.on('delete', function(change) {
			expect(change.oldValue).toEqual(oldValue);
			expect(change.value).toBe(undefined);
			expect(change.path).toBe('.level1_2.level2_1.level3_1.arr2[2][2]');
			expect(change.type).toBe('delete');
		});
		proxy.level1_2.removeAllListeners();
		proxy.level1_2.on('delete', function(change) {
			expect(change.oldValue).toEqual(oldValue);
			expect(change.value).toBe(undefined);
			expect(change.path).toBe('.level2_1.level3_1.arr2[2][2]');
			expect(change.type).toBe('delete');
		});
		proxy.level1_2.level2_1.level3_1.arr2[2].removeAllListeners();
		proxy.level1_2.level2_1.level3_1.arr2[2].on('delete', function(change) {
			expect(change.oldValue).toEqual(oldValue);
			expect(change.value).toBe(undefined);
			expect(change.path).toBe('[2]');
			expect(change.type).toBe('delete');
			setImmediate(part5);
		});
		delete proxy.level1_2.level2_1.level3_1.arr2[2][2];
	}

	function part5() {
		proxy.removeAllListeners();
		proxy.level1_2.removeAllListeners();
		proxy.level1_2.level2_1.level3_1.arr2[2].removeAllListeners();

		proxy.on('change', function(changes) {
			expect(changes.length).toBe(9);
			expect(changes[0]).toEqual({ oldValue: undefined, value: {new:'new'}, type: 'create', path: '.level1_2.level2_1.level3_1.arr2[2][2]' });
			expect(changes[1]).toEqual({ oldValue: 'new', value: [0,1,2,3,4,5,6], type: 'update', path: '.level1_2.level2_1.level3_1.arr2[2][2].new' });
			expect(changes[2]).toEqual({ oldValue: 0, value: undefined, type: 'delete', path: '.level1_2.level2_1.level3_1.arr2[2][2].new[0]' });
		});
		proxy.level1_2.on('change', function(changes) {
			expect(changes.length).toBe(9);
			expect(changes[0]).toEqual({ oldValue: undefined, value: {new:'new'}, type: 'create', path: '.level2_1.level3_1.arr2[2][2]' });
			expect(changes[1]).toEqual({ oldValue: 'new', value: [0,1,2,3,4,5,6], type: 'update', path: '.level2_1.level3_1.arr2[2][2].new' });
			expect(changes[2]).toEqual({ oldValue: 0, value: undefined, type: 'delete', path: '.level2_1.level3_1.arr2[2][2].new[0]' });
		});
		proxy.level1_2.level2_1.level3_1.arr2[2].on('change', function(changes) {
			expect(changes.length).toBe(9);
			expect(changes[0]).toEqual({ oldValue: undefined, value: {new:'new'}, type: 'create', path: '[2]' });
			expect(changes[1]).toEqual({ oldValue: 'new', value: [0,1,2,3,4,5,6], type: 'update', path: '[2].new' });
			expect(changes[2]).toEqual({ oldValue: 0, value: undefined, type: 'delete', path: '[2].new[0]' });
			setTimeout(done, 1100);
		});
		proxy.level1_2.level2_1.level3_1.arr2[2][2] = { new: 'new' }; //should emit 1 create change
		proxy.level1_2.level2_1.level3_1.arr2[2][2].new = [0,1,2,3,4,5,6]; //should emit 1 update change
		delete proxy.level1_2.level2_1.level3_1.arr2[2][2].new[0]; //should emit 1 delete change
		proxy.level1_2.level2_1.level3_1.arr2[2][2].new.splice(2, 2); //should emit 6 changes - update [2][3][4] then delete [6][5] then update length
	}
});