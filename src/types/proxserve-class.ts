import { ND, NID, NODE_STATUSES, PROXY_STATUSES } from '../globals';
import { TargetVariable, ListenerData, DeferredEvent } from './globals';
import {
	StopFunction, BlockFunction, ActivateFunction,
	OnFunction, OnceFunction,
	RemoveListenerFunction, RemoveAllListenersFunction,
	GetOriginalTargetFunction, GetProxserveNodesFunction, GetProxserveNameFunction, WhoAMI,
} from './pseudo-methods';

/** a permanent node that holds data about the "location" in the tree */
export interface DataNode {
	// Node Inherited Data
	[NID]: {
		status?: NODE_STATUSES;
		name: string;
	};
	// Node Data
	[ND]: {
		proxyNode?: ProxyNode;
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
	[childNode: string]: DataNode;
};

/**
 * a node that holds data about the proxy-object
 * and lives and dies with the specific proxy-object.
 */
export interface ProxyNode {
	[NID]: {
		status?: PROXY_STATUSES;
	};
	[ND]: {
		target: TargetVariable;
		dataNode: DataNode;
		isTreePrototype?: boolean;
		// the following is optional because `on()` may create dataNodes for paths that
		// don't exist yet and have no ProxserveInstance assigned to them yet.
		proxy?: ProxserveInstance;
		revoke?: () => void;
	};
	[childNode: string]: ProxyNode;
};

export interface ProxserveInstanceMetadata {
	/** should destroy detached child-objects or deleted properties automatically */
	strict: boolean;
	/**
	 * should splice, shift or unshift emit raw events of all internal CRUD events
	 * or emit one signle event named after the method.
	 */
	methodsEmitRaw: boolean;
	/** delay before destroying a detached child-object */
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
	/** for internal use - the node's data */
	[ND]: ProxyNode[typeof ND];
	/** for internal use - the node's inherited data */
	[NID]: ProxyNode[typeof NID];

	stop: StopFunction; $stop: StopFunction;
	block: BlockFunction; $block: BlockFunction;
	activate: ActivateFunction; $activate: ActivateFunction;
	on: OnFunction; $on: OnFunction;
	once: OnceFunction; $once: OnceFunction;
	removeListener: RemoveListenerFunction; $removeListener: RemoveListenerFunction;
	removeAllListeners: RemoveAllListenersFunction; $removeAllListeners: RemoveAllListenersFunction;
	getOriginalTarget: GetOriginalTargetFunction; $getOriginalTarget: GetOriginalTargetFunction;
	getProxserveName: GetProxserveNameFunction; $getProxserveName: GetProxserveNameFunction;
	whoami: WhoAMI; $whoami: WhoAMI;
	getProxserveNodes: GetProxserveNodesFunction; $getProxserveNodes: GetProxserveNodesFunction;

	[property: string | number | symbol]: any;
}
