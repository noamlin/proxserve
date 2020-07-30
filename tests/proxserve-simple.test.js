/**
 * Copyright 2020 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Simple unit tests. not CPU heavy.
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

test('1. Initiate a proxserve and check if original object stays intact', () => {
	let origin = cloneDeep(testObject);
	let proxy = new Proxserve(origin);
	expect(proxy).toEqual(testObject);
	expect(proxy.getOriginalTarget() === origin).toBe(true);
});

test('2. Object, child-objects and added-child-objects should convert to proxies', () => {
	let proxy = new Proxserve(cloneDeep(testObject));
	proxy.level1_3 = {
		level2_2: [0,2,4,6]
	};
	expect(util.types.isProxy(testObject)).toBe(false);
	expect(util.types.isProxy(proxy)).toBe(true);
	expect(util.types.isProxy(testObject.level1_1.arr1)).toBe(false);
	expect(util.types.isProxy(proxy.level1_1.arr1)).toBe(true);
	expect(util.types.isProxy(proxy.level1_3)).toBe(true);
	expect(util.types.isProxy(proxy.level1_3.level2_2)).toBe(true);
});

test('3. defineProperty should convert string/number properties to proxy', (done) => {
	let origin = cloneDeep(testObject);
	let proxy = new Proxserve(origin, {delay:-950});
	let sym = Symbol.for('sym');

	let desc = {
		enumerable: false,
		configurable: true,
		writable: true,
		value: { this_is: { inner: 'some value' } }
	};

	Object.defineProperty(proxy, sym, cloneDeep(desc));
	Object.defineProperty(proxy, 'obj', cloneDeep(desc));

	expect(util.types.isProxy(proxy[sym])).toBe(false);
	expect(util.types.isProxy(proxy.obj)).toBe(false);

	desc.enumerable = true;
	Object.defineProperty(proxy, sym, cloneDeep(desc));
	Object.defineProperty(proxy, 'obj', cloneDeep(desc));

	expect(util.types.isProxy(proxy[sym])).toBe(false); //symbol isn't proxied anyway
	expect(util.types.isProxy(proxy[sym].this_is)).toBe(false);
	expect(util.types.isProxy(proxy.obj)).toBe(true);
	expect(util.types.isProxy(proxy.obj.this_is)).toBe(true);

	let this_is = proxy.obj.this_is; //reference to proxy
	desc.value = 5;
	Object.defineProperty(proxy, 'obj', cloneDeep(desc)); //overwrite existing property 'obj'

	setTimeout(() => {
		expect(isRevoked(this_is)).toBe(true);
		done();
	}, 100);
});

test('4. Proxies should contain built-in functions', () => {
	let proxy = new Proxserve(cloneDeep(testObject));

	expect(typeof proxy.on).toBe('function');
	expect(typeof proxy.$on).toBe('function');
	expect(typeof proxy.removeListener).toBe('function');
	expect(typeof proxy.$removeListener).toBe('function');
	expect(typeof proxy.removeAllListeners).toBe('function');
	expect(typeof proxy.$removeAllListeners).toBe('function');
	expect(typeof proxy.stop).toBe('function');
	expect(typeof proxy.$stop).toBe('function');
	expect(typeof proxy.block).toBe('function');
	expect(typeof proxy.$block).toBe('function');
	expect(typeof proxy.activate).toBe('function');
	expect(typeof proxy.$activate).toBe('function');
	expect(typeof proxy.getOriginalTarget).toBe('function');
	expect(typeof proxy.$getOriginalTarget).toBe('function');
	expect(typeof proxy.getProxserveInstance).toBe('function');
	expect(typeof proxy.$getProxserveInstance).toBe('function');

	expect(typeof proxy.level1_1.arr1.on).toBe('function');
	expect(typeof proxy.level1_1.arr1.$on).toBe('function');
	expect(typeof proxy.level1_1.arr1.removeListener).toBe('function');
	expect(typeof proxy.level1_1.arr1.$removeListener).toBe('function');
	expect(typeof proxy.level1_1.arr1.removeAllListeners).toBe('function');
	expect(typeof proxy.level1_1.arr1.$removeAllListeners).toBe('function');
	expect(typeof proxy.level1_1.arr1.stop).toBe('function');
	expect(typeof proxy.level1_1.arr1.$stop).toBe('function');
	expect(typeof proxy.level1_1.arr1.block).toBe('function');
	expect(typeof proxy.level1_1.arr1.$block).toBe('function');
	expect(typeof proxy.level1_1.arr1.activate).toBe('function');
	expect(typeof proxy.level1_1.arr1.$activate).toBe('function');
});

test('5. Basic events of changes', (done) => {
	let proxy = new Proxserve(cloneDeep(testObject));
	proxy.on('create', function(change) {
		expect(change.oldValue).toBe(undefined);
		expect(change.value).toBe(5);
		expect(change.path).toBe('.new');
		expect(change.type).toBe('create');
		part2();
	});
	proxy.new = 5;

	function part2() {
		proxy.removeAllListeners();
		proxy.on('update', function(change) {
			expect(change.oldValue).toBe(0);
			expect(change.value).toBe(5);
			expect(change.path).toBe('.level1_1.arr1[0]');
			expect(change.type).toBe('update');
			part3();
		});
		proxy.level1_1.arr1[0] = 5;
	}

	function part3() {
		proxy.removeAllListeners();
		proxy.on('delete', function(change) {
			expect(change.oldValue).toEqual([5,1,2]);
			expect(change.value).toBe(undefined);
			expect(change.path).toBe('.level1_1.arr1');
			expect(change.type).toBe('delete');
			part4();
		});
		delete proxy.level1_1.arr1; //triggers internal destroy timeout of 1 second
	}

	function part4() {
		proxy.removeAllListeners();
		proxy.on('change', function(changes) {
			expect(changes).toEqual([{
				oldValue: undefined, value: 5, path: '.new2', type: 'create'
			},{
				oldValue: 5, value: 7, path: '.new2', type: 'update'
			},{
				oldValue: 7, value: undefined, path: '.new2', type: 'delete'
			}]);
			setImmediate(done);
		});
		proxy.new2 = 5;
		proxy.new2 = 7;
		delete proxy.new2;
	}
});

test('6. Delay of events', (done) => {
	let proxy = new Proxserve(cloneDeep(testObject), { delay: 0 });
	let changes = [];
	proxy.on('change', function(change) {
		changes.push(1);
	});
	proxy.num = 5;
	expect(changes.length).toBe(1); //should happen immediately. without setTimeout(0) or anything like that
	proxy.num++;
	expect(changes.length).toBe(2);

	proxy = new Proxserve(cloneDeep(testObject), { delay: 10 });
	changes.length = 0;
	proxy.on('change', function(batchOfChanges) {
		changes.push(...batchOfChanges);
	});
	proxy.num = 5;
	expect(changes.length).toBe(0);
	proxy.num++;
	expect(changes.length).toBe(0);
	setTimeout(() => {
		expect(changes.length).toBe(2);
		setImmediate(part2);
	}, 20);

	function part2() {
		proxy = new Proxserve(cloneDeep(testObject), { delay: 500 });
		changes.length = 0;
		proxy.on('change', function(batchOfChanges) {
			changes.push(...batchOfChanges);
		});
		proxy.num = 5;
		expect(changes.length).toBe(0);
		proxy.num++;
		expect(changes.length).toBe(0);
		delete proxy.num;
		expect(changes.length).toBe(0);
		setTimeout(() => {
			expect(changes.length).toBe(0);
		}, 400);
		setTimeout(() => {
			expect(changes.length).toBe(3);
			done();
		}, 520);
	}
});

test('7. Stop/Block/Activate proxies', () => {
	let proxy = new Proxserve(cloneDeep(testObject), {delay:0});
	let numberOfEmits = 0;
	proxy.on('change', function(changes) {
		numberOfEmits++;
	});
	proxy.level1_1.arr1[1] = 12;
	expect(numberOfEmits).toBe(1);

	proxy.stop();
	proxy.level1_1.arr1[1] = 13;
	expect(numberOfEmits).toBe(1);

	proxy.activate();
	proxy.level1_1.arr1[1] = 14;
	expect(numberOfEmits).toBe(2);

	proxy.block();
	silentConsole();
	proxy.level1_1.arr1[1] = 555;
	wakeConsole();
	expect(proxy.level1_1.arr1[1]).toBe(14);
	expect(numberOfEmits).toBe(2);

	proxy.activate();
	proxy.level1_1.arr1[1] = 15;
	expect(proxy.level1_1.arr1[1]).toBe(15);
	expect(numberOfEmits).toBe(3);

	numberOfEmits = 0;
	proxy.removeAllListeners();
	proxy.level1_2.on('change', function(changes) {
		numberOfEmits++;
	});
	proxy.level1_2.level2_1.level3_1.on('change', function(changes) {
		numberOfEmits++;
	});
	proxy.level1_2.level2_1.level3_1.arr2[0] = 12;
	expect(numberOfEmits).toBe(2); //two listeners were called

	//test stop
	proxy.level1_2.level2_1.stop();
	proxy.level1_2.level2_1.level3_1.activate();
	proxy.level1_2.level2_1.level3_1.arr2[0] = 13;
	expect(numberOfEmits).toBe(2); //both objects inherit the 'stopped' status

	proxy.level1_2.level2_1.level3_1.activate(true);
	proxy.level1_2.level2_1.level3_1.arr2[0] = 14;
	expect(numberOfEmits).toBe(3); //only one object has the 'stopped' status

	proxy.level1_2.level2_1.level3_1.activate(); //inherits from parent again
	proxy.level1_2.level2_1.level3_1.arr2[0] = 13;
	expect(numberOfEmits).toBe(3);

	//test block
	silentConsole();
	proxy.level1_2.level2_1.block();
	proxy.level1_2.level2_1.level3_1.activate();
	proxy.level1_2.level2_1.level3_1.arr2[0] = 555;
	expect(proxy.level1_2.level2_1.level3_1.arr2[0]).toBe(13); //both objects inherit the 'blocked' status
	expect(numberOfEmits).toBe(3);

	proxy.level1_2.level2_1.level3_1.activate(true);
	proxy.level1_2.level2_1.level3_1.arr2[0] = 555;
	expect(proxy.level1_2.level2_1.level3_1.arr2[0]).toBe(555); //only one object has the 'blocked' status
	expect(numberOfEmits).toBe(5); //even though parent is 'blocked', the child did mutate and event was emitted to all parents

	proxy.level1_2.level2_1.level3_1.activate(); //inherits from parent again
	proxy.level1_2.level2_1.level3_1.arr2[0] = 14;
	expect(proxy.level1_2.level2_1.level3_1.arr2[0]).toBe(555);
	expect(numberOfEmits).toBe(5);

	proxy.block();
	proxy.level1_2.stop(); //stopped is not blocked
	proxy.level1_2.level2_1.level3_1.activate(true);
	proxy.level1_2.level2_1.level3_1.arr2[0] = 15;
	expect(proxy.level1_2.level2_1.level3_1.arr2[0]).toBe(15);
	expect(numberOfEmits).toBe(6);
	wakeConsole();
});

test('8. get/set/delete properties after defineProperty', () => {
	let origin = cloneDeep(testObject);
	let proxy = new Proxserve(origin, {delay: -950});
	let sym = Symbol.for('sym');

	let desc = {
		enumerable: false,
		configurable: true,
		writable: true,
		value: 5
	};
	let valueObj = { this_is: { inner: 'some value' } };

	Object.defineProperty(proxy, sym, cloneDeep(desc));
	Object.defineProperty(proxy, 'obj', cloneDeep(desc));
	proxy[sym] = cloneDeep(valueObj); //set
	proxy.obj = cloneDeep(valueObj); //set

	expect(util.types.isProxy(proxy[sym])).toBe(false);
	expect(util.types.isProxy(proxy[sym].this_is)).toBe(false);
	expect(util.types.isProxy(proxy.obj)).toBe(false);
	expect(util.types.isProxy(proxy.obj.this_is)).toBe(false);

	delete proxy[sym];
	delete proxy.obj; //deleting a non-proxy
	expect(proxy[sym]).toBe(undefined);
	expect(proxy.obj).toBe(undefined);

	desc.enumerable = true;
	Object.defineProperty(proxy, sym, cloneDeep(desc));
	Object.defineProperty(proxy, 'obj', cloneDeep(desc));
	proxy[sym] = cloneDeep(valueObj); //set
	proxy.obj = cloneDeep(valueObj); //set

	expect(util.types.isProxy(proxy[sym])).toBe(false); //symbol isn't proxied anyway
	expect(util.types.isProxy(proxy[sym].this_is)).toBe(false);
	expect(util.types.isProxy(proxy.obj)).toBe(true);
	expect(util.types.isProxy(proxy.obj.this_is)).toBe(true);

	delete proxy[sym];
	delete proxy.obj; //deleting a regular proxy
	expect(proxy[sym]).toBe(undefined);
	expect(proxy.obj).toBe(undefined);
});

test('9. splitPath - split path to segments', () => {
	let path = Proxserve.splitPath('.level2_1.level3_1');
	let path2 = Proxserve.splitPath('level2_1.level3_1');
	expect(path).toEqual(path2);
	expect(path).toEqual(['level2_1','level3_1']);

	path = Proxserve.splitPath('[2][2].new');
	expect(path).toEqual(['2','2','new']);

	path = Proxserve.splitPath('.new[0]');
	expect(path).toEqual(['new','0']);

	path = Proxserve.splitPath('.a');
	path2 = Proxserve.splitPath('a');
	expect(path).toEqual(path2);
	expect(path).toEqual(['a']);

	path = Proxserve.splitPath('.level2_1.level3_1.arr2[2][2].new[0]');
	expect(path).toEqual(['level2_1','level3_1','arr2','2','2','new','0']);

	path = Proxserve.splitPath('New[0]new');
	expect(path).toEqual(['New','0new']);

	path = Proxserve.splitPath('[1][0][new]');
	expect(path).toEqual(['1','0','new']);
});

test('10. evalPath - get target property of object and path', (done) => {
	let proxy = new Proxserve(cloneDeep(testObject), {delay: 0});
	proxy.on('change', function(changes) {
		let { object, property, value } = Proxserve.evalPath(this, changes[0].path);
		expect(object === proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep).toBe(true);
		expect(property).toEqual('deeper');
		expect(value).toBe('xyz');
	});
	proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.deeper = 'xyz';
	proxy.removeAllListeners();

	proxy.level1_2.on('change', function(changes) {
		let { object, property, value } = Proxserve.evalPath(this, changes[0].path);
		expect(object === proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep).toBe(true);
		expect(property).toEqual('another');
		expect(value).toBe('asdf');
	});
	proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.another = 'asdf';
	proxy.level1_2.removeAllListeners();

	proxy.level1_2.level2_1.on('change', function(changes) {
		let { object, property, value } = Proxserve.evalPath(this, changes[0].path);
		expect(object === proxy.level1_2.level2_1.level3_1.arr2[2]).toBe(true);
		expect(property).toEqual('2');
		expect(value).toEqual([0, {a: 'a'}]);
	});
	proxy.level1_2.level2_1.level3_1.arr2[2][2] = [0, {a: 'a'}];
	proxy.level1_2.level2_1.removeAllListeners();

	proxy.on('change', function(changes) {
		let { object, property, value } = Proxserve.evalPath(this, changes[0].path);
		expect(object === proxy).toBe(true);
		expect(property).toEqual('a');
		expect(value).toEqual({});
	});
	proxy.a = {};
	proxy.removeAllListeners();

	proxy.on('change', function(changes) {
		let { object, property, value } = Proxserve.evalPath(this, changes[0].path);
		expect(object === proxy.a).toBe(true);
		expect(property).toEqual('a');
		expect(value).toEqual('a');
	});
	proxy.a.a = 'a';
	proxy.removeAllListeners();

	let { object, property, value } = Proxserve.evalPath(proxy, '');
	expect(object === proxy).toBe(true);
	expect(property).toEqual(undefined);
	expect(value).toEqual(proxy);
	setImmediate(done);
});

test('11. On-change listener that makes its own changes', (done) => {
	let proxy = new Proxserve(cloneDeep(testObject));
	proxy.level1_1.arr1.on('change', function(changes) {
		if(changes.length === 3) {
			proxy.level1_1.arr1[0] = 123; //immediate change should be insterted to next round event emitting
			expect(changes.length).toBe(3); //shouldn't have changed yet
			expect(changes[0].value).toBe(17);
			expect(changes[1].value).toBe(18);
			expect(changes[2].value).toBe(19);
		} else {
			expect(changes.length).toBe(1);
			expect(changes[0].value).toBe(123);
			setImmediate(done);
		}
	});
	proxy.level1_1.arr1[0] = 17;
	proxy.level1_1.arr1[1] = 18;
	proxy.level1_1.arr1[2] = 19;
});

test('12. On/Remove/RemoveAll listeners', () => {
	let proxy = new Proxserve(cloneDeep(testObject), {delay: 0});
	let counter = 0;
	let countFunction = function(changes) {
		counter++;
	};

	proxy.on('change', countFunction, 123);
	proxy.on('change', '.new', countFunction);
	proxy.removeListener(123);
	proxy.new = {};

	expect(counter).toBe(1);

	proxy.new.on('change', '.will.exist.later', countFunction);
	proxy.new.will = { exist: { later: 0 } };
	expect(counter).toBe(3);
	proxy.new.will.exist.later = 1;
	expect(counter).toBe(5);
	proxy.new.removeListener(countFunction);
	proxy.new.will.exist.later = 2;
	expect(counter).toBe(6); //only 'on(.new.will.exist.later)' ran

	proxy.removeAllListeners('.new.will.exist.later');
	proxy.new.will.exist.later = 3;
	expect(counter).toBe(6);
});

test('13. Events for future sub objects and primitives not yet created', (done) => {
	let proxy = new Proxserve({});
	proxy.on('change', function(changes) {
		expect(changes[0].path).toBe('.arr');
		part2();
	}, 123);
	proxy.arr = [];

	function part2() {
		proxy.removeListener(123);
		proxy.arr.on('change', function(changes) {
			expect(changes.length).toBe(2);
			expect(changes[0].path).toBe('[2]');
			expect(changes[0].value).toEqual({ a: { b: 'cc' } }); //looking at a reference. [2].a.b was 'b' and then 'cc'
			expect(changes[0].type).toBe('create');
			expect(changes[1].path).toBe('[2].a.b');
			expect(changes[1].value).toBe('cc');
			expect(changes[1].type).toBe('update');

			proxy.arr.removeListener('zxc');
			this[2].a = { b: 'ddd' }; //will trigger next event again
		}, 'zxc');
		proxy.arr.on('change', '[2].a.b', function(changes) {
			if(changes.length === 2) {
				expect(changes[0].path).toBe('');
				expect(changes[0].value).toBe('b');
				expect(changes[0].type).toBe('create');
				expect(changes[1].path).toBe('');
				expect(changes[1].value).toBe('cc');
				expect(changes[1].type).toBe('update');
			}
			else if(changes.length === 1) {
				expect(changes[0].path).toBe('');
				expect(changes[0].value).toBe('ddd');
				expect(changes[0].type).toBe('update');
				part3();
			}
		});

		proxy.arr[2] = { a: { b: 'b' } };
		proxy.arr[2].a.b = 'cc';
	}

	function part3() {
		proxy.on('create', '.obj.1.2.3', function(change) { //on(create)
			expect(change.path).toBe('');
			expect(change.value).toBe(987);
			expect(change.type).toBe('create');
		});
		proxy.on('create', '.obj.1', function(change) { //on(create)
			expect(change.path).toBe('');
			expect(change.value).toEqual({ '2': { '3': 987 } });
			expect(change.type).toBe('create');
			this['2'] = { '3': 654 };
		});

		proxy.on('update', '.obj.1.2', function(change) { //on(update)
			expect(change.path).toBe('');
			expect(change.oldValue).toEqual({ '3': 987 });
			expect(change.value).toEqual({ '3': 654 });
			expect(change.type).toBe('update');
		});
		proxy.on('update', '.obj.1', function(change) { //on(update)
			expect(change.path).toBe('.2');
			expect(change.oldValue).toEqual({ '3': 987 });
			expect(change.value).toEqual({ '3': 654 });
			expect(change.type).toBe('update');
			part4();
		});

		proxy.obj = { '1': { '2': { '3': 987 } } };
	}

	function part4() {
		proxy.removeAllListeners('.obj.1.2.3');
		proxy.removeAllListeners('.obj.1.2');
		proxy.removeAllListeners('.obj.1');

		proxy.obj.on('update', function(change) {
			expect(change.path).toEqual('');
			expect(change.value).toEqual([0, [0, 1, [0, 1, 2, []] ] ]);
			expect(change.type).toBe('update');
		});
		proxy.on('update', '.obj.1', function(change) { //path-selector can be with either dots or squared parenthesis
			expect(change.path).toBe(''); //change path does match actual path
			expect(change.value).toEqual([0, 1, [0, 1, 2, []] ]);
		});
		proxy.obj.on('update', '.1[2]', function(change) { //path-selector can be with either dots or squared parenthesis
			expect(change.path).toBe(''); //change path does match actual path
			expect(change.value).toEqual([0, 1, 2, []]);
			part5();
		});

		proxy.obj = [0, [0, 1, [0, 1, 2, []] ] ];
	}

	function part5() {
		proxy.removeAllListeners('.obj.1.2'); //should still work
		proxy.removeAllListeners('.obj.1');
		proxy.removeAllListeners('.obj');

		proxy.obj.on('update', function(change) {
			expect(change.path).toEqual('');
			expect(change.oldValue).toEqual([0, [0, 1, [0, 1, 2, []] ] ]);
			expect(change.value).toBe(true);

			this.removeListener(-20);
			proxy.obj = { '1': [0, 1, ['a']] };
		}, -20);
		proxy.on('create', '.obj[1]', function(change) { //path-selector can be with either dots or squared parenthesis
			expect(change.path).toBe(''); //change path does match actual path
			expect(change.value).toEqual([0, 1, ['a']]);
		});
		proxy.obj.on('create', '[1].2', function(change) { //path-selector can be with either dots or squared parenthesis
			expect(change.path).toBe(''); //change path does match actual path
			expect(change.value).toEqual(['a']);
			setImmediate(done);
		});

		proxy.obj = true;
	}
});