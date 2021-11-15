/**
 * Copyright 2021 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { ND, NID, nodeStatuses, proxyStatuses } from './globals';

export type eventNames = 'create'|'update'|'delete'|'splice'|'shift'|'unshift';

export type SomeObject = {
	[key: string | number | symbol]: any,
};
export type SomeArray = Array<any>;
export type TargetVariable = SomeObject | SomeArray;

export interface ProxserveInstanceMetadata {
	/**
	 * should destroy detached child-objects or deleted properties automatically
	 */
	strict: boolean;
	/**
	 * should splice, shift or unshift emit one event or all internal CRUD events
	 */
	emitMethods: boolean;
	/**
	 * delay before destroying a detached child-object
	 */
	destroyDelay: number;
	dataTree: DataNode;
	proxyTree: ProxyNode;
}

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
		proxy?: ProxserveInstance;
		revoke?: () => void;
		isTreePrototype?: boolean;
	};
	[property: string]: ProxyNode;
};

export type PseudoThis = {
	metadata: ProxserveInstanceMetadata,
	dataNode: DataNode,
	proxyNode: ProxyNode
};

/**
 * stop object and children from emitting change events
 */
export type StopFunction = () => void;
/**
 * block object and children from any changes.
 * user can't set nor delete any property
 */
export type BlockFunction = () => void;
/**
 * resume default behavior of emitting change events, inherited from parent
 * @param force - force being active regardless of parent
 */
export type ActivateFunction = (force?: boolean) => void;

/**
 * add event listener on a proxy or on a descending path
 * 
 * @param args.events - event name or several event names
 * @param args.path - path selector
 * @param args.listener - listener function
 * @param args.options.deep - should listen for event emitted by sub-objects or not
 * @param args.options.id - identifier for removing this listener later
 * @param args.options.once - whether this listener will run only once or always
 */
export type OnFunction = (
	args: {
		events: eventNames | eventNames[],
		path?: string,
		listener: (this: ProxserveInstance, change: ChangeEvent) => void,
		options?: {
			deep?: boolean;
			id?: number | string;
			once?: boolean;
		}
	}
) => void;
/**
 * just like `on` but the listener will run only once
 * @see on() function
 */
export type OnceFunction = OnFunction;
/**
 * removes a listener from a path by an identifier (can have multiple listeners with the same ID)
 * or by the listener function itself
 * 
 * @param args.path - path selector
 * @param args.id - the listener(s) identifier or listener-function
 */
export type RemoveListenerFunction = (args: { path?: string, id: string | number | Function }) => void;
/**
 * removing all listeners of a path
 * 
 * @param args.path - path selector
 */
export type RemoveAllListenersFunction = (path?: string) => void;
/**
 * get original variable that is behind the proxy
 */
export type GetOriginalTargetFunction = () => TargetVariable;
/**
 * get the data-node of a proxy (which holds all meta data)
 * and also get proxy-node of a proxy (which holds all related objects)
 */
export type GetProxserveNodesFunction = () => { dataNode: DataNode, proxyNode: ProxyNode };

export interface ProxserveInstance {
	/**
	 * for internal use - the node's data
	 */
	[ND]: ProxyNode[typeof ND];
	/**
	 * for internal use - the node's inherited data
	 */
	[NID]: ProxyNode[typeof NID];

	stop: StopFunction;
	block: BlockFunction;
	activate: ActivateFunction;
	on: OnFunction;
	once: OnceFunction;
	removeListener: RemoveListenerFunction;
	removeAllListeners: RemoveAllListenersFunction;
	getOriginalTarget: GetOriginalTargetFunction;
	getProxserveNodes: GetProxserveNodesFunction;

	[property: string | number | symbol]: any;
}