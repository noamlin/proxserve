/**
 * Copyright 2021 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
"use strict"

export const ND = Symbol.for('proxserve_node_data'); // key for the data of a node
export const NID = Symbol.for('proxserve_node_inherited_data'); // key for the inherited data of a node

// acceptable types to be proxied
export const proxyTypes = {
	"Object": true,
	"Array": true,
};

// statuses of data-nodes
export enum nodeStatuses {
	ACTIVE = 'active',
	STOPPED = 'stopped',
	BLOCKED = 'blocked',
	SPLICING = 'splicing',
};

// statuses of proxies
export enum proxyStatuses {
	ALIVE = 'alive',
	DELETED = 'deleted',
	REVOKED = 'revoked',
};

// event names that can be emitted
export enum eventNamesObject {
	create = 'create',
	update = 'update',
	delete = 'delete',
	splice = 'splice',
	shift = 'shift',
	unshift = 'unshift',
};