"use strict"

const Proxserve = require('./index.js');

let prox = new Proxserve({
	test1: {
		test2: {
			num: 5
		}
	},
	num: 6
});

prox.test1.test2.num = [{'a':'a', arr:[0,1,2]}];
console.log(prox.test1.test2.num[0].arr[1]);