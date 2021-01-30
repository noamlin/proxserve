"use strict"

const Proxserve = require('./dist/proxserve.js');

var revocable = Proxy.revocable({}, { get: function(target, name) { return "[[" + name + "]]"; } });
var proxy = revocable.proxy;

console.log(proxy.foo); // "[[foo]]"

revocable.revoke();

try {
	console.log(proxy.foo); // TypeError is thrown
} catch(err) {
	console.log(err.message);
}

var revocable2 = Proxy.revocable(proxy, {
	get: function(target, name) {
		return "[[" + name + "]]";
	}
});
// proxy.foo = 1           // TypeError again
// delete proxy.foo;       // still TypeError
// typeof proxy            // "object", typeof doesn't trigger any trap

/*
const obj = new Proxserve({ arr: [] });
obj.arr[0] = { v: [0] };
obj.arr[1] = { v: [1] };
obj.arr[2] = { v: [2] };

obj.arr.on('change', function(changes) {
	console.log('MAIN:');
	console.log(changes);
});
obj.arr[1].v.on('change', function(changes) {
	console.log('ITEM:');
	console.log(changes);
});

obj.arr.splice(1, 1, { v: [3] }, { v: [4] });*/