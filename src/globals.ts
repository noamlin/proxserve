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
export enum eventNames {
	create = 'create',
	update = 'update',
	delete = 'delete',
	splice = 'splice',
	shift = 'shift',
	unshift = 'unshift',
};

export type SomeObject = {
	[key: string | number | symbol]: any,
};
export type SomeProxy = {
	[ND]: ProxyNode[typeof ND],
	[NID]: ProxyNode[typeof NID],
	[property: string]: any,
};
export type SomeArray = Array<any>;
export type TargetVariable = SomeObject | SomeArray;

// theoretically can have any string possible as a type. but these are the most common and they help our TS autocomplete
export type variableTypes = 'Object'|'Array'|'Number'|'String'|'Boolean'|'Null'|'Undefined'|'BigInt'|'Symbol'|'Date';

export type ListenerData = {
	type: eventNames[],
	once: boolean,
	func: Function,
	id?: string | number;
};

export type DeferredEvent = {
	dataNode: DataNode,
	change: ChangeEvent,
	shouldCapture: boolean,
};

export type ChangeEvent = {
	path: string,
	value: any,
	oldValue: any,
	type: eventNames,
	args?: {
		start?: number;
		deleteCount?: number;
		items?: any[];
	},
};

export interface DataNode {
	// Node Inherited Data
	[NID]: {
		status?: nodeStatuses;
	};
	// Node Data
	[ND]: {
		proxyNode: ProxyNode;
		parentNode: DataNode;
		listeners: {
			shallow: ListenerData[];
			deep: ListenerData[];
		},
		path: string;
		propertyPath: string;
		deferredEvents?: DeferredEvent[];
		isTreePrototype?: boolean;
	};
};

export interface ProxyNode {
	[NID]: {
		status?: proxyStatuses;
	};
	[ND]: {
		target: TargetVariable;
		dataNode: DataNode;
		proxy?: SomeProxy;
		revoke?: () => void;
		isTreePrototype?: boolean;
	};
	[property: string]: ProxyNode;
};

export interface ProxserveInterface {
	strict: boolean;
	emitMethods: boolean;
	destroyDelay: number;
	dataTree: DataNode;
	proxyTree: ProxyNode;
	createProxy(parentDataNode: DataNode, targetProperty?: string): SomeProxy;
}