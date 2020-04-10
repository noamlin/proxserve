"use strict"

const Proxserve = require('./index.js');

let prox = new Proxserve({
	test1: {
		test2: {
			rnd: 5
		}
	},
	num: 6
});

prox.test1.test2.rnd = [
	{
		'aKey':'a',
		arr: [0,1,2]
	},
	{
		'bKey':'b',
		arr: [5,6,[7,8,[9,10] ] ]
	}
];
prox.test1.test2.rnd[2] = ['n','m'];

function onChange(change) {
	console.log('current object: ', this);
	console.log('change: ', change);
	console.log('----');
	
}
// prox.test1.test2.rnd[1].arr[2][2].on('change', onChange);
// prox.test1.test2.rnd.on('change', onChange);
// prox.test1.test2.on('change', onChange);
// prox.test1.on('change', onChange);
prox.on('change', onChange);

// prox.test1.test2.rnd[1].arr[2][2][1]++;
// delete prox.test1.test2.rnd[1].arr[2][2][1];
// prox.test1.test2.rnd[1].arr[2][2][1] = 20;
// prox.test1.test2.rnd[1].arr[2][2][2] = 30;
// prox.test1.test2.rnd[1].arr[2][2].splice(1,1,...[1,2,3,4]);
prox.test1.test2.rnd[1].bKey = 'c';
delete prox.test1.test2.rnd;
prox.test1.test2.new = 'this is new';
delete prox.test1.test2;