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
import { testObject, cloneDeep } from './common';

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
	expect(proxy.whoami()).toEqual('test_name');
	expect(proxy.level1_1.arr1.whoami()).toEqual('test_name.level1_1.arr1');

	proxy = Proxserve.make(origin);
	expect(proxy.whoami()).toEqual('');
	expect(proxy.level1_1.arr1.whoami()).toEqual('.level1_1.arr1');
});
