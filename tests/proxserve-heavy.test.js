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

const Proxserve = require('../dist/proxserve.js');
const util = require('util');
const { cloneDeep } = require('lodash');

var ND = Symbol.for('proxserve_node_data');
var NID = Symbol.for('proxserve_node_inherited_data');

/**
 * 
 * @param {Object} objects - the "dataNode[ND].objects". expected to be { target: *, proxy: undefined, isDeleted: true }
 * @param {Proxy} proxy - the original proxy object (because the reference inside "objects" got deleted)
 */
function isRevoked(objects, proxy) {
	if(objects.isDeleted) {
		try {
			delete proxy.__some_test;
		} catch(err) {
			return true;
		}
	}

	return false;
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
	let proxy = new Proxserve(cloneDeep(testObject), { debug: { destroyDelay: 10 } }); //hack to decrease the 1000ms delay of destroy
	let proxy_objects = proxy.getProxserveObjects();
	let proxy_original = proxy_objects.proxy;
	Proxserve.destroy(proxy);
	expect(isRevoked(proxy_objects, proxy_original)).toBe(true); //happens immediately

	proxy = new Proxserve(cloneDeep(testObject), { debug: { destroyDelay: 10 } });

	let level3_objects = proxy.level1_2.level2_1.level3_1.getProxserveObjects();
	let level3_proxy = level3_objects.proxy;

	let arr2_objects = level3_proxy.arr2.getProxserveObjects();
	let arr2_proxy = arr2_objects.proxy;

	let level1_2_objects = proxy.level1_2.getProxserveObjects();
	let level1_2_proxy = level1_2_objects.proxy;
	let level1_2_target = level1_2_objects.target;

	proxy_objects = proxy.getProxserveObjects();
	proxy_original = proxy_objects.proxy;

	Proxserve.destroy(proxy.level1_2);
	expect(isRevoked(level1_2_objects, level1_2_proxy)).toBe(true); //proxy was revoked
	expect(isRevoked(proxy_objects, proxy_original)).toBe(false);

	expect(proxy.level1_2 === level1_2_target).toBe(true); //getting property of destroyed proxy will give the original target

	expect(isRevoked(level3_objects, level3_proxy)).toBe(true);
	expect(isRevoked(arr2_objects, arr2_proxy)).toBe(true);

	proxy = new Proxserve(cloneDeep(testObject), { debug: { destroyDelay: 10 } });

	level3_objects = proxy.level1_2.level2_1.level3_1.getProxserveObjects();
	level3_proxy = level3_objects.proxy;
	
	arr2_objects = level3_proxy.arr2.getProxserveObjects();
	arr2_proxy = arr2_objects.proxy;
	
	proxy.level1_2 = 5; //change from object to a primitive

	let arr1_objects = proxy.level1_1.arr1.getProxserveObjects();
	let arr1_proxy = arr1_objects.proxy;
	delete proxy.level1_1.arr1; //delete an array
	expect(isRevoked(arr1_objects, arr1_proxy)).toBe(false); //will live for 10ms more

	setTimeout(() => {
		expect(isRevoked(level3_objects, level3_proxy)).toBe(true);
		expect(isRevoked(arr2_objects, arr2_proxy)).toBe(true);
		expect(typeof proxy.level1_1.arr1).toBe('undefined');
		expect(isRevoked(arr1_objects, arr1_proxy)).toBe(true);
		part2();
	}, 100);

	function part2() {
		let proxy = new Proxserve({arr1: []}, { debug: { destroyDelay: 10 } });
		let o1 = proxy.arr1.getProxserveObjects();
		let o1_p = o1.proxy;

		proxy.arr1[0] = {a:'a'};
		let o2 = proxy.arr1[0].getProxserveObjects();
		let o2_p = o2.proxy;

		proxy.arr1[1] = {b:'b'};
		let o3 = proxy.arr1[1].getProxserveObjects();
		let o3_p = o3.proxy;

		//cause a destroy of the array, but recursion will not destroy its child objects because they are overwritten and unreachable
		proxy.arr1 = [0, 1]; //cause a destroy of the array in 50ms
		let o4 = proxy.arr1.getProxserveObjects();
		let o4_p = o4.proxy;

		//immediately cause another destroy of the new array and create child objects which will block the previous destroy (2 lines ago)
		//from destroying child objects of the same paths
		proxy.arr1 = [{c:'c'}, {d:'d'}];
		let o5 = proxy.arr1.getProxserveObjects();
		let o5_p = o5.proxy;
		let o6 = proxy.arr1[0].getProxserveObjects();
		let o6_p = o6.proxy;
		let o7 = proxy.arr1[1].getProxserveObjects();
		let o7_p = o7.proxy;
		proxy.arr1 = [null, null]; //immediately cause another destroy of the new-new array with child NULL objects
		let o8 = proxy.arr1.getProxserveObjects();
		let o8_p = o8.proxy;
		proxy.arr1 = 3; //immediately completely destroy the new-new-new array

		setTimeout(() => {
			expect(isRevoked(o1, o1_p)).toBe(true);
			expect(isRevoked(o2, o2_p)).toBe(false);
			expect(isRevoked(o3, o3_p)).toBe(false);
			expect(isRevoked(o4, o4_p)).toBe(true);
			expect(isRevoked(o5, o5_p)).toBe(true);
			expect(isRevoked(o6, o6_p)).toBe(true);
			expect(isRevoked(o7, o7_p)).toBe(true);
			expect(isRevoked(o8, o8_p)).toBe(true);
			done();
		}, 30);
	}
});

