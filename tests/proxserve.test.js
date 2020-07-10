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

test('3. defineProperty should convert string/number properties to proxy', () => {
	let origin = cloneDeep(testObject);
	let proxy = new Proxserve(origin);
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
		setImmediate(part2);
	});
	proxy.new = 5;

	function part2() {
		proxy.removeAllListeners();
		proxy.on('update', function(change) {
			expect(change.oldValue).toBe(0);
			expect(change.value).toBe(5);
			expect(change.path).toBe('.level1_1.arr1[0]');
			expect(change.type).toBe('update');
			setImmediate(part3);
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
			setImmediate(part4);
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
			done();
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
	let proxy = new Proxserve(origin);
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

test('9. Destroy proxy and sub-proxies', (done) => {
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
		Proxserve.destroy(proxy.level1_2);
		expect(isRevoked(proxy.level1_2)).toBe(false); //will live for 1 more second
		setTimeout(() => {
			expect(isRevoked(proxy)).toBe(false);
			expect(isRevoked(proxy.level1_2)).toBe(true);
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
			done();
		}, 100);
	}
});
if(false) {
test('10. Dont revoke sub-proxies that are still in use in the main proxy after a deletion', (done) => {
	let proxy = new Proxserve({
		sub_obj: {
			sub_arr: [{a:'a'}, {b:'b'}, {c:'c'}, {d:'d'}]
		}
	}, {delay:-950}); //hack to decrease the 1000ms delay of destroy
	expect(isRevoked(proxy.sub_obj.sub_arr[2])).toBe(false);
	
	//will delete cell at index 1 and then copy 2 to 1 and move 3 to 2 and then delete cell index 3 and update length
	proxy.sub_obj.sub_arr.splice(1, 1);
	
	setTimeout(() => {
		expect(isRevoked(proxy.sub_obj.sub_arr[2])).toBe(false);
		done();//part2();
	}, 100);

	function part2() {
		proxy = new Proxserve(cloneDeep(testObject), {delay:-950});
		let reference2level3 = proxy.level1_2.level2_1.level3_1;
		let reference2arr2 = reference2level3.arr2;
		Proxserve.destroy(proxy.level1_2);
		expect(isRevoked(proxy.level1_2)).toBe(false); //will live for 1 more second
		setTimeout(() => {
			expect(isRevoked(proxy)).toBe(false);
			expect(isRevoked(proxy.level1_2)).toBe(true);
			expect(isRevoked(reference2level3)).toBe(true);
			expect(isRevoked(reference2arr2)).toBe(true);
			part3();
		}, 100);
	}
});
}
test('11. Keep using proxies after deletion/detachment in non-strict instantiation', (done) => {
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

test('12. Observe on referenced changes and cloned changes', (done) => {
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
test('13. Proxserve 50,000 objects in less than 1 second', () => {
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
test('14. Destroy 50,000 proxserves in less than 1.5 seconds', (done) => {
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

test('15. Comprehensive events of changes', (done) => {
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

test('16. splitPath - split path to segments', () => {
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

test('17. evalPath - get target property of object and path', (done) => {
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
	done();
});

test('18. On-change listener that makes its own changes', (done) => {
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
			done();
		}
	});
	proxy.level1_1.arr1[0] = 17;
	proxy.level1_1.arr1[1] = 18;
	proxy.level1_1.arr1[2] = 19;
});