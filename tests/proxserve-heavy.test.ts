/**
 * 2022 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Complex unit tests. CPU heavy.
 */
"use strict"

import { Proxserve } from '../src/index';
import type { ProxserveInstance } from '../src/types/proxserve-class';
import { isProxy, isRevoked, testObject, cloneDeep, deepCountObjects } from './common';
import { ND } from '../src/globals';

test('1. Test for correct "this" of invoked listeners', () => {
	const origin = cloneDeep(testObject);
	let proxy = Proxserve.make(origin, { debug: { destroyDelay: 10 } }); // decrease the 1000ms delay of destroy
	
	proxy.level1_1.on({
		event: 'change',
		listener: function(change) {
			expect(isProxy(this)).toBe(true);
		},
		deep: true,
	});
	proxy.level1_1.test = 5;
	proxy.level1_1 = [];

	proxy.level1_1.removeAllListeners();
	proxy.level1_1.on({
		event: 'change',
		listener: function(change) {
			expect(isProxy(this)).toBe(false);
		},
		deep: true,
	});
	proxy.level1_1 = 4;

	let counter = 0;
	proxy.level1_2.level2_1.on({
		event: 'change',
		listener: function(change) {
			counter++;
			if(counter <= 4) expect(isProxy(this)).toBe(true);
			else if(counter === 5) expect(isProxy(this)).toBe(false);
			else throw new Error(`shouldn't have gotten here on step #${counter}`);
		},
		deep: true,
	});
	proxy.level1_2.level2_1.level3_1.arr2 = 'a';
	proxy.level1_2.level2_1.level3_1 = 'a';
	proxy.level1_2.level2_1.level3_1 = {};
	proxy.level1_2.level2_1.level3_1.arr2 = [];
	proxy.level1_2.level2_1 = 0;
});

test('2. Destroy proxy and sub-proxies', (done) => {
	let origin = cloneDeep(testObject);
	let proxy = Proxserve.make(origin, { debug: { destroyDelay: 10 } }); // decrease the 1000ms delay of destroy
	const { proxyNode } = proxy.getProxserveNodes();
	Proxserve.destroy(proxy);
	expect(isRevoked(proxyNode)).toBe(true); //happens immediately

	origin = cloneDeep(testObject);
	proxy = Proxserve.make(origin, { debug: { destroyDelay: 10 } });

	const proxy_proxyNode = proxy.getProxserveNodes().proxyNode;
	let level1_2_proxyNode = proxy.level1_2.getProxserveNodes().proxyNode;
	let level1_2_target = level1_2_proxyNode[ND].target;
	let level3_proxyNode = proxy.level1_2.level2_1.level3_1.getProxserveNodes().proxyNode;
	let arr2_proxyNode = proxy.level1_2.level2_1.level3_1.arr2.getProxserveNodes().proxyNode;

	Proxserve.destroy(proxy.level1_2);
	expect(isRevoked(level1_2_proxyNode)).toBe(true); //proxy was immediately revoked
	expect(isRevoked(proxy_proxyNode)).toBe(false);

	expect(proxy.level1_2 === level1_2_target).toBe(true); //getting property of destroyed proxy will give the original target

	expect(isRevoked(level3_proxyNode)).toBe(true);
	expect(isRevoked(arr2_proxyNode)).toBe(true);

	origin = cloneDeep(testObject);
	proxy = Proxserve.make(origin, { debug: { destroyDelay: 10 } });

	level3_proxyNode = proxy.level1_2.level2_1.level3_1.getProxserveNodes().proxyNode;
	arr2_proxyNode = proxy.level1_2.level2_1.level3_1.arr2.getProxserveNodes().proxyNode;
	
	proxy.level1_2 = 5; //change from object to a primitive

	let arr1_proxyNode = proxy.level1_1.arr1.getProxserveNodes().proxyNode;
	delete proxy.level1_1.arr1; //delete an array
	expect(isRevoked(arr1_proxyNode)).toBe(false); //will live for 10ms more

	setTimeout(() => {
		expect(isRevoked(level3_proxyNode)).toBe(true);
		expect(isRevoked(arr2_proxyNode)).toBe(true);
		expect(typeof proxy.level1_1.arr1).toBe('undefined');
		expect(isRevoked(arr1_proxyNode)).toBe(true);
		part2();
	}, 30);

	function part2() {
		const proxy = Proxserve.make({arr1: []}, { debug: { destroyDelay: 10 } });

		const pn1 = proxy.arr1.getProxserveNodes().proxyNode;
		proxy.arr1[0] = {a:'a'};
		const pn2 = proxy.arr1[0].getProxserveNodes().proxyNode;
		proxy.arr1[1] = {b:'b'};
		const pn3 = proxy.arr1[1].getProxserveNodes().proxyNode;

		proxy.arr1 = [0, 1]; //cause a destroy of the array in 10ms
		const pn4 = proxy.arr1.getProxserveNodes().proxyNode;

		//immediately cause another destroy of the new array and create child objects
		proxy.arr1 = [{c:'c'}, {d:'d'}];
		const pn5 = proxy.arr1.getProxserveNodes().proxyNode;
		const pn6 = proxy.arr1[0].getProxserveNodes().proxyNode;
		const pn7 = proxy.arr1[1].getProxserveNodes().proxyNode;
		proxy.arr1 = [null, null]; //immediately cause another destroy of the new-new array with child NULL objects
		const pn8 = proxy.arr1.getProxserveNodes().proxyNode;
		proxy.arr1 = 3; //immediately completely destroy the new-new-new array

		setTimeout(() => {
			expect(isRevoked(pn1)).toBe(true);
			expect(isRevoked(pn2)).toBe(true);
			expect(isRevoked(pn3)).toBe(true);
			expect(isRevoked(pn4)).toBe(true);
			expect(isRevoked(pn5)).toBe(true);
			expect(isRevoked(pn6)).toBe(true);
			expect(isRevoked(pn7)).toBe(true);
			expect(isRevoked(pn8)).toBe(true);
			part3();
		}, 30);
	}

	function part3() {
		const proxy = Proxserve.make({ sub1: { sub2: { sub3: [{a:'a'}] } } }, { debug: { destroyDelay: 10 } });
		proxy.sub1.sub2.sub3.sub4 = []; //regular key on array

		const sub1_proxyNode = proxy.sub1.getProxserveNodes().proxyNode;
		const sub2_proxyNode = proxy.sub1.sub2.getProxserveNodes().proxyNode;
		const sub3_proxyNode = proxy.sub1.sub2.sub3.getProxserveNodes().proxyNode;
		const a_proxyNode = proxy.sub1.sub2.sub3[0].getProxserveNodes().proxyNode;
		const sub4_proxyNode = proxy.sub1.sub2.sub3.sub4.getProxserveNodes().proxyNode;

		proxy.sub1 = { sub2: { sub3: [{b:'b'}] } };
		proxy.sub1.sub2.sub3.sub4 = ['another'];

		setTimeout(() => {
			expect(isRevoked(sub1_proxyNode)).toBe(true);
			expect(isRevoked(sub2_proxyNode)).toBe(true);
			expect(isRevoked(sub3_proxyNode)).toBe(true);
			expect(isRevoked(a_proxyNode)).toBe(true);
			expect(isRevoked(sub4_proxyNode)).toBe(true);
			done();
		}, 30);
	}
});

test('3. Transfer sub-proxies between child nodes while assigning new proxies with updated paths', (done) => {
	const proxy = Proxserve.make({
		sub_obj: {
			sub_arr: [{a:'a'}, {b:'b'}, {c:'c'}, {d:'d'}]
		}
	}, { debug: { destroyDelay: 10 } });

	const arr0_PN = proxy.sub_obj.sub_arr[0].getProxserveNodes().proxyNode;
	const arr1_PN = proxy.sub_obj.sub_arr[1].getProxserveNodes().proxyNode;
	const arr2_PN = proxy.sub_obj.sub_arr[2].getProxserveNodes().proxyNode;
	const arr3_PN = proxy.sub_obj.sub_arr[3].getProxserveNodes().proxyNode;

	expect(isRevoked(arr2_PN)).toBe(false);
	
	//will delete cell at index 1 and then copy 2 to 1 and move 3 to 2 and then delete cell index 3 and update length
	proxy.sub_obj.sub_arr.splice(1, 1);
	
	setTimeout(() => {
		expect(arr0_PN[ND].proxy === proxy.sub_obj.sub_arr[0]).toBe(true); //wasn't touched
		expect(isRevoked(arr0_PN)).toBe(false);

		expect(isRevoked(arr1_PN)).toBe(true); //was deleted

		expect(arr2_PN[ND].target === proxy.sub_obj.sub_arr[1].getOriginalTarget()).toBe(true); //same target
		expect(arr2_PN[ND].proxy === proxy.sub_obj.sub_arr[1]).toBe(false); //but different path thus different proxy
		expect(isRevoked(arr2_PN)).toBe(true);

		expect(arr3_PN[ND].target === proxy.sub_obj.sub_arr[2].getOriginalTarget()).toBe(true); //same target
		expect(arr3_PN[ND].proxy === proxy.sub_obj.sub_arr[2]).toBe(false); //but different path thus different proxy
		expect(isRevoked(arr3_PN)).toBe(true);

		part2();
	}, 30);

	function part2() {
		delete proxy.sub_obj.sub_arr[0];
		expect(isRevoked(arr0_PN)).toBe(false); //will be destroyed async later
		setTimeout(() => {
			expect(isRevoked(arr0_PN)).toBe(true);
			part3();
		}, 30);
	}

	function part3() {
		proxy.arr = [{a:{aa:'aa'}}, {b:'b'}, {c:'c'}, {d:'d'}];
		const arr0_PN = proxy.arr[0].getProxserveNodes().proxyNode;
		const arr1_PN = proxy.arr[1].getProxserveNodes().proxyNode;
		const arr2_PN = proxy.arr[2].getProxserveNodes().proxyNode;
		const arr3_PN = proxy.arr[3].getProxserveNodes().proxyNode;
		
		const array_PN = proxy.arr.getProxserveNodes().proxyNode;
		expect(array_PN[ND].proxy[0] === arr0_PN[ND].proxy && array_PN[ND].target[0] === arr0_PN[ND].target).toBe(true);
		expect(array_PN[ND].proxy[1] === arr1_PN[ND].proxy && array_PN[ND].target[1] === arr1_PN[ND].target).toBe(true);
		expect(array_PN[ND].proxy[2] === arr2_PN[ND].proxy && array_PN[ND].target[2] === arr2_PN[ND].target).toBe(true);
		expect(array_PN[ND].proxy[3] === arr3_PN[ND].proxy && array_PN[ND].target[3] === arr3_PN[ND].target).toBe(true);

		proxy.arr.splice(1,2); //delete 'b' and 'c', then move 'd' to [1]
		delete proxy.arr[0]; //delete 'a'
		proxy.arr[3] = []; //make new object in the cell

		expect(isRevoked(arr0_PN)).toBe(false);
		expect(isRevoked(arr1_PN)).toBe(false);
		expect(isRevoked(arr2_PN)).toBe(false);
		expect(isRevoked(arr3_PN)).toBe(false);

		setTimeout(() => {
			expect(isRevoked(arr0_PN)).toBe(true);
			expect(arr0_PN[ND].target).toEqual({ a: { aa: 'aa' } });
			expect(isRevoked(arr1_PN)).toBe(true);
			expect(isRevoked(arr2_PN)).toBe(true);
			expect(isRevoked(arr3_PN)).toBe(true);

			expect(array_PN[ND].proxy[0] === undefined).toBe(true);
			expect(array_PN[ND].target[0] === undefined).toBe(true);

			expect(array_PN[ND].target[1] === arr3_PN[ND].target).toBe(true);
			expect(array_PN[ND].proxy[1] === arr3_PN[ND].proxy).toBe(false);

			expect(array_PN[ND].proxy[2] === undefined).toBe(true);
			expect(array_PN[ND].target[2] === undefined).toBe(true);

			expect(Array.isArray(array_PN[ND].proxy[3]) && Array.isArray(array_PN[ND].target[3])).toBe(true);
			done();
		}, 30);
	}
});

