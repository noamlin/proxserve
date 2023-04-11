import { ND, NID, NODE_STATUSES, PROXY_STATUSES } from '../globals';
import { TargetVariable, ListenerData, DeferredEvent } from './globals';
import { StopFunction, BlockFunction, ActivateFunction, OnFunction, OnceFunction, RemoveListenerFunction, RemoveAllListenersFunction, GetOriginalTargetFunction, GetProxserveNodesFunction, GetProxserveNameFunction, WhoAMI } from './pseudo-methods';
/** a permanent node that holds data about the "location" in the tree */
export interface DataNode {
    [NID]: {
        status?: NODE_STATUSES;
        name: string;
    };
    [ND]: {
        proxyNode?: ProxyNode;
        parentNode: DataNode;
        listeners: {
            shallow: ListenerData[];
            deep: ListenerData[];
        };
        path: string;
        propertyPath: string;
        deferredEvents?: DeferredEvent[];
        isTreePrototype?: boolean;
    };
    [childNode: string]: DataNode;
}
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
        proxy?: ProxserveInstance;
        revoke?: () => void;
    };
    [childNode: string]: ProxyNode;
}
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
    /** stack trace log option */
    trace: 'none' | 'normal' | 'verbose';
    dataTree: DataNode;
    proxyTree: ProxyNode;
}
export type PseudoThis = {
    metadata: ProxserveInstanceMetadata;
    dataNode: DataNode;
    proxyNode: ProxyNode;
};
export type ProxserveInstance = {
    /** for internal use - the node's data */
    [ND]: ProxyNode[typeof ND];
    /** for internal use - the node's inherited data */
    [NID]: ProxyNode[typeof NID];
    stop: StopFunction;
    block: BlockFunction;
    activate: ActivateFunction;
    on: OnFunction;
    once: OnceFunction;
    removeListener: RemoveListenerFunction;
    removeAllListeners: RemoveAllListenersFunction;
    getOriginalTarget: GetOriginalTargetFunction;
    getProxserveName: GetProxserveNameFunction;
    whoami: WhoAMI;
    getProxserveNodes: GetProxserveNodesFunction;
    [property: string | number | symbol]: any;
};
export type ProxserveInstanceAlternatives = ProxserveInstance & {
    $stop: StopFunction;
    $block: BlockFunction;
    $activate: ActivateFunction;
    $on: OnFunction;
    $once: OnceFunction;
    $removeListener: RemoveListenerFunction;
    $removeAllListeners: RemoveAllListenersFunction;
    $getOriginalTarget: GetOriginalTargetFunction;
    $getProxserveName: GetProxserveNameFunction;
    $whoami: WhoAMI;
    $getProxserveNodes: GetProxserveNodesFunction;
};
