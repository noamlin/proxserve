/**
 * 2022 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Supporting methods unit tests - methods and functions that aren't directly the business logic.
 */
"use strict"

import { Proxserve } from '../src/index';
import { testObject, cloneDeep, wakeConsole } from './common';

test('1. splitPath - split path to segments', () => {
	let path = Proxserve.splitPath('.level2_1.level3_1');
	let path2 = Proxserve.splitPath('level2_1.level3_1');
	expect(path).toEqual(path2);
	expect(path).toEqual(['level2_1','level3_1']);

	path = Proxserve.splitPath('[2][2].new');
	expect(path).toEqual([2,2,'new']);

	path = Proxserve.splitPath('.new[0]');
	expect(path).toEqual(['new',0]);

	path = Proxserve.splitPath('.a');
	path2 = Proxserve.splitPath('a');
	expect(path).toEqual(path2);
	expect(path).toEqual(['a']);

	path = Proxserve.splitPath('.level2_1.level3_1.arr2[2][2].new[0]');
	expect(path).toEqual(['level2_1','level3_1','arr2',2,2,'new',0]);

	path = Proxserve.splitPath('New[0]new');
	expect(path).toEqual(['New',0,'new']);

	path = Proxserve.splitPath('[1][0][new]');
	expect(path).toEqual([1,0,'new']);

	path = Proxserve.splitPath('.new[0][1.0][1a][keyWith1][9876543210]');
	expect(path).toEqual(['new',0,'1.0','1a','keyWith1',9876543210]);
});

test('2. evalPath - get target property of object and path', () => {
	let proxy = Proxserve.make(cloneDeep(testObject));
	proxy.on({ event: 'change', listener: function(changes) {
		let { object, property, value } = Proxserve.evalPath(this, changes[0].path);
		expect(object === proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep).toBe(true);
		expect(property).toEqual('deeper');
		expect(value).toBe('xyz');
	}});
	proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.deeper = 'xyz';
	proxy.removeAllListeners();

	proxy.level1_2.on({ event: 'change', listener: function(changes) {
		let { object, property, value } = Proxserve.evalPath(this, changes[0].path);
		expect(object === proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep).toBe(true);
		expect(property).toEqual('another');
		expect(value).toBe('asdf');
	}});
	proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.another = 'asdf';
	proxy.level1_2.removeAllListeners();

	proxy.level1_2.level2_1.on({ event: 'change', listener: function(changes) {
		let { object, property, value } = Proxserve.evalPath(this, changes[0].path);
		expect(object === proxy.level1_2.level2_1.level3_1.arr2[2]).toBe(true);
		expect(property).toEqual(2);
		expect(value).toEqual([0, {a: 'a'}]);
	}});
	proxy.level1_2.level2_1.level3_1.arr2[2][2] = [0, {a: 'a'}];
	proxy.level1_2.level2_1.removeAllListeners();

	proxy.on({ event: 'change', listener: function(changes) {
		let { object, property, value } = Proxserve.evalPath(this, changes[0].path);
		expect(object === proxy).toBe(true);
		expect(property).toEqual('a');
		expect(value).toEqual({});
	}});
	proxy.a = {};
	proxy.removeAllListeners();

	proxy.on({ event: 'change', listener: function(changes) {
		let { object, property, value } = Proxserve.evalPath(this, changes[0].path);
		expect(object === proxy.a).toBe(true);
		expect(property).toEqual('a');
		expect(value).toEqual('a');
	}});
	proxy.a.a = 'a';
	proxy.removeAllListeners();

	let { object, property, value } = Proxserve.evalPath(proxy, '');
	expect(object === proxy).toBe(true);
	expect(property).toEqual('');
	expect(value).toEqual(proxy);
});

test('3. Proxserve object root name', () => {
	const origin = cloneDeep(testObject);

	let proxy = Proxserve.make(origin, { name: 'test_name' });
	expect(proxy.getProxserveName()).toEqual('test_name');
	expect(proxy.level1_1.arr1.getProxserveName()).toEqual('test_name');

	proxy = Proxserve.make(origin);
	expect(proxy.getProxserveName()).toEqual('');
	expect(proxy.level1_1.arr1.getProxserveName()).toEqual('');
});