test('4. Keep using proxies after deletion/detachment in non-strict instantiation', (done) => {
	const proxy = Proxserve.make(cloneDeep(testObject), { strict: false, debug: { destroyDelay: 10 } });
	
	const level1_1_PN = proxy.level1_1.getProxserveNodes().proxyNode;
	const level1_1_proxy = level1_1_PN[ND].proxy;

	const arr2_PN = proxy.level1_2.level2_1.level3_1.arr2.getProxserveNodes().proxyNode;
	const arr2_proxy = arr2_PN[ND].proxy;

	proxy.level1_1 = 5;
	delete proxy.level1_2.level2_1.level3_1;
	setTimeout(() => {
		expect(isRevoked(level1_1_PN)).toBe(false);
		expect(level1_1_proxy).toEqual(testObject.level1_1);
		expect(isRevoked(arr2_PN)).toBe(false);
		expect(arr2_proxy).toEqual(testObject.level1_2.level2_1.level3_1.arr2);
		done();
	}, 30);
});

test('5. Find recursively and handle proxies inside objects inserted to main proxy', () => {
	let proxy = Proxserve.make({
		arr: [{a:'a'}, {b:'b'}, {c:'c'}, {d:'d'}]
	}, { debug: { destroyDelay: 0 } });

	let newObj = {
		subObj_1: proxy.arr[0],
		subObj_2: proxy.arr[1],
		subArr: [proxy.arr[2], [proxy.arr[3]]]
	};

	function getPath(proxy: ProxserveInstance) {
		let { dataNode } = proxy.getProxserveNodes();
		return dataNode[ND].path;
	}

	expect(isProxy(newObj)).toBe(false); //regular object (for now)
	expect(isProxy(newObj.subObj_1)).toBe(true);
	expect(getPath(newObj.subObj_1)).toBe('.arr[0]');
	expect(isProxy(newObj.subObj_2)).toBe(true);
	expect(getPath(newObj.subObj_2)).toBe('.arr[1]');
	expect(isProxy(newObj.subArr)).toBe(false);
	expect(isProxy(newObj.subArr[0])).toBe(true);
	expect(getPath(newObj.subArr[0])).toBe('.arr[2]');
	expect(isProxy(newObj.subArr[1])).toBe(false);
	expect(isProxy(newObj.subArr[1][0])).toBe(true);
	expect(getPath(newObj.subArr[1][0])).toBe('.arr[3]');

	proxy.newObj = newObj;

	expect(isProxy(proxy.newObj)).toBe(true);

	expect(isProxy(newObj.subObj_1)).toBe(false); //unproxified
	expect(isProxy(proxy.newObj.subObj_1)).toBe(true); //proxified again
	expect(getPath(proxy.arr[0])).toBe('.arr[0]');
	expect(getPath(proxy.newObj.subObj_1)).toBe('.newObj.subObj_1');
	expect(proxy.newObj.subObj_1.getOriginalTarget() === proxy.arr[0].getOriginalTarget()).toBe(true);

	expect(isProxy(newObj.subObj_2)).toBe(false);
	expect(isProxy(proxy.newObj.subObj_2)).toBe(true);
	expect(getPath(proxy.arr[1])).toBe('.arr[1]');
	expect(getPath(proxy.newObj.subObj_2)).toBe('.newObj.subObj_2');
	expect(proxy.newObj.subObj_2.getOriginalTarget() === proxy.arr[1].getOriginalTarget()).toBe(true);

	expect(isProxy(newObj.subArr)).toBe(false);
	expect(isProxy(proxy.newObj.subArr)).toBe(true);

	expect(getPath(proxy.arr[2])).toBe('.arr[2]');
	expect(getPath(proxy.newObj.subArr[0])).toBe('.newObj.subArr[0]');
	expect(proxy.newObj.subArr[0].getOriginalTarget() === proxy.arr[2].getOriginalTarget()).toBe(true);

	expect(isProxy(newObj.subArr[1])).toBe(false);
	expect(isProxy(proxy.newObj.subArr[1])).toBe(true);

	expect(getPath(proxy.arr[3])).toBe('.arr[3]');
	expect(getPath(proxy.newObj.subArr[1][0])).toBe('.newObj.subArr[1][0]');
	expect(proxy.newObj.subArr[1][0].getOriginalTarget() === proxy.arr[3].getOriginalTarget()).toBe(true);
});

