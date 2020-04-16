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

test('Initiate a proxserve and check if original object stays intact', () => {
	let proxy = new Proxserve(cloneDeep(testObject));
	expect(proxy).toEqual(testObject);
});

test('Object, child-objects and added-child-objects should convert to proxies', () => {
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

test('Proxies should contain built-in functions', () => {
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

test('Basic events of changes', (done) => {
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

test('Delay of events', (done) => {
	let proxy = new Proxserve(cloneDeep(testObject), {delay:0});
	let changes = [];
	proxy.on('change', function(change) {
		changes.push(1);
	});
	proxy.num = 5;
	expect(changes.length).toBe(1); //should happen immediately. without setTimeout(0) or anything like that
	proxy.num++;
	expect(changes.length).toBe(2);

	proxy = new Proxserve(cloneDeep(testObject), {delay:10});
	changes.length = 0;
	proxy.on('change', function(change) {
		changes.push(1);
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
		proxy = new Proxserve(cloneDeep(testObject), {delay:500});
		changes.length = 0;
		proxy.on('change', function(change) {
			changes.push(1);
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

test('Destroy proxy and sub-proxies', (done) => {
	let proxy = new Proxserve(cloneDeep(testObject), {delay:-950}); //hack to decrease the 1000ms delay of destroy
	Proxserve.destroy(proxy);
	expect(isRevoked(proxy)).toBe(false); //will live for 1000 - 950 ms
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
		proxy = new Proxserve(cloneDeep(testObject), {delay:-950});
		let reference2level3 = proxy.level1_2.level2_1.level3_1;
		let reference2arr2 = reference2level3.arr2;
		proxy.level1_2 = 5;

		let reference2arr1 = proxy.level1_1.arr1;
		delete proxy.level1_1.arr1;

		setTimeout(() => {
			expect(isRevoked(reference2level3)).toBe(true);
			expect(isRevoked(reference2arr2)).toBe(true);
			expect(typeof proxy.level1_1.arr1).toBe('undefined');
			expect(isRevoked(reference2arr1)).toBe(true);
			done();
		}, 100);
	}
});

test('Keep using proxies after deletion/detachment in non-strict instantiation', (done) => {
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

test('Observe on referenced changes and cloned changes', (done) => {
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
test('Proxserve 50,000 objects in less than 1 second', () => {
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
});

//benchmark on a CPU with baseclock of 3.6 GHz is around 0.9s
test('Destroy 50,000 proxserves in less than 1.5 seconds', (done) => {
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
		expect(end - start - 20).toBeLessThan(1500);
		done();
	}, 20);
});

test('Comprehensive events of changes', (done) => {
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

test('splitPath - split path to segments', () => {
	let path = Proxserve.splitPath('.level2_1.level3_1');
	expect(path).toEqual(['level2_1','level3_1']);

	path = Proxserve.splitPath('[2][2].new');
	expect(path).toEqual(['2','2','new']);

	path = Proxserve.splitPath('.new[0]');
	expect(path).toEqual(['new','0']);

	path = Proxserve.splitPath('.a');
	expect(path).toEqual(['a']);

	path = Proxserve.splitPath('.level2_1.level3_1.arr2[2][2].new[0]');
	expect(path).toEqual(['level2_1','level3_1','arr2','2','2','new','0']);

	path = Proxserve.splitPath('New[0]new');
	expect(path).toEqual(['ew','0new']);

	path = Proxserve.splitPath('[1][0][new]');
	expect(path).toEqual(['1','0','new']);
});

test('getPathTarget - get target property of object and path', (done) => {
	let proxy = new Proxserve(cloneDeep(testObject), {delay: 0});
	proxy.on('change', function(changes) {
		let obj = Proxserve.getPathTarget(this, changes[0].path);
		expect(obj).toEqual('xyz');
	});
	proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.deeper = 'xyz';
	proxy.removeAllListeners();

	proxy.level1_2.on('change', function(changes) {
		let obj = Proxserve.getPathTarget(this, changes[0].path);
		expect(obj).toEqual('asdf');
	});
	proxy.level1_2.level2_1.level3_1.arr2[2][2][1].deep.another = 'asdf';
	proxy.level1_2.removeAllListeners();

	proxy.level1_2.level2_1.on('change', function(changes) {
		let obj = Proxserve.getPathTarget(this, changes[0].path);
		expect(obj).toEqual([0, {a: 'a'}]);
		done();
	});
	proxy.level1_2.level2_1.level3_1.arr2[2][2] = [0, {a: 'a'}];
	proxy.level1_2.level2_1.removeAllListeners();

	proxy.on('change', function(changes) {
		let obj = Proxserve.getPathTarget(this, changes[0].path);
		expect(obj).toEqual({});
	});
	proxy.a = {};
	proxy.removeAllListeners();

	proxy.on('change', function(changes) {
		let obj = Proxserve.getPathTarget(this, changes[0].path);
		expect(obj).toEqual('a');
	});
	proxy.a.a = 'a';
	proxy.removeAllListeners();
});