/**
* 2022 Noam Lin <noamlin@gmail.com>
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
* 
* Proxy-methods (like shift, splice) unit tests.
*/
"use strict"

import { Proxserve } from '../src/index';

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