test('6. Observe on referenced changes and cloned changes', () => {
	let proxy = Proxserve.make(cloneDeep(testObject));
	let counter = 0;
	proxy.level1_1.on({
		event: 'change',
		path: '.arr1',
		listener: function(change) {
			counter++;
			if(counter === 1) expect(change).toEqual({ oldValue: [0,1,2], value: {a:'a'}, type: 'update', path: '' });
			else if(counter === 2) expect(change).toEqual({ oldValue: {a:'a', b:'b'}, value: undefined, type: 'delete', path: '' });
			else throw new Error(`shouldn't have gotten here on step #${counter}`);
		},
	});
	let counter2 = 0;
	proxy.level1_1.on({
		event: 'change',
		path: '.arr1.b',
		listener: function(change) {
			counter2++;
			if(counter2 === 1) expect(change).toEqual({ oldValue: undefined, value: 'b', type: 'create', path: '' });
			else if(counter2 === 2) expect(change).toEqual({ oldValue: 'b', value: undefined, type: 'delete', path: '' });
			else throw new Error(`shouldn't have gotten here on step #${counter}`);
		},
	});
	proxy.level1_1.arr1 = {a:'a'}; //emits to 'arr1' shallow listener
	proxy.level1_1.arr1.b = 'b'; //emits to 'arr1.b' shallow listener
	let tmp = proxy.level1_1.arr1;
	delete proxy.level1_1.arr1; //emits to both 'arr1' and 'arr1.b' listeners
	tmp.a = tmp.b = 'cc'; //should not emit any more

	proxy = Proxserve.make(cloneDeep(testObject));
	let changes: any[] = [];
	proxy.level1_1.on({
		event: 'change',
		listener: function(change) {
			changes.push(change);
			if(changes.length === 1) expect(change.value).toEqual({a:'a'});
			if(changes.length === 2) expect(change.value).toEqual('b');
			if(changes.length === 3) expect(change.oldValue).toBe(changes[0].value); //same reference
		},
		deep: true,
	});

	proxy.level1_1.arr1 = {a:'a'};
	proxy.level1_1.arr1.b = 'b';
	tmp = proxy.level1_1.arr1;
	delete proxy.level1_1.arr1;
	tmp.a = tmp.b = 'cc';

	expect(changes[0]).toEqual({ oldValue: [0,1,2], value: {a:'cc', b:'cc'}, type: 'update', path: '.arr1' });
	expect(changes[1]).toEqual({ oldValue: undefined, value: 'b', type: 'create', path: '.arr1.b' });
	expect(changes[2]).toEqual({ oldValue: {a:'cc', b:'cc'}, value: undefined, type: 'delete', path: '.arr1' });
});

//benchmark on a CPU with baseclock of 3.6 GHz is around 0.3s
test('7. Proxserve 50,000 objects in less than 1 second', () => {
	let objectsPerProxy = deepCountObjects(testObject);
	expect(objectsPerProxy).toBeGreaterThan(6);
	let repeatitions = Math.ceil(50000 / objectsPerProxy);
	let objs: any[] = [];

	for(let i=0; i < repeatitions; i++) {
		objs.push(cloneDeep(testObject)); //cloning should not be counted against proxserve speed
	}

	let start = Date.now();
	for(let i=0; i < repeatitions; i++) {
		Proxserve.make(objs[i]);
	}
	let end = Date.now();
	
	expect(end - start).toBeLessThan(1000);
	console.log(`Proxserve 50,000 objects: ${end - start}ms`);
});