test('2. Transfer sub-proxies between child nodes while assigning new proxies with updated paths', (done) => {
	let proxy = new Proxserve({
		sub_obj: {
			sub_arr: [{a:'a'}, {b:'b'}, {c:'c'}, {d:'d'}]
		}
	}, { debug: { destroyDelay: 10 } });

	let arr0_objects = proxy.sub_obj.sub_arr[0].getProxserveObjects();
	let arr0_proxy = arr0_objects.proxy;
	let arr1_objects = proxy.sub_obj.sub_arr[1].getProxserveObjects();
	let arr1_proxy = arr1_objects.proxy;
	let arr2_objects = proxy.sub_obj.sub_arr[2].getProxserveObjects();
	let arr2_proxy = arr2_objects.proxy;
	let arr2_target = arr2_objects.target;
	let arr3_objects = proxy.sub_obj.sub_arr[3].getProxserveObjects();
	let arr3_proxy = arr3_objects.proxy;
	let arr3_target = arr3_objects.target;

	expect(isRevoked(arr2_objects, arr2_proxy)).toBe(false);
	
	//will delete cell at index 1 and then copy 2 to 1 and move 3 to 2 and then delete cell index 3 and update length
	proxy.sub_obj.sub_arr.splice(1, 1);
	
	setTimeout(() => {
		expect(arr0_proxy === proxy.sub_obj.sub_arr[0]).toBe(true); //wasn't touched
		expect(isRevoked(arr0_objects, arr0_proxy)).toBe(false);

		expect(isRevoked(arr1_objects, arr1_proxy)).toBe(true); //was deleted

		expect(arr2_target === proxy.sub_obj.sub_arr[1].getOriginalTarget()).toBe(true); //same target
		expect(arr2_proxy === proxy.sub_obj.sub_arr[1]).toBe(false); //but different path thus different proxy
		expect(isRevoked(arr2_objects, arr2_proxy)).toBe(true);

		expect(arr3_target === proxy.sub_obj.sub_arr[2].getOriginalTarget()).toBe(true); //same target
		expect(arr3_proxy === proxy.sub_obj.sub_arr[2]).toBe(false); //but different path thus different proxy
		expect(isRevoked(arr3_objects, arr3_proxy)).toBe(true);

		part2();
	}, 100);

	function part2() {
		delete proxy.sub_obj.sub_arr[0];
		expect(isRevoked(arr0_objects, arr0_proxy)).toBe(false); //will be destroyed async later
		setTimeout(() => {
			expect(isRevoked(arr0_objects, arr0_proxy)).toBe(true);
			part3();
		}, 100);
	}

	function part3() {
		proxy.arr = [{a:'a'}, {b:'b'}, {c:'c'}, {d:'d'}];
		let arr0_o = proxy.arr[0].getProxserveObjects(), arr0_p = arr0_o.proxy, arr0_t = arr0_o.target;
		let arr1_o = proxy.arr[1].getProxserveObjects(), arr1_p = arr1_o.proxy, arr1_t = arr1_o.target;
		let arr2_o = proxy.arr[2].getProxserveObjects(), arr2_p = arr2_o.proxy, arr2_t = arr2_o.target;
		let arr3_o = proxy.arr[3].getProxserveObjects(), arr3_p = arr3_o.proxy, arr3_t = arr3_o.target;
		
		let arrNode = proxy.arr.getProxserveDataNode();
		expect(arrNode[0][ND].objects.proxy === arr0_p && arrNode[0][ND].objects.target === arr0_t).toBe(true);
		expect(arrNode[1][ND].objects.proxy === arr1_p && arrNode[1][ND].objects.target === arr1_t).toBe(true);
		expect(arrNode[2][ND].objects.proxy === arr2_p && arrNode[2][ND].objects.target === arr2_t).toBe(true);
		expect(arrNode[3][ND].objects.proxy === arr3_p && arrNode[3][ND].objects.target === arr3_t).toBe(true);

		proxy.arr.splice(1,2); //delete 'b' and 'c', then move 'd' to [1]
		delete proxy.arr[0]; //delete 'a'
		proxy.arr[3] = []; //make new object in the cell

		expect(isRevoked(arr0_o, arr0_p)).toBe(false);
		expect(isRevoked(arr1_o, arr1_p)).toBe(false);
		expect(isRevoked(arr2_o, arr2_p)).toBe(false);
		expect(isRevoked(arr3_o, arr3_p)).toBe(false);

		setTimeout(() => {
			expect(isRevoked(arr0_o, arr0_p)).toBe(true);
			expect(isRevoked(arr1_o, arr1_p)).toBe(true);
			expect(isRevoked(arr2_o, arr2_p)).toBe(true);
			expect(isRevoked(arr3_o, arr3_p)).toBe(true);
			expect(arrNode[0][ND].objects.proxy === undefined && arrNode[0][ND].objects.target === arr0_t).toBe(true);
			expect(arrNode[1][ND].objects.target === arr3_t).toBe(true);
			expect(arrNode[1][ND].objects.proxy === arr3_p).toBe(false);
			expect(arrNode[2][ND].objects.proxy === undefined && arrNode[2][ND].objects.target === arr2_t).toBe(true);
			expect(Array.isArray(arrNode[3][ND].objects.proxy) && Array.isArray(arrNode[3][ND].objects.target)).toBe(true);
			done();
		}, 100);
	}
});