test('3. Who am I', () => {
	const origin = cloneDeep(testObject);

	let proxy = Proxserve.make(origin, { name: 'test_name' });
	expect(proxy.whoami()).toBe('test_name');
	expect(proxy.level1_1.arr1.whoami()).toBe('test_name.level1_1.arr1');

	proxy = Proxserve.make(origin);
	expect(proxy.whoami()).toBe('');
	expect(proxy.level1_1.arr1.whoami()).toBe('.level1_1.arr1');
});

test('4. Debug Trace', () => {
	let expected: string[] = [];
	function catchLog(...args: any[]) {
		const message = args.reduce<string>((previousValue, currentValue) => {
			if (currentValue === undefined) {
				return previousValue.concat('undefined');
			} else if (currentValue === null) {
				return previousValue.concat('null');
			}
			
			return previousValue.concat(currentValue.toString().replace(/\n/gi, ''));
		}, '');

		expected.push(message);
	}

	console.log = catchLog;

	const origin = cloneDeep(testObject);
	let proxy = Proxserve.make(origin, { name: 'test_name', debug: { trace: 'none' } });
	proxy.level1_1.arr1.push(3);

	wakeConsole();

	expect(expected.length).toBe(0);

	console.log = catchLog;

	proxy = Proxserve.make(origin, { name: 'test_name', debug: { trace: 'normal' } });
	proxy.level1_1.prim1 = 44;
	proxy.level1_1.arr1.splice(0, 1);

	wakeConsole();

	expect(expected[0].indexOf('border-bottom')).toBeGreaterThan(3);
	expect(/test_name\.level1_1\.prim1.+has been created/gi.test(expected[1])).toBe(true);
	expect(/Stack Trace.*at Object.set/gi.test(expected[2])).toBe(true);
	expect(expected[3].indexOf('border-top')).toBeGreaterThan(3);
	expect(expected[4].indexOf('border-bottom')).toBeGreaterThan(3);
	expect(/test_name\.level1_1\.arr1.+has been spliced/gi.test(expected[5])).toBe(true);
	expect(/Stack Trace.*at Object.splice/gi.test(expected[6])).toBe(true);

	expected = [];
	console.log = catchLog;

	proxy = Proxserve.make(origin, { name: 'test_name', debug: { trace: 'verbose' } });
	delete proxy.level1_1.prim1;
	proxy.level1_1.arr1.unshift(19);

	wakeConsole();

	expect(expected[0].indexOf('border-bottom')).toBeGreaterThan(2);
	expect(/test_name\.level1_1\.prim1.+has been deleted/gi.test(expected[1])).toBe(true);
	expect(/Old value was/gi.test(expected[2])).toBe(true);
	expect(expected[3].indexOf('44')).toBe(0);
	expect(/New value is/gi.test(expected[4])).toBe(true);
	expect(expected[5].indexOf('undefined')).toBe(0);
	expect(/Stack Trace.*at Object.deleteProperty/gi.test(expected[6])).toBe(true);
	expect(expected[7].indexOf('border-top')).toBeGreaterThan(3);
	expect(expected[8].indexOf('border-bottom')).toBeGreaterThan(3);
	expect(/test_name\.level1_1\.arr1.+has been unshifted/gi.test(expected[9])).toBe(true);
	expect(/Arguments of unshift/gi.test(expected[10])).toBe(true);
	expect(/object Object/gi.test(expected[11])).toBe(true);
	expect(/Old value was/gi.test(expected[12])).toBe(true);
	expect(expected[13].indexOf('1,2,3')).toBe(0);
	expect(/New value is/gi.test(expected[14])).toBe(true);
	expect(expected[15].indexOf('19,1,2,3')).toBe(0);
	expect(/Stack Trace.*at Object.unshift/gi.test(expected[16])).toBe(true);
});