//benchmark on a CPU with baseclock of 3.6 GHz is around 0.4s
test('8. Destroy 50,000 proxserves in less than 1 seconds', () => {
	let objectsPerProxy = deepCountObjects(testObject);
	expect(objectsPerProxy).toBeGreaterThan(6);
	let repeatitions = Math.ceil(50000 / objectsPerProxy);
	let proxies: ProxserveInstance[] = [];

	for(let i=0; i < repeatitions; i++) {
		proxies.push(Proxserve.make(cloneDeep(testObject)));
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

test('9. Comprehensive events of changes', () => {
	let proxy = Proxserve.make(cloneDeep(testObject), { methodsEmitRaw: true, debug: { destroyDelay: 10 } });
	proxy.on({
		event: 'create',
		listener: function(change) {
			expect(this).toBe(proxy);
			expect(change.oldValue).toBe(undefined);
			expect(change.value).toBe(17);
			expect(change.path).toBe('.level1_2.level2_1.level3_1.arr2[2][2][1].deep.new');
			expect(change.type).toBe('create');
		},
		deep: true,
	});
	proxy.level1_2.on({
		event: 'create',
		listener: function(change) {
			expect(this).toBe(proxy.level1_2);
			expect(change.oldValue).toBe(undefined);
			expect(change.value).toBe(17);
			expect(change.path).toBe('.level2_1.level3_1.arr2[2][2][1].deep.new');
			expect(change.type).toBe('create');
		},
		deep: true,
	});
	proxy.level1_2.level2_1.level3_1.arr2[2].on({
		event: 'create',
		listener: function(change) {
			expect(this).toBe(proxy.level1_2.level2_1.level3_1.arr2[2]);
			expect(change.oldValue).toBe(undefined);
			expect(change.value).toBe(17);
			expect(change.path).toBe('[2][1].deep.new');
			expect(change.type).toBe('create');
		},
		deep: true,
	});
	proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.on({
		event: 'create',
		listener: function(change) {
			expect(this).toBe(proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep);
			expect(change.oldValue).toBe(undefined);
			expect(change.value).toBe(17);
			expect(change.path).toBe('.new');
			expect(change.type).toBe('create');
		},
		deep: true,
	});
	proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.new = 17;
	
	//part 2
	proxy.removeAllListeners();
	proxy.on({
		event: 'update',
		listener: function(change) {
			expect(change.oldValue).toBe(17);
			expect(change.value).toBe(21);
			expect(change.path).toBe('.level1_2.level2_1.level3_1.arr2[2][2][1].deep.new');
			expect(change.type).toBe('update');
		},
		deep: true,
	});
	proxy.level1_2.removeAllListeners();
	proxy.level1_2.on({
		event: 'update',
		listener: function(change) {
			expect(change.oldValue).toBe(17);
			expect(change.value).toBe(21);
			expect(change.path).toBe('.level2_1.level3_1.arr2[2][2][1].deep.new');
			expect(change.type).toBe('update');
		},
		deep: true,
	});
	proxy.level1_2.level2_1.level3_1.arr2[2].removeAllListeners();
	proxy.level1_2.level2_1.level3_1.arr2[2].on({
		event: 'update',
		listener: function(change) {
			expect(change.oldValue).toBe(17);
			expect(change.value).toBe(21);
			expect(change.path).toBe('[2][1].deep.new');
			expect(change.type).toBe('update');
		},
		deep: true,
	});
	proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.removeAllListeners();
	proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.on({
		event: 'update',
		listener: function(change) {
			expect(change.oldValue).toBe(17);
			expect(change.value).toBe(21);
			expect(change.path).toBe('.new');
			expect(change.type).toBe('update');
		},
		deep: true,
	});
	proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.new = 21;

	//part 3
	proxy.removeAllListeners();
	proxy.on({
		event: 'delete',
		listener: function(change) {
			expect(change.oldValue).toBe(21);
			expect(change.value).toBe(undefined);
			expect(change.path).toBe('.level1_2.level2_1.level3_1.arr2[2][2][1].deep.new');
			expect(change.type).toBe('delete');
		},
		deep: true,
	});
	proxy.level1_2.removeAllListeners();
	proxy.level1_2.on({
		event: 'delete',
		listener: function(change) {
			expect(change.oldValue).toBe(21);
			expect(change.value).toBe(undefined);
			expect(change.path).toBe('.level2_1.level3_1.arr2[2][2][1].deep.new');
			expect(change.type).toBe('delete');
		},
		deep: true,
	});
	proxy.level1_2.level2_1.level3_1.arr2[2].removeAllListeners();
	proxy.level1_2.level2_1.level3_1.arr2[2].on({
		event: 'delete',
		listener: function(change) {
			expect(change.oldValue).toBe(21);
			expect(change.value).toBe(undefined);
			expect(change.path).toBe('[2][1].deep.new');
			expect(change.type).toBe('delete');
		},
		deep: true,
	});
	proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.removeAllListeners();
	proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.on({
		event: 'delete',
		listener: function(change) {
			expect(change.oldValue).toBe(21);
			expect(change.value).toBe(undefined);
			expect(change.path).toBe('.new');
			expect(change.type).toBe('delete');
		},
		deep: true,
	});
	delete proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.new;

	//part 4
	let oldValue = proxy.level1_2.level2_1.level3_1.arr2[2][2].getOriginalTarget();//[14, { deep: { deeper: 'abc' } }, 16];

	proxy.removeAllListeners();
	proxy.level1_2.removeAllListeners();
	proxy.level1_2.level2_1.level3_1.arr2[2].removeAllListeners();
	proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.removeAllListeners();

	proxy.on({
		event: 'delete',
		listener: function(change) {
			expect(change.oldValue).toBe(oldValue);
			expect(change.value).toBe(undefined);
			expect(change.path).toBe('.level1_2.level2_1.level3_1.arr2[2][2]');
			expect(change.type).toBe('delete');
		},
		deep: true,
	});
	proxy.level1_2.on({
		event: 'delete',
		listener: function(change) {
			expect(change.oldValue).toBe(oldValue);
			expect(change.value).toBe(undefined);
			expect(change.path).toBe('.level2_1.level3_1.arr2[2][2]');
			expect(change.type).toBe('delete');
		},
		deep: true,
	});
	proxy.level1_2.level2_1.level3_1.arr2[2].on({
		event: 'delete',
		listener: function(change) {
			expect(change.oldValue).toBe(oldValue);
			expect(change.value).toBe(undefined);
			expect(change.path).toBe('[2]');
			expect(change.type).toBe('delete');
		},
		deep: true,
	});
	delete proxy.level1_2.level2_1.level3_1.arr2[2][2];

	//part 5
	proxy.removeAllListeners();
	proxy.level1_2.removeAllListeners();
	proxy.level1_2.level2_1.level3_1.arr2[2].removeAllListeners();

	let counter = 0;
	proxy.on({
		event: 'change',
		listener: function(change) {
			counter++;
			if(counter === 3) expect(change).toEqual({ oldValue: undefined, value: {new:'new'}, type: 'create', path: '.level1_2.level2_1.level3_1.arr2[2][2]' });
			else if(counter === 6) expect(change).toEqual({ oldValue: 'new', value: [0,1,2,3,4,5,6], type: 'update', path: '.level1_2.level2_1.level3_1.arr2[2][2].new' });
			else if(counter === 9) expect(change).toEqual({ oldValue: 0, value: undefined, type: 'delete', path: '.level1_2.level2_1.level3_1.arr2[2][2].new[0]' });
			else throw new Error(`shouldn't have gotten here on step #${counter}`);
		},
		deep: true,
	});
	
	proxy.level1_2.on({
		event: 'change',
		listener: function(change) {
			counter++;
			if(counter === 2) expect(change).toEqual({ oldValue: undefined, value: {new:'new'}, type: 'create', path: '.level2_1.level3_1.arr2[2][2]' });
			else if(counter === 5) expect(change).toEqual({ oldValue: 'new', value: [0,1,2,3,4,5,6], type: 'update', path: '.level2_1.level3_1.arr2[2][2].new' });
			else if(counter === 8) expect(change).toEqual({ oldValue: 0, value: undefined, type: 'delete', path: '.level2_1.level3_1.arr2[2][2].new[0]' });
			else throw new Error(`shouldn't have gotten here on step #${counter}`);
		},
		deep: true,
	});

	proxy.level1_2.level2_1.level3_1.arr2[2].on({
		event: 'change',
		listener: function(change) {
			counter++;
			if(counter === 1) expect(change).toEqual({ oldValue: undefined, value: {new:'new'}, type: 'create', path: '[2]' });
			else if(counter === 4) expect(change).toEqual({ oldValue: 'new', value: [0,1,2,3,4,5,6], type: 'update', path: '[2].new' });
			else if(counter === 7) expect(change).toEqual({ oldValue: 0, value: undefined, type: 'delete', path: '[2].new[0]' });
			else throw new Error(`shouldn't have gotten here on step #${counter}`);
		},
		deep: true,
	});

	proxy.level1_2.level2_1.level3_1.arr2[2][2] = { new: 'new' }; //should emit 1 create change
	proxy.level1_2.level2_1.level3_1.arr2[2][2].new = [0,1,2,3,4,5,6]; //should emit 1 update change
	delete proxy.level1_2.level2_1.level3_1.arr2[2][2].new[0]; //should emit 1 delete change

	proxy.removeAllListeners();
	proxy.level1_2.removeAllListeners();
	proxy.level1_2.level2_1.level3_1.arr2[2].removeAllListeners();

	counter = 0;
	proxy.level1_2.level2_1.level3_1.arr2[2][2].new.on({
		event: 'change',
		listener: function(change) {
			counter++;
			if(counter === 1) expect(change).toEqual({ oldValue: 2, value: 4, type: 'update', path: '[2]' });
			else if(counter === 2) expect(change).toEqual({ oldValue: 3, value: 5, type: 'update', path: '[3]' });
			else if(counter === 3) expect(change).toEqual({ oldValue: 4, value: 6, type: 'update', path: '[4]' });
			else if(counter === 4) expect(change).toEqual({ oldValue: 6, type: 'delete', path: '[6]' });
			else if(counter === 5) expect(change).toEqual({ oldValue: 5, type: 'delete', path: '[5]' });
			else if(counter === 6) expect(change).toEqual({ oldValue: 7, value: 5, type: 'update', path: '[length]' });
			else throw new Error(`shouldn't have gotten here on step #${counter}`);
		},
		deep: true,
	});

	proxy.level1_2.level2_1.level3_1.arr2[2][2].new.splice(2, 2); //should emit 6 changes - update [2][3][4] then delete [6][5] then update length
});

test('10. Events for future sub objects and primitives not yet created', () => {
	let proxy = Proxserve.make({}, { debug: { destroyDelay: 10 } });
	proxy.on({
		event: 'change',
		listener: function(change) {
			expect(change.path).toBe('.arr');
		},
		deep: true,
		id: 123,
	});
	
	proxy.arr = [];
	proxy.removeListener({ id: 123 });

	let counter = 0;
	let valueRef;
	proxy.arr.on({
		event: 'change',
		listener: function(change) {
			counter++;
			if(counter === 1) {
				expect(change).toEqual({ type:'create', path:'[2]', oldValue:undefined, value:{ a: { b: 'b' } } });
				valueRef = change.value;
			}
			else if(counter === 4) {
				expect(change).toEqual({ type:'update', path:'[2].a.b', oldValue:'b', value:'cc' });
				expect(this[2].getOriginalTarget()).toBe(valueRef);
				expect(this[2]).toEqual({ a: { b: 'cc' } });
				proxy.arr.removeListener({ id: 'zxc' });
			}
			else {
				throw new Error(`shouldn't have gotten here on step #${counter}`);
			}
		},
		deep: true,
		id: 'zxc',
	});

	proxy.arr.on({
		event: 'change',
		path: '[2].a.b',
		listener: function(change) {
			counter++;
			if(counter === 2) expect(change).toEqual({ type:'create', path:'', oldValue:undefined, value:'b' }); //capture phase
			else if(counter === 3) expect(change).toEqual({ type:'update', path:'', oldValue:'b', value:'cc' }); //bubble phase
			else if(counter === 5) expect(change).toEqual({ type:'update', path:'', oldValue:'cc', value:'ddd' });
			else throw new Error(`shouldn't have gotten here on step #${counter}`);
		},
	});

	proxy.arr[2] = { a: { b: 'b' } };
	proxy.arr[2].a.b = 'cc';
	proxy.arr[2].a = { b: 'ddd' };

	counter = 0;

	proxy.on({
		event: 'change',
		path: '.obj.1.2.3',
		listener: function(change) {
			counter++;
			//'update' comes before the 'create'
			if(counter === 1) expect(change).toEqual({ type:'update', path:'', oldValue:987, value:654 });
			//only now the 'create' is invoked, but with an altered value object
			else if(counter === 2) expect(change).toEqual({ type:'create', path:'', oldValue:undefined, value:654 });
			else throw new Error(`shouldn't have gotten here on step #${counter}`);
		},
	});
	proxy.on({
		event: 'create',
		path: '.obj.1',
		listener: function(change) {
			expect(change.path).toBe('');
			expect(change.value).toEqual({ '2': { '3': 987 } });
			expect(change.type).toBe('create');
			//make an 'update' event in the middle of the 'create' event that initiated 20 lines below!
			//also alters the object of 'proxy.obj.1.2'. this will affect the ongoing event emitting
			this['2'] = { '3': 654 };
		},
	});

	proxy.on({
		event: 'update',
		path: '.obj.1.2',
		listener: function(change) {
			expect(change).toEqual({ type:'update', path:'', oldValue:{ '3': 987 }, value:{ '3': 654 } });
		},
		deep: true,
	});
	proxy.on({
		event: 'update',
		path: '.obj.1',
		listener: function(change) {
			expect(change).toEqual({ type:'update', path:'.2', oldValue:{ '3': 987 }, value:{ '3': 654 } });
		},
		deep: true,
	});

	proxy.obj = { '1': { '2': { '3': 987 } } }; //makes a 'create' event

	proxy.removeAllListeners('.obj.1.2.3');
	proxy.removeAllListeners('.obj.1.2');
	proxy.removeAllListeners('.obj.1');

	proxy.obj.on({
		event: 'update',
		listener: function(change) {
			expect(change).toEqual({ type:'update', path:'', oldValue:{1:{2:{3:654}}}, value:[0, [0, 1, [0, 1, 2, []] ] ] });
		},
	});
	proxy.on({
		event: 'update',
		path: '.obj.1',
		listener: function(change) { //path-selector can be with either dots or squared parenthesis
			expect(change).toEqual({ type:'update', path:'', oldValue:{2:{3:654}}, value:[0, 1, [0, 1, 2, []] ] });
		},
	});
	proxy.obj.on({
		event: 'update',
		path: '.1[2]',
		listener: function(change) { //path-selector can be with either dots or squared parenthesis
			expect(change).toEqual({ type:'update', path:'', oldValue:{3:654}, value:[0, 1, 2, []] });
		},
	});

	proxy.obj = [0, [0, 1, [0, 1, 2, []] ] ];

	proxy.removeAllListeners('.obj.1.2'); //should still work
	proxy.removeAllListeners('.obj.1');
	proxy.removeAllListeners('.obj');

	proxy.obj.on({
		event: 'update',
		listener: function(change) {
			expect(change).toEqual({ type:'update', path:'', oldValue:[0, [0, 1, [0, 1, 2, []] ] ], value:true });

			proxy.removeListener({
				path: '.obj',
				id: -20,
			});
			proxy.obj = { '1': [0, 1, ['a']] };
		},
		id: -20,
	});
	proxy.on({
		event: 'create',
		path: '.obj[1]',
		listener: function(change) { //path-selector can be with either dots or squared parenthesis
			expect(change).toEqual({ type:'create', path:'', oldValue:undefined, value:[0, 1, ['a']] });
		},
	});
	proxy.obj.on({
		event: 'create',
		path: '[1].2',
		listener: function(change) { //path-selector can be with either dots or squared parenthesis
			expect(change).toEqual({ type:'create', path:'', oldValue:undefined, value:['a'] });
		},
	});

	proxy.obj = true;
});

test('11. Splice an array', () => {
	let proxy = Proxserve.make(
		{ arr: [{a:'a'}, {b:'b'}, {c:'c'}] },
		{ debug: { destroyDelay: 10 } }
	);

	let step = 0;

	proxy.arr.on({
		event: 'change',
		listener: function(change) {
			expect(change).toEqual({
				path: '',
				type: 'splice',
				args: { start:1, deleteCount: 1, items: [{y:'y'}, {z:'z'}] },
				oldValue: [{a:'a'}, {b:'b'}, {c:'c'}],
				value: [{a:'a'}, {y:'y'}, {z:'z'}, {c:'c'}]
			});
			expect(step).toBe(0); //most important. bubble up should run before capture down
			step++;
		},
	});
	proxy.arr.on({
		event: 'change',
		path: '[1]',
		listener: function(change) {
			expect(change).toEqual({
				path: '',
				type: 'update',
				oldValue: {b:'b'},
				value: {y:'y'}
			});
			expect(step).toBe(2);
			step++;
		},
	});
	proxy.arr.on({
		event: 'change',
		path: '[2]',
		listener: function(change) {
			expect(change).toEqual({
				path: '',
				type: 'update',
				oldValue: {c:'c'},
				value: {z:'z'}
			});
			expect(step).toBe(3);
			step++;
		},
	});
	proxy.arr.on({
		event: 'change',
		path: '[3]',
		listener: function(change) {
			expect(change).toEqual({
				path: '',
				type: 'create',
				value: {c:'c'}
			});
			expect(step).toBe(1);
			step++;
		},
	});

	proxy.arr.splice(1, 1, {y:'y'}, {z:'z'}); //will move [2] to [3] and then overwrite [1] and then [2]
});

test('12. Shift from an array', () => {
	let proxy = Proxserve.make(
		{ arr: [{a:'a'}, {b:'b'}, {c:'c'}] },
		{ debug: { destroyDelay: 10 } }
	);

	let step = 0;

	proxy.arr.on({
		event: 'change',
		listener: function(change) {
			expect(change).toEqual({
				path: '',
				type: 'shift',
				args: {},
				oldValue: [{a:'a'}, {b:'b'}, {c:'c'}],
				value: [{b:'b'}, {c:'c'}]
			});
			expect(step).toBe(0); //most important. bubble up should run before capture down
			step++;
		},
	});
	proxy.arr.on({
		event: 'change',
		path: '[3]',
		listener: function(change) {
			expect(change).toEqual({
				path: '',
				type: 'delete',
				oldValue: {c:'c'}
			});
			expect(step).toBe(1);
			step++;
		},
	});

	proxy.arr.shift(); //will move [2] to [3] and then overwrite [1] and then [2]
});

test('13. Unshift to an array', () => {
	let proxy = Proxserve.make(
		{ arr: [{a:'a'}] },
		{ debug: { destroyDelay: 10 } }
	);

	let step = 0;

	proxy.arr.on({
		event: 'change',
		listener: function(change) {
			expect(change).toEqual({
				path: '',
				type: 'unshift',
				args: { items: [{y:'y'}, {z:'z'}] },
				oldValue: [{a:'a'}],
				value: [{y:'y'}, {z:'z'}, {a:'a'}]
			});
			expect(step).toBe(0); //most important. bubble up should run before capture down
			step++;
		},
	});
	proxy.on({
		event: 'change',
		listener: function(change) {
			expect(change).toEqual({
				path: '.arr',
				type: 'unshift',
				args: { items: [{y:'y'}, {z:'z'}] },
				oldValue: [{a:'a'}],
				value: [{y:'y'}, {z:'z'}, {a:'a'}]
			});
			expect(step).toBe(1); //most important. bubble up should run before capture down
			step++;
		},
		deep:true,
	});
	proxy.arr.on({
		event: 'change',
		path: '[0]',
		listener: function(change) {
			expect(change).toEqual({
				path: '',
				type: 'update',
				oldValue: {a:'a'},
				value: {y:'y'}
			});
			expect(step).toBe(3);
			step++;
		},
	});
	proxy.arr.on({
		event: 'change',
		path: '[1]',
		listener: function(change) {
			expect(change).toEqual({
				path: '',
				type: 'create',
				value: {z:'z'}
			});
			expect(step).toBe(4);
			step++;
		},
	});
	proxy.arr.on({
		event: 'change',
		path: '[2]',
		listener: function(change) {
			expect(change).toEqual({
				path: '',
				type: 'create',
				value: {a:'a'}
			});
			expect(step).toBe(2);
			step++;
		},
	});

	proxy.arr.unshift({y:'y'}, {z:'z'}); //will move [0] to [2] and then overwrite [0] and create [1]
});