test('3. Keep using proxies after deletion/detachment in non-strict instantiation', (done) => {
	let proxy = new Proxserve(cloneDeep(testObject), { strict: false, debug: { destroyDelay: 0 } });
	let level1_1_o = proxy.level1_1.getProxserveObjects(), level1_1_p = level1_1_o.proxy;
	let arr2_o = proxy.level1_2.level2_1.level3_1.arr2.getProxserveObjects(), arr2_p = arr2_o.proxy;
	proxy.level1_1 = 5;
	delete proxy.level1_2.level2_1.level3_1;
	setTimeout(() => {
		expect(isRevoked(level1_1_o, level1_1_p)).toBe(false);
		expect(level1_1_p).toEqual(testObject.level1_1);
		expect(isRevoked(arr2_o, arr2_p)).toBe(false);
		expect(arr2_p).toEqual(testObject.level1_2.level2_1.level3_1.arr2);
		done();
	}, 5);
});

test('4. Find recursively and handle proxies inside objects inserted to main proxy', () => {
	let proxy = new Proxserve({
		arr: [{a:'a'}, {b:'b'}, {c:'c'}, {d:'d'}]
	}, { debug: { destroyDelay: 0 } });

	let newObj = {
		subObj_1: proxy.arr[0],
		subObj_2: proxy.arr[1],
		subArr: [proxy.arr[2], [proxy.arr[3]]]
	};

	function getPath(proxy) {
		return proxy.getProxserveDataNode()[ND].path;
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
	let proxy = new Proxserve(cloneDeep(testObject));
	let counter = 0;
	proxy.level1_1.on('change', '.arr1', function(change) {
		counter++;
		if(counter === 1) expect(change).toEqual({ oldValue: [0,1,2], value: {a:'a'}, type: 'update', path: '' });
		else if(counter === 2) expect(change).toEqual({ oldValue: {a:'a', b:'b'}, value: undefined, type: 'delete', path: '' });
	});
	let counter2 = 0;
	proxy.level1_1.on('change', '.arr1.b', function(change) {
		counter2++;
		if(counter2 === 1) expect(change).toEqual({ oldValue: undefined, value: 'b', type: 'create', path: '' });
		else if(counter2 === 2) expect(change).toEqual({ oldValue: 'b', value: undefined, type: 'delete', path: '' });
	});
	proxy.level1_1.arr1 = {a:'a'}; //emits to 'arr1' shallow listener
	proxy.level1_1.arr1.b = 'b'; //emits to 'arr1.b' shallow listener
	let tmp = proxy.level1_1.arr1;
	delete proxy.level1_1.arr1; //emits to both 'arr1' and 'arr1.b' listeners
	tmp.a = tmp.b = 'cc'; //should not emit any more
	setImmediate(part2);

	function part2() {
		proxy = new Proxserve(cloneDeep(testObject));
		let changes = [];
		proxy.level1_1.on('change', function(change) {
			changes.push(change);
			if(changes.length === 1) expect(change.value).toEqual({a:'a'});
			if(changes.length === 2) expect(change.value).toEqual('b');
			if(changes.length === 3) expect(change.oldValue).toBe(changes[0].value); //same reference
		}, {deep:true});

		setTimeout(() => {
			expect(changes[0]).toEqual({ oldValue: [0,1,2], value: {a:'cc', b:'cc'}, type: 'update', path: '.arr1' });
			expect(changes[1]).toEqual({ oldValue: undefined, value: 'b', type: 'create', path: '.arr1.b' });
			expect(changes[2]).toEqual({ oldValue: {a:'cc', b:'cc'}, value: undefined, type: 'delete', path: '.arr1' });
			setImmediate(done);
		}, 1);
		proxy.level1_1.arr1 = {a:'a'};
		proxy.level1_1.arr1.b = 'b';
		let tmp = proxy.level1_1.arr1;
		delete proxy.level1_1.arr1;
		tmp.a = tmp.b = 'cc';
	}
});

//benchmark on a CPU with baseclock of 3.6 GHz is around 0.58s
test('6. Proxserve 50,000 objects in less than 1 second', () => {
	let objectsPerProxy = deepCountObjects(testObject);
	expect(objectsPerProxy).toBeGreaterThan(6);
	let repeatitions = Math.ceil(50000 / objectsPerProxy);
	let objs = [];

	for(let i=0; i < repeatitions; i++) {
		objs.push(cloneDeep(testObject)); //cloning should not be counted against proxserve speed
	}

	let start = Date.now();
	for(let i=0; i < repeatitions; i++) {
		new Proxserve(objs[i]);
	}
	let end = Date.now();
	
	expect(end - start).toBeLessThan(1000);
	console.log(`Proxserve 50,000 objects: ${end - start}ms`);
});

//benchmark on a CPU with baseclock of 3.6 GHz is around 0.87s
test('7. Destroy 50,000 proxserves in less than 1.5 seconds', () => {
	let objectsPerProxy = deepCountObjects(testObject);
	expect(objectsPerProxy).toBeGreaterThan(6);
	let repeatitions = Math.ceil(50000 / objectsPerProxy);
	let proxies = [];

	for(let i=0; i < repeatitions; i++) {
		proxies.push(new Proxserve(cloneDeep(testObject)));
	}

	let start = Date.now();
	for(let i=0; i < repeatitions; i++) {
		Proxserve.destroy(proxies[i]);
	}
	let end = Date.now();
	proxies;
	expect(end - start).toBeLessThan(1500);
	console.log(`Destroy 50,000 proxserves: ${end - start}ms`);
});

test('8. Comprehensive events of changes', (done) => {
	let proxy = new Proxserve(cloneDeep(testObject));
	proxy.on('create', function(change) {
		expect(this).toBe(proxy);
		expect(change.oldValue).toBe(undefined);
		expect(change.value).toBe(17);
		expect(change.path).toBe('.level1_2.level2_1.level3_1.arr2[2][2][1].deep.new');
		expect(change.type).toBe('create');
	}, {deep:true});
	proxy.level1_2.on('create', function(change) {
		expect(this).toBe(proxy.level1_2);
		expect(change.oldValue).toBe(undefined);
		expect(change.value).toBe(17);
		expect(change.path).toBe('.level2_1.level3_1.arr2[2][2][1].deep.new');
		expect(change.type).toBe('create');
	}, {deep:true});
	proxy.level1_2.level2_1.level3_1.arr2[2].on('create', function(change) {
		expect(this).toBe(proxy.level1_2.level2_1.level3_1.arr2[2]);
		expect(change.oldValue).toBe(undefined);
		expect(change.value).toBe(17);
		expect(change.path).toBe('[2][1].deep.new');
		expect(change.type).toBe('create');
	}, {deep:true});
	proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.on('create', function(change) {
		expect(this).toBe(proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep);
		expect(change.oldValue).toBe(undefined);
		expect(change.value).toBe(17);
		expect(change.path).toBe('.new');
		expect(change.type).toBe('create');
		setImmediate(part2);
	}, {deep:true});
	proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.new = 17;
	
	function part2() {
		proxy.removeAllListeners();
		proxy.on('update', function(change) {
			expect(change.oldValue).toBe(17);
			expect(change.value).toBe(21);
			expect(change.path).toBe('.level1_2.level2_1.level3_1.arr2[2][2][1].deep.new');
			expect(change.type).toBe('update');
		}, {deep:true});
		proxy.level1_2.removeAllListeners();
		proxy.level1_2.on('update', function(change) {
			expect(change.oldValue).toBe(17);
			expect(change.value).toBe(21);
			expect(change.path).toBe('.level2_1.level3_1.arr2[2][2][1].deep.new');
			expect(change.type).toBe('update');
		}, {deep:true});
		proxy.level1_2.level2_1.level3_1.arr2[2].removeAllListeners();
		proxy.level1_2.level2_1.level3_1.arr2[2].on('update', function(change) {
			expect(change.oldValue).toBe(17);
			expect(change.value).toBe(21);
			expect(change.path).toBe('[2][1].deep.new');
			expect(change.type).toBe('update');
		}, {deep:true});
		proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.removeAllListeners();
		proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.on('update', function(change) {
			expect(change.oldValue).toBe(17);
			expect(change.value).toBe(21);
			expect(change.path).toBe('.new');
			expect(change.type).toBe('update');
			setImmediate(part3);
		}, {deep:true});
		proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.new = 21;
	}

	function part3() {
		proxy.removeAllListeners();
		proxy.on('delete', function(change) {
			expect(change.oldValue).toBe(21);
			expect(change.value).toBe(undefined);
			expect(change.path).toBe('.level1_2.level2_1.level3_1.arr2[2][2][1].deep.new');
			expect(change.type).toBe('delete');
		}, {deep:true});
		proxy.level1_2.removeAllListeners();
		proxy.level1_2.on('delete', function(change) {
			expect(change.oldValue).toBe(21);
			expect(change.value).toBe(undefined);
			expect(change.path).toBe('.level2_1.level3_1.arr2[2][2][1].deep.new');
			expect(change.type).toBe('delete');
		}, {deep:true});
		proxy.level1_2.level2_1.level3_1.arr2[2].removeAllListeners();
		proxy.level1_2.level2_1.level3_1.arr2[2].on('delete', function(change) {
			expect(change.oldValue).toBe(21);
			expect(change.value).toBe(undefined);
			expect(change.path).toBe('[2][1].deep.new');
			expect(change.type).toBe('delete');
		}, {deep:true});
		proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.removeAllListeners();
		proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.on('delete', function(change) {
			expect(change.oldValue).toBe(21);
			expect(change.value).toBe(undefined);
			expect(change.path).toBe('.new');
			expect(change.type).toBe('delete');
			setImmediate(part4);
		}, {deep:true});
		delete proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.new;
	}

	function part4() {
		let oldValue = proxy.level1_2.level2_1.level3_1.arr2[2][2].getOriginalTarget();//[14, { deep: { deeper: 'abc' } }, 16];

		proxy.removeAllListeners();
		proxy.level1_2.removeAllListeners();
		proxy.level1_2.level2_1.level3_1.arr2[2].removeAllListeners();
		proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.removeAllListeners();

		proxy.on('delete', function(change) {
			expect(change.oldValue).toBe(oldValue);
			expect(change.value).toBe(undefined);
			expect(change.path).toBe('.level1_2.level2_1.level3_1.arr2[2][2]');
			expect(change.type).toBe('delete');
		}, {deep:true});
		proxy.level1_2.on('delete', function(change) {
			expect(change.oldValue).toBe(oldValue);
			expect(change.value).toBe(undefined);
			expect(change.path).toBe('.level2_1.level3_1.arr2[2][2]');
			expect(change.type).toBe('delete');
		}, {deep:true});
		proxy.level1_2.level2_1.level3_1.arr2[2].on('delete', function(change) {
			expect(change.oldValue).toBe(oldValue);
			expect(change.value).toBe(undefined);
			expect(change.path).toBe('[2]');
			expect(change.type).toBe('delete');
			setImmediate(part5);
		}, {deep:true});
		delete proxy.level1_2.level2_1.level3_1.arr2[2][2];
	}

	function part5() {
		proxy.removeAllListeners();
		proxy.level1_2.removeAllListeners();
		proxy.level1_2.level2_1.level3_1.arr2[2].removeAllListeners();

		let c1 = 0;
		proxy.on('change', function(change) {
			c1++;
			if(c1 === 1) expect(change).toEqual({ oldValue: undefined, value: {new:'new'}, type: 'create', path: '.level1_2.level2_1.level3_1.arr2[2][2]' });
			else if(c1 === 2) expect(change).toEqual({ oldValue: 'new', value: [0,1,2,3,4,5,6], type: 'update', path: '.level1_2.level2_1.level3_1.arr2[2][2].new' });
			else if(c1 === 3) expect(change).toEqual({ oldValue: 0, value: undefined, type: 'delete', path: '.level1_2.level2_1.level3_1.arr2[2][2].new[0]' });
		}, {deep:true});
		
		let c2 = 0;
		proxy.level1_2.on('change', function(change) {
			c2++;
			if(c2 === 1) expect(change).toEqual({ oldValue: undefined, value: {new:'new'}, type: 'create', path: '.level2_1.level3_1.arr2[2][2]' });
			else if(c2 === 2) expect(change).toEqual({ oldValue: 'new', value: [0,1,2,3,4,5,6], type: 'update', path: '.level2_1.level3_1.arr2[2][2].new' });
			else if(c2 === 3) expect(change).toEqual({ oldValue: 0, value: undefined, type: 'delete', path: '.level2_1.level3_1.arr2[2][2].new[0]' });
		}, {deep:true});

		let c3 = 0;
		proxy.level1_2.level2_1.level3_1.arr2[2].on('change', function(change) {
			c3++;
			if(c3 === 1) expect(change).toEqual({ oldValue: undefined, value: {new:'new'}, type: 'create', path: '[2]' });
			else if(c3 === 2) expect(change).toEqual({ oldValue: 'new', value: [0,1,2,3,4,5,6], type: 'update', path: '[2].new' });
			else if(c3 === 3) {
				expect(change).toEqual({ oldValue: 0, value: undefined, type: 'delete', path: '[2].new[0]' });
				setTimeout(done, 1);
			}
		}, {deep:true});
		proxy.level1_2.level2_1.level3_1.arr2[2][2] = { new: 'new' }; //should emit 1 create change
		proxy.level1_2.level2_1.level3_1.arr2[2][2].new = [0,1,2,3,4,5,6]; //should emit 1 update change
		delete proxy.level1_2.level2_1.level3_1.arr2[2][2].new[0]; //should emit 1 delete change

		//TODO - handle splice
		proxy.level1_2.level2_1.level3_1.arr2[2][2].new.splice(2, 2); //should emit 6 changes - update [2][3][4] then delete [6][5] then update length
	}
});

test('9. Events for future sub objects and primitives not yet created', (done) => {
	let proxy = new Proxserve({});
	proxy.on('change', function(change) {
		expect(change.path).toBe('.arr');
	}, {deep:true, id:123});
	proxy.arr = [];

	proxy.removeListener(123);
	let c1 = 0;
	let valueRef;
	proxy.arr.on('change', function(change) {
		c1++;
		if(c1 === 1) {
			expect(change).toEqual({ type:'create', path:'[2]', oldValue:undefined, value:{ a: { b: 'b' } } });
			valueRef = change.value;
		}
		else if(c1 === 2) {
			expect(change).toEqual({ type:'update', path:'[2].a.b', oldValue:'b', value:'cc' });
			expect(this[2].getOriginalTarget()).toBe(valueRef);
			expect(this[2]).toEqual({ a: { b: 'cc' } });
			proxy.arr.removeListener('zxc');
			setTimeout(() => {
				this[2].a = { b: 'ddd' }; //will trigger the next listener again
			}, 1);
		}
	}, {deep:true, id:'zxc'});

	let c2 = 0;
	proxy.arr.on('change', '[2].a.b', function(change) {
		c2++;
		if(c2 === 1) expect(change).toEqual({ type:'create', path:'', oldValue:undefined, value:'b' });
		else if(c2 === 2) expect(change).toEqual({ type:'update', path:'', oldValue:'b', value:'cc' });
		else if(c2 === 3) {
			expect(change).toEqual({ type:'update', path:'', oldValue:'cc', value:'ddd' });
			part3();
		}
	});

	proxy.arr[2] = { a: { b: 'b' } };
	proxy.arr[2].a.b = 'cc';

	function part3() {
		let c1 = 0;
		proxy.on('change', '.obj.1.2.3', function(change) { //on(change)
			c1++;
			//'update' comes before the 'create'
			if(c1 === 1) expect(change).toEqual({ type:'update', path:'', oldValue:987, value:654 });
			//only now the 'create' is invoked, but with an altered value object
			else if(c1 === 2) expect(change).toEqual({ type:'create', path:'', oldValue:undefined, value:654 });
		});
		proxy.on('create', '.obj.1', function(change) { //on(create)
			expect(change.path).toBe('');
			expect(change.value).toEqual({ '2': { '3': 987 } });
			expect(change.type).toBe('create');
			//make an 'update' event in the middle of the 'create' event that initiated 20 lines below!
			//also alters the object of 'proxy.obj.1.2'. this will affect the ongoing event emitting
			this['2'] = { '3': 654 };
		});

		proxy.on('update', '.obj.1.2', function(change) { //on(update)
			expect(change).toEqual({ type:'update', path:'', oldValue:{ '3': 987 }, value:{ '3': 654 } });
		}, {deep:true});
		proxy.on('update', '.obj.1', function(change) { //on(update)
			expect(change).toEqual({ type:'update', path:'.2', oldValue:{ '3': 987 }, value:{ '3': 654 } });
			setImmediate(part4);
		}, {deep:true});

		proxy.obj = { '1': { '2': { '3': 987 } } }; //makes a 'create' event
	}

	function part4() {
		proxy.removeAllListeners('.obj.1.2.3');
		proxy.removeAllListeners('.obj.1.2');
		proxy.removeAllListeners('.obj.1');

		proxy.obj.on('update', function(change) {
			expect(change).toEqual({ type:'update', path:'', oldValue:{1:{2:{3:654}}}, value:[0, [0, 1, [0, 1, 2, []] ] ] });
		});
		proxy.on('update', '.obj.1', function(change) { //path-selector can be with either dots or squared parenthesis
			expect(change).toEqual({ type:'update', path:'', oldValue:{2:{3:654}}, value:[0, 1, [0, 1, 2, []] ] });
		});
		proxy.obj.on('update', '.1[2]', function(change) { //path-selector can be with either dots or squared parenthesis
			expect(change).toEqual({ type:'update', path:'', oldValue:{3:654}, value:[0, 1, 2, []] });
			part5();
		});

		proxy.obj = [0, [0, 1, [0, 1, 2, []] ] ];
	}

	function part5() {
		proxy.removeAllListeners('.obj.1.2'); //should still work
		proxy.removeAllListeners('.obj.1');
		proxy.removeAllListeners('.obj');

		proxy.obj.on('update', function(change) {
			expect(change).toEqual({ type:'update', path:'', oldValue:[0, [0, 1, [0, 1, 2, []] ] ], value:true });

			this.removeListener(-20);
			proxy.obj = { '1': [0, 1, ['a']] };
		}, {id:-20});
		proxy.on('create', '.obj[1]', function(change) { //path-selector can be with either dots or squared parenthesis
			expect(change).toEqual({ type:'create', path:'', oldValue:undefined, value:[0, 1, ['a']] });
		});
		proxy.obj.on('create', '[1].2', function(change) { //path-selector can be with either dots or squared parenthesis
			expect(change).toEqual({ type:'create', path:'', oldValue:undefined, value:['a'] });
			setImmediate(done);
		});

		proxy.obj = true;
	}
});

test('10. Splice an array', () => {
	console.log('TEST IS MISSING');
	return;
	let origin = cloneDeep(testObject);
	let proxy = new Proxserve(origin);
	let arr = proxy.level1_2.level2_1.level3_1.arr2;

	arr.on('change', function(changes) {
		console.log(changes);
		expect(arr[0]).toEqual('some');
		done();
	});

	arr.splice(0, 1, 'some', 'items');
});
