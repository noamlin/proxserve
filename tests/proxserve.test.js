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
		let changes = [];
		proxy.removeAllListeners();
		proxy.on('change', function(change) {
			changes.push(change);
		});
		proxy.new2 = 5;
		proxy.new2 = 7;
		delete proxy.new2;

		setTimeout(() => {
			expect(changes).toEqual([{
				oldValue: undefined, value: 5, path: '.new2', type: 'create'
			},{
				oldValue: 5, value: 7, path: '.new2', type: 'update'
			},{
				oldValue: 7, value: undefined, path: '.new2', type: 'delete'
			}]);
			done();
		}, 20);
	}
});

test('Delay of events', (done) => {
	let proxy = new Proxserve(cloneDeep(testObject), 0);
	let changes = [];
	proxy.on('change', function(change) {
		changes.push(1);
	});
	proxy.num = 5;
	expect(changes.length).toBe(1);
	proxy.num++;
	expect(changes.length).toBe(2);

	proxy = new Proxserve(cloneDeep(testObject), 10);
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
		part2();
	}, 20);

	function part2() {
		proxy = new Proxserve(cloneDeep(testObject), 500);
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
	let proxy = new Proxserve(cloneDeep(testObject));
	Proxserve.destroy(proxy);
	expect(isRevoked(proxy)).toBe(false); //will live for 1 more second
	setTimeout(() => {
		expect(isRevoked(proxy)).toBe(true);
		part2();
	}, 1100);

	function part2() {
		proxy = new Proxserve(cloneDeep(testObject));
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
		}, 1100);
	}

	function part3() {
		proxy = new Proxserve(cloneDeep(testObject));
		let reference2level3 = proxy.level1_2.level2_1.level3_1;
		let reference2arr2 = reference2level3.arr2;
		proxy.level1_2 = 5;
		setTimeout(() => {
			expect(isRevoked(reference2level3)).toBe(true);
			expect(isRevoked(reference2arr2)).toBe(true);
			done();
		}, 1100);
	}
});

//tested on a CPU with baseclock of 3.6 GHz
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

//tested on a CPU with baseclock of 3.6 GHz
test('Destroy 50,000 proxserves in less than 1.5 seconds', (done) => {
	let objectsInTest = deepCountObjects(testObject);
	let repeatitions = Math.ceil(50000 / objectsInTest);
	let proxies = [];

	for(let i=0; i < repeatitions; i++) {
		proxies.push(new Proxserve(cloneDeep(testObject), -1000)); //hack to negate the 1000ms delay of destroy
	}

	let start = Date.now();
	for(let i=0; i < repeatitions; i++) {
		Proxserve.destroy(proxies[i]);
	}
	setTimeout(() => {
		let end = Date.now();
		expect(end - start).toBeLessThan(1500);
		done();
	}, 5);
});