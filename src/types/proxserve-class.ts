import { ND, NID, nodeStatuses, proxyStatuses } from '../globals';
import { TargetVariable, ListenerData, DeferredEvent } from './globals';
import {
	StopFunction, BlockFunction, ActivateFunction,
	OnFunction, OnceFunction,
	RemoveListenerFunction, RemoveAllListenersFunction,
	GetOriginalTargetFunction, GetProxserveNodesFunction,
} from './pseudo-methods';

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

export interface ProxserveInstanceMetadata {
	/**
	 * should destroy detached child-objects or deleted properties automatically
	 */
	strict: boolean;
	/**
	 * should emit one event for splice, shift and unshift or else emit all internal CRUD events
	 */
	emitMethods: boolean;
	/**
	 * delay before destroying a detached child-object
	 */
	destroyDelay: number;
	dataTree: DataNode;
	proxyTree: ProxyNode;
}

export type PseudoThis = {
	metadata: ProxserveInstanceMetadata,
	dataNode: DataNode,
	proxyNode: ProxyNode
};

// extending `PseudoThis` is a hack to let typescript compile and interpret correctly even though
// the methods have a completely different `this` than of the properties and methods of the `ProxserveInstance`
export type ProxserveInstance = PseudoThis & {
	/**
	 * for internal use - the node's data
	 */
	[ND]: ProxyNode[typeof ND];
	/**
	 * for internal use - the node's inherited data
	 */
	[NID]: ProxyNode[typeof NID];

	stop: StopFunction; $stop: StopFunction;
	block: BlockFunction; $block: BlockFunction;
	activate: ActivateFunction; $activate: ActivateFunction;
	on: OnFunction; $on: OnFunction;
	once: OnceFunction; $once: OnceFunction;
	removeListener: RemoveListenerFunction; $removeListener: RemoveListenerFunction;
	removeAllListeners: RemoveAllListenersFunction; $removeAllListeners: RemoveAllListenersFunction;
	getOriginalTarget: GetOriginalTargetFunction; $getOriginalTarget: GetOriginalTargetFunction;
	getProxserveNodes: GetProxserveNodesFunction; $getProxserveNodes: GetProxserveNodesFunction;

	[property: string | number | symbol]: any;
}
