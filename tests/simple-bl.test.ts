/**
 * 2023 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Simple unit tests. not CPU heavy.
 */
"use strict"

import { Proxserve } from '../src/index';
import { isProxy, isRevoked, testObject, silentConsole, wakeConsole, cloneDeep } from './common';

test('1. Initiate a proxserve and check if original object stays intact', () => {
	const origin = cloneDeep(testObject);
	let proxy = Proxserve.make(origin);
	expect(proxy).toEqual(testObject);
	expect(proxy.getOriginalTarget() === origin).toBe(true);
});

test('2. Object, child-objects and added-child-objects should convert to proxies', () => {
	let proxy = Proxserve.make(cloneDeep(testObject));
	proxy.level1_3 = {
		level2_2: [0,2,4,6],
		['two words']: { a: 0, b: 1 },
	};
	expect(isProxy(testObject)).toBe(false);
	expect(isProxy(proxy)).toBe(true);
	expect(isProxy(testObject.level1_1.arr1)).toBe(false);
	expect(isProxy(proxy.level1_1.arr1)).toBe(true);
	expect(isProxy(proxy.level1_3)).toBe(true);
	expect(isProxy(proxy.level1_3.level2_2)).toBe(true);
	expect(isProxy(proxy.level1_3['two words'])).toBe(true);
});

test('3. defineProperty should convert string/number properties to proxy', (done) => {
	let origin = cloneDeep(testObject);
	let proxy = Proxserve.make(origin, { debug: { destroyDelay: 10 } });
	let sym = Symbol.for('sym');

	let desc = {
		enumerable: false,
		configurable: true,
		writable: true,
		value: { this_is: { inner: 'some value' } }
	} as {
		enumerable: boolean;
		configurable: boolean;
		writable: boolean;
		value: any;
	};

	Object.defineProperty(proxy, sym, cloneDeep(desc));
	Object.defineProperty(proxy, 'obj', cloneDeep(desc));

	expect(isProxy(proxy[sym])).toBe(false);
	expect(isProxy(proxy.obj)).toBe(false);

	desc.enumerable = true;
	Object.defineProperty(proxy, sym, cloneDeep(desc));
	Object.defineProperty(proxy, 'obj', cloneDeep(desc));

	expect(isProxy(proxy[sym])).toBe(false); // symbol isn't proxied anyway
	expect(isProxy(proxy[sym].this_is)).toBe(false);
	expect(isProxy(proxy.obj)).toBe(true);
	expect(isProxy(proxy.obj.this_is)).toBe(true);

	let { dataNode, proxyNode } = proxy.obj.this_is.getProxserveNodes();

	desc.value = 5;
	Object.defineProperty(proxy, 'obj', cloneDeep(desc)); //overwrite existing property 'obj'

	setTimeout(() => {
		expect(isRevoked(proxyNode)).toBe(true);
		done();
	}, 30);
});

test('4. Proxies should contain built-in functions', () => {
	let proxy = Proxserve.make(cloneDeep(testObject));

	expect(typeof proxy.on).toBe('function');
	expect(typeof proxy.$on).toBe('function');
	expect(typeof proxy.level1_1.arr1.on).toBe('function');
	expect(typeof proxy.level1_1.arr1.$on).toBe('function');

	expect(typeof proxy.once).toBe('function');
	expect(typeof proxy.$once).toBe('function');
	expect(typeof proxy.level1_1.arr1.once).toBe('function');
	expect(typeof proxy.level1_1.arr1.$once).toBe('function');

	expect(typeof proxy.removeListener).toBe('function');
	expect(typeof proxy.$removeListener).toBe('function');
	expect(typeof proxy.level1_1.arr1.removeListener).toBe('function');
	expect(typeof proxy.level1_1.arr1.$removeListener).toBe('function');

	expect(typeof proxy.removeAllListeners).toBe('function');
	expect(typeof proxy.$removeAllListeners).toBe('function');
	expect(typeof proxy.level1_1.arr1.removeAllListeners).toBe('function');
	expect(typeof proxy.level1_1.arr1.$removeAllListeners).toBe('function');

	expect(typeof proxy.stop).toBe('function');
	expect(typeof proxy.$stop).toBe('function');
	expect(typeof proxy.level1_1.arr1.stop).toBe('function');
	expect(typeof proxy.level1_1.arr1.$stop).toBe('function');

	expect(typeof proxy.block).toBe('function');
	expect(typeof proxy.$block).toBe('function');
	expect(typeof proxy.level1_1.arr1.block).toBe('function');
	expect(typeof proxy.level1_1.arr1.$block).toBe('function');

	expect(typeof proxy.activate).toBe('function');
	expect(typeof proxy.$activate).toBe('function');
	expect(typeof proxy.level1_1.arr1.activate).toBe('function');
	expect(typeof proxy.level1_1.arr1.$activate).toBe('function');

	expect(typeof proxy.getOriginalTarget).toBe('function');
	expect(typeof proxy.$getOriginalTarget).toBe('function');
	expect(typeof proxy.level1_1.arr1.getOriginalTarget).toBe('function');
	expect(typeof proxy.level1_1.arr1.$getOriginalTarget).toBe('function');

	expect(typeof proxy.getProxserveNodes).toBe('function');
	expect(typeof proxy.$getProxserveNodes).toBe('function');
	expect(typeof proxy.level1_1.arr1.getProxserveNodes).toBe('function');
	expect(typeof proxy.level1_1.arr1.$getProxserveNodes).toBe('function');
});

test('5. Basic events of changes', () => {
	let proxy = Proxserve.make(cloneDeep(testObject));
	proxy.on({ event: 'create', path: '.new', listener: function(change) {
		expect(change.oldValue).toBe(undefined);
		expect(change.value).toBe(5);
		expect(change.path).toBe('');
		expect(change.type).toBe('create');
	}});
	proxy.new = 5;

	proxy.removeAllListeners();
	proxy.on({ event: 'update', deep: true, listener: function(change) {
		expect(change.oldValue).toBe(0);
		expect(change.value).toBe(5);
		expect(change.path).toBe('.level1_1.arr1[0]');
		expect(change.type).toBe('update');
	}});
	proxy.level1_1.arr1[0] = 5;

	proxy.removeAllListeners();
	proxy.on({ event: 'delete', deep: true, listener: function(change) {
		expect(change.oldValue).toEqual([5,1,2]);
		expect(change.value).toBe(undefined);
		expect(change.path).toBe('.level1_1.arr1');
		expect(change.type).toBe('delete');
	}});
	delete proxy.level1_1.arr1; //triggers internal destroy timeout of 1 second

	let counter = 0;
	proxy.removeAllListeners();
	proxy.on({ event: 'change', deep: true, listener: function(change) {
		counter++;
		if(counter === 1) {
			expect(change).toEqual({
				oldValue: undefined, value: 5, path: '.new2', type: 'create'
			});
		} else if(counter === 2) {
			expect(change).toEqual({
				oldValue: 5, value: 7, path: '.new2', type: 'update'
			});
		} else if(counter === 3) {
			expect(change).toEqual({
				oldValue: 7, value: undefined, path: '.new2', type: 'delete'
			});
		}
		else throw new Error(`shouldn't have gotten here on step #${counter}`);
	}});
	proxy.new2 = 5;
	proxy.new2 = 7;
	delete proxy.new2;

	proxy.removeAllListeners();
	counter = 0;
	proxy.on({ event: ['create','update'], deep: true, listener: function(change) {
		counter++;
		if(counter === 1) {
			expect(change).toEqual({ oldValue: undefined, value: 6, path: '.new3', type: 'create' });
		} else if(counter === 2) {
			expect(change).toEqual({ oldValue: 6, value: 8, path: '.new3', type: 'update' });
		}
		else throw new Error(`shouldn't have gotten here on step #${counter}`);
	}});
	proxy.new3 = 6;
	proxy.new3 = 8;

	proxy.removeAllListeners();
	proxy.level1_1['two words'] = { ['more words']: { a: 1 }, oneWord: 'abcd' };
	counter = 0;
	proxy.on({ path: '.level1_1.two words', event: 'change', deep: true, listener: function(change) {
		counter++;
		if(counter === 1) {
			expect(change).toEqual({ oldValue: 'abcd', value: 'efgh', path: ".oneWord", type: 'update' });
		} else if(counter === 2) {
			expect(change).toEqual({ oldValue: undefined, value: 2, path: ".more words.b", type: 'create' });
		}
		else throw new Error(`shouldn't have gotten here on step #${counter}`);
	}});
	proxy.level1_1['two words'].oneWord = 'efgh';
	proxy.level1_1['two words']['more words'].b = 2;
});

test('6. Basic events of methods', () => {
	let proxy = Proxserve.make(cloneDeep(testObject));
	// splice
	proxy.on({ event: 'splice', deep: true, listener: function(change) {
		expect(change).toEqual({
			path: '.level1_1.arr1',
			type: 'splice',
			args: { start:1, deleteCount: 1, items: [99] },
			oldValue: [0,1,2],
			value: [0,99,2]
		});
	}});
	proxy.level1_1.arr1.on({ event: 'splice', listener: function(change) {
		expect(change).toEqual({
			path: '',
			type: 'splice',
			args: { start:1, deleteCount: 1, items: [99] },
			oldValue: [0,1,2],
			value: [0,99,2]
		});
	}});
	let deleted = proxy.level1_1.arr1.splice(1, 1, 99);
	expect(deleted).toEqual([1]);

	proxy.removeAllListeners();
	proxy.removeAllListeners('.level1_1.arr1');

	//shift
	proxy.on({ event: 'shift', deep: true, listener: function(change) {
		expect(change).toEqual({
			path: '.level1_1.arr1',
			type: 'shift',
			args: {},
			oldValue: [0,99,2],
			value: [99,2]
		});
	}});
	proxy.level1_1.arr1.on({ event: 'shift', listener: function(change) {
		expect(change).toEqual({
			path: '',
			type: 'shift',
			args: {},
			oldValue: [0,99,2],
			value: [99,2]
		});
	}});
	deleted = proxy.level1_1.arr1.shift();
	expect(deleted).toBe(0);

	proxy.removeAllListeners();
	proxy.removeAllListeners('.level1_1.arr1');

	//unshift
	proxy.on({ event: 'unshift', deep: true, listener: function(change) {
		expect(change).toEqual({
			path: '.level1_1.arr1',
			type: 'unshift',
			args: { items: [0,1] },
			oldValue: [99,2],
			value: [0,1,99,2]
		});
	}});
	proxy.level1_1.arr1.on({ event: 'unshift', listener: function(change) {
		expect(change).toEqual({
			path: '',
			type: 'unshift',
			args: { items: [0,1] },
			oldValue: [99,2],
			value: [0,1,99,2]
		});
	}});
	let newLength = proxy.level1_1.arr1.unshift(0, 1);
	expect(newLength).toBe(4);
});

test('7. Stop/Block/Activate proxies', () => {
	let proxy = Proxserve.make(cloneDeep(testObject));
	let numberOfEmits = 0;
	proxy.on({ event: 'change', deep: true, listener: function(change) {
		numberOfEmits++;
	}});
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
	proxy.level1_2.on({ event: 'change', deep: true, listener: function(changes) {
		numberOfEmits++;
	}});
	proxy.level1_2.level2_1.level3_1.on({ event: 'change', deep: true, listener: function(changes) {
		numberOfEmits++;
	}});
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
	let proxy = Proxserve.make(origin, { debug: { destroyDelay: -950 } });
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

	expect(isProxy(proxy[sym])).toBe(false);
	expect(isProxy(proxy[sym].this_is)).toBe(false);
	expect(isProxy(proxy.obj)).toBe(false);
	expect(isProxy(proxy.obj.this_is)).toBe(false);

	delete proxy[sym];
	delete proxy.obj; //deleting a non-proxy
	expect(proxy[sym]).toBe(undefined);
	expect(proxy.obj).toBe(undefined);

	desc.enumerable = true;
	Object.defineProperty(proxy, sym, cloneDeep(desc));
	Object.defineProperty(proxy, 'obj', cloneDeep(desc));
	proxy[sym] = cloneDeep(valueObj); //set
	proxy.obj = cloneDeep(valueObj); //set

	expect(isProxy(proxy[sym])).toBe(false); //symbol isn't proxied anyway
	expect(isProxy(proxy[sym].this_is)).toBe(false);
	expect(isProxy(proxy.obj)).toBe(true);
	expect(isProxy(proxy.obj.this_is)).toBe(true);

	delete proxy[sym];
	delete proxy.obj; //deleting a regular proxy
	expect(proxy[sym]).toBe(undefined);
	expect(proxy.obj).toBe(undefined);
});

test('9. On-change listener that makes its own changes', () => {
	let proxy = Proxserve.make(cloneDeep(testObject));
	let counter = 0;
	proxy.level1_1.arr1.on({ event: 'change', deep: true, listener: function(change) {
		counter++;
		if(counter === 1) {
			expect(change.value).toBe(17);
			proxy.level1_1.arr1[0] = 123; // immediate change should emit immediately
		} else if(counter === 2) {
			expect(change.value).toBe(123);
		} else if(counter === 3) {
			expect(change.value).toBe(18);
		} else if(counter === 4) {
			expect(change.value).toBe(19);
		}
		else throw new Error(`shouldn't have gotten here on step #${counter}`);
	}});
	proxy.level1_1.arr1[0] = 17;
	proxy.level1_1.arr1[1] = 18;
	proxy.level1_1.arr1[2] = 19;
});

test('10. on/once/removeListener/removeAllListeners', () => {
	let proxy = Proxserve.make(cloneDeep(testObject));
	let counter = 0;
	let countFunction = function(changes) {
		counter++;
	};

	proxy.on({ event: 'change', listener: countFunction, deep: true, id: 123 });
	proxy.on({ event: 'change', path: '.new', listener: countFunction, deep: true });
	proxy.removeListener({ id: 123 });
	proxy.new = {};

	expect(counter).toBe(1);

	proxy.new.on({ event: 'change', path: '.will.exist.later', listener: countFunction });
	proxy.new.will = { exist: { later: 0 } };
	expect(counter).toBe(3);
	proxy.new.will.exist.later = 1;
	expect(counter).toBe(5);
	proxy.new.removeListener({ id: countFunction });
	proxy.new.will.exist.later = 2;
	expect(counter).toBe(6); //only 'on(.new.will.exist.later)' ran

	proxy.removeAllListeners('.new.will.exist.later');
	proxy.new.will.exist.later = 3;
	expect(counter).toBe(6);

	proxy.on({ event: 'change', listener: countFunction, deep: true });
	proxy.new.will.exist.later++;
	proxy.removeAllListeners();
	expect(counter).toBe(7);
	proxy.new.will.exist.later++;
	expect(counter).toBe(7);

	proxy.once({ event: 'change', listener: countFunction, deep: true });
	proxy.new.will.exist.later++;
	expect(counter).toBe(8);
	proxy.new.will.exist.later++;
	expect(counter).toBe(8);

	proxy.once({ event: 'update', path: '.new.will', listener: countFunction, deep: true });
	proxy.new.will.exist.later++;
	expect(counter).toBe(9);
	proxy.new.will.exist.later++;
	expect(counter).toBe(9);
});

test('11. Listen for delete event of sub-properties when parent is deleted', (done) => {
	let proxy = Proxserve.make({});
	let counter = 0;
	proxy.on({ event: 'change', path: '.obj.arr[0][0][0]', listener: function(change) {
		counter++;
		if(counter === 1) {
			expect(change.type).toBe('create');
			expect(change.value).toBe(0);
			proxy.obj.arr = [ ['aa','bb','cc'] ]; // will cause 2 delete events
		}
		else if(counter === 2) {
			expect(change.type).toBe('delete'); // event caused from previous cycle (4 code lines above)
			expect(change.oldValue).toBe(0);
			expect(change.value).toBe(undefined);
		}
		else if(counter === 4) {
			expect(change.type).toBe('create'); // event caused from this cycle, but on another listener
			expect(change.oldValue).toBe(undefined);
			expect(change.value).toBe(true);
			done();
		}
		else throw new Error(`shouldn't have gotten here on step #${counter}`);
	}});
	proxy.on({ event: 'delete', path: '.obj.arr[0][0][1]', listener: function(change) {
		setTimeout(() => { //make sure we run after the other delete event
			counter++;
			if(counter === 3) {
				expect(change.path).toBe('');
				expect(change.oldValue).toBe(1);
				proxy.obj.arr[0][0] = [true, false];
			}
			else throw new Error(`shouldn't have gotten here on step #${counter}`);
		}, 0);
	}});

	proxy.obj = {
		arr: [
			[
				[0,1]
			]
		]
	};
});

test('12. turn off methodsEmitRaw option', () => {
	let proxy = Proxserve.make([0,1], { methodsEmitRaw: true });

	let counter = 0;
	proxy.on({ event: 'change', deep: true, listener: function(change) {
		counter++;
		if(counter === 1) expect(change).toEqual({ type:'update', path:'[1]', oldValue:1, value:{a:'a'} });
		else if(counter === 2) expect(change).toEqual({ type:'create', path:'[2]', value:99 });
		else if(counter === 3) expect(change).toEqual({ type:'create', path:'[3]', value:{c:'c'} });
		else throw new Error(`shouldn't have gotten here on step #${counter}`);
	}});
	proxy.splice(1, 1, {a:'a'}, 99, {c:'c'});

	proxy.removeAllListeners();
	counter = 0;
	proxy.on({ event: 'change', deep: true, listener: function(change) {
		counter++;
		if(counter === 1) expect(change).toEqual({ type:'create', path:'[4]', value:{c:'c'} });
		else if(counter === 2) expect(change).toEqual({ type:'update', path:'[3]', oldValue:{c:'c'}, value:99 });
		else if(counter === 3) expect(change).toEqual({ type:'update', path:'[2]', oldValue:99, value:{a:'a'} });
		else if(counter === 4) expect(change).toEqual({ type:'update', path:'[1]', oldValue:{a:'a'}, value:0 });
		else if(counter === 5) expect(change).toEqual({ type:'update', path:'[0]', oldValue:0, value:{b:'b'} });
		else throw new Error(`shouldn't have gotten here on step #${counter}`);
	}});
	proxy.unshift({b:'b'});

	proxy.removeAllListeners();
	counter = 0;
	proxy.on({ event: 'change', deep: true, listener: function(change) {
		counter++;
		if(counter === 1) expect(change).toEqual({ type:'update', path:'[0]', oldValue:{b:'b'}, value:0 });
		else if(counter === 2) expect(change).toEqual({ type:'update', path:'[1]', oldValue:0, value:{a:'a'} });
		else if(counter === 3) expect(change).toEqual({ type:'update', path:'[2]', oldValue:{a:'a'}, value:99 });
		else if(counter === 4) expect(change).toEqual({ type:'update', path:'[3]', oldValue:99, value:{c:'c'} });
		else if(counter === 5) expect(change).toEqual({ type:'delete', path:'[4]', oldValue:{c:'c'} });
		else if(counter === 6) expect(change).toEqual({ type:'update', path:'[length]', oldValue:5, value:4 });

		else if(counter === 7) expect(change).toEqual({ type:'update', path:'[0]', oldValue:0, value:{a:'a'} });
		else if(counter === 8) expect(change).toEqual({ type:'update', path:'[1]', oldValue:{a:'a'}, value:99 });
		else if(counter === 9) expect(change).toEqual({ type:'update', path:'[2]', oldValue:99, value:{c:'c'} });
		else if(counter === 10) expect(change).toEqual({ type:'delete', path:'[3]', oldValue:{c:'c'} });
		else if(counter === 11) expect(change).toEqual({ type:'update', path:'[length]', oldValue:4, value:3 });
		else throw new Error(`shouldn't have gotten here on step #${counter}`);
	}});
	//this is a very(!) important test because it also switches between primitives and proxies several times and checks
	//that there is no contradiction between received dataNode's value to dataNode.objects' value of deleted proxies
	proxy.shift();
	proxy.shift();
});

test('13. Assign unproxified sub-objects', () => {
	const proxy = Proxserve.make(cloneDeep(testObject));
	const subObj = {
		level3_1: {
			_$level4_1: {}
		}
	};

	proxy.level1_2.on({ event: 'update', path: '.level2_2.level3_1._$level4_1', listener: function(change) {
		throw new Error('Should not reach here!');
	}});

	proxy.level1_2.level2_2 = subObj; // invokes the captureEmit phase, with change type of 'create'.

	expect(isProxy(proxy.level1_2.level2_2)).toBe(true);
	expect(isProxy(proxy.level1_2.level2_2.level3_1)).toBe(true);
	expect(isProxy(proxy.level1_2.level2_2.level3_1._$level4_1)).toBe(false);

	proxy.level1_2.level2_2.level3_1._$level4_1.subArr = [];
	proxy.level1_2.level2_2.level3_1._$level4_1.subArr.push(0);
	proxy.level1_2.level2_2.level3_1._$level4_1.subPrimitive = 11;
	proxy.level1_2.level2_2.level3_1._$level4_1.subPrimitive = 'abc';
	proxy.level1_2.level2_2.level3_1._$level4_1 = [];
	proxy.level1_2.level2_2.level3_1._$level4_1.push('z');
});
