declare const ND: unique symbol;
declare const NID: unique symbol;
enum NODE_STATUSES {
    active = "active",
    stopped = "stopped",
    blocked = "blocked",
    splicing = "splicing"
}
enum PROXY_STATUSES {
    alive = "alive",
    deleted = "deleted",
    revoked = "revoked"
}
enum EVENTS {
    create = "create",
    update = "update",
    delete = "delete",
    splice = "splice",
    shift = "shift",
    unshift = "unshift"
}
/**
 * stop object and children from emitting change events
 */
type StopFunction = (this: PseudoThis) => void;
/**
 * block object and children from any changes.
 * user can't set nor delete any property
 */
type BlockFunction = (this: PseudoThis) => void;
/**
 * resume default behavior of emitting change events, inherited from parent
 * @param force - force being active regardless of parent
 */
type ActivateFunction = (this: PseudoThis, force?: boolean) => void;
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
type OnFunction = (this: PseudoThis, args: {
    event: EVENT_NAMES | EVENT_NAMES[] | 'change';
    path?: string;
    listener: (this: ProxserveInstance, change: ChangeEvent) => void;
    deep?: boolean;
    id?: number | string;
    once?: boolean;
}) => void;
/**
 * just like `on` but the listener will run only once
 * @see on() function
 */
type OnceFunction = OnFunction;
/**
 * removes a listener from a path by an identifier (can have multiple listeners with the same ID)
 * or by the listener function itself
 *
 * @param args.path - path selector
 * @param args.id - the listener(s) identifier or listener-function
 */
type RemoveListenerFunction = (this: PseudoThis, args: {
    path?: string;
    id: string | number | Function;
}) => void;
/**
 * removing all listeners of a path
 *
 * @param args.path - path selector
 */
type RemoveAllListenersFunction = (this: PseudoThis, path?: string) => void;
/**
 * get original variable that is behind the proxy
 */
type GetOriginalTargetFunction = (this: PseudoThis) => TargetVariable;
/**
 * get the root name (if given) of the current proxserve
 */
type GetProxserveNameFunction = (this: PseudoThis) => string;
/**
 * get the full name and path of current sub-object
 */
type WhoAMI = (this: PseudoThis) => string;
/**
 * get the data-node of a proxy (which holds all meta data)
 * and also get proxy-node of a proxy (which holds all related objects)
 */
type GetProxserveNodesFunction = (this: PseudoThis) => {
    dataNode: DataNode;
    proxyNode: ProxyNode;
};
/** a permanent node that holds data about the "location" in the tree */
interface DataNode {
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
interface ProxyNode {
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
interface ProxserveInstanceMetadata {
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
type PseudoThis = {
    metadata: ProxserveInstanceMetadata;
    dataNode: DataNode;
    proxyNode: ProxyNode;
};
type ProxserveInstance = PseudoThis & {
    /** for internal use - the node's data */
    [ND]: ProxyNode[typeof ND];
    /** for internal use - the node's inherited data */
    [NID]: ProxyNode[typeof NID];
    stop: StopFunction;
    $stop: StopFunction;
    block: BlockFunction;
    $block: BlockFunction;
    activate: ActivateFunction;
    $activate: ActivateFunction;
    on: OnFunction;
    $on: OnFunction;
    once: OnceFunction;
    $once: OnceFunction;
    removeListener: RemoveListenerFunction;
    $removeListener: RemoveListenerFunction;
    removeAllListeners: RemoveAllListenersFunction;
    $removeAllListeners: RemoveAllListenersFunction;
    getOriginalTarget: GetOriginalTargetFunction;
    $getOriginalTarget: GetOriginalTargetFunction;
    getProxserveName: GetProxserveNameFunction;
    $getProxserveName: GetProxserveNameFunction;
    whoami: WhoAMI;
    $whoami: WhoAMI;
    getProxserveNodes: GetProxserveNodesFunction;
    $getProxserveNodes: GetProxserveNodesFunction;
    [property: string | number | symbol]: any;
};
type EVENT_NAMES = keyof typeof EVENTS;
type SomeObject = {
    [key: string | number | symbol]: any;
};
type SomeArray = Array<any>;
type TargetVariable = SomeObject | SomeArray;
type ListenerData = {
    type: EVENT_NAMES[];
    once: boolean;
    func: Function;
    id?: string | number;
};
type DeferredEvent = {
    dataNode: DataNode;
    change: ChangeEvent;
    shouldCapture: boolean;
};
type ChangeEvent = {
    path: string;
    value: any;
    oldValue: any;
    type: EVENT_NAMES;
    args?: {
        start?: number;
        deleteCount?: number;
        items?: any[];
    };
};
interface MakeOptions {
    strict?: ProxserveInstanceMetadata['strict'];
    methodsEmitRaw?: ProxserveInstanceMetadata['methodsEmitRaw'];
    /** internal name of the instance */
    name?: string;
    debug?: {
        destroyDelay: ProxserveInstanceMetadata['destroyDelay'];
    };
}
export class Proxserve {
    /**
     * make a new proxserve instance
     */
    static make<T>(target: TargetVariable, options?: MakeOptions): ProxserveInstance & T;
    /**
     * create a new proxy and a new node for a property of the parent's target-object
     */
    static createProxy<T>(metadata: ProxserveInstanceMetadata, parentDataNode: DataNode, targetProperty?: string): ProxserveInstance & T;
    /**
     * Recursively revoke proxies, allowing them to be garbage collected.
     * this functions delays 1000 milliseconds to let time for all events to finish
     */
    static destroy(proxy: ProxserveInstance): void;
    /**
     * splits a path to an array of properties
     */
    static splitPath(path: string): Array<string | number>;
    /**
     * evaluate a long path and return the designated object and its referred property
     */
    static evalPath(obj: SomeObject, path: string): {
        object: SomeObject;
        property: string | number;
        value: any;
    };
}

//# sourceMappingURL=index.d.ts.map
