declare const ND: unique symbol;
declare const NID: unique symbol;
enum nodeStatuses {
    ACTIVE = "active",
    STOPPED = "stopped",
    BLOCKED = "blocked",
    SPLICING = "splicing"
}
enum proxyStatuses {
    ALIVE = "alive",
    DELETED = "deleted",
    REVOKED = "revoked"
}
type eventNames = 'create' | 'update' | 'delete' | 'splice' | 'shift' | 'unshift';
type SomeObject = {
    [key: string | number | symbol]: any;
};
type SomeArray = Array<any>;
type TargetVariable = SomeObject | SomeArray;
interface ProxserveInstanceMetadata {
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
type ListenerData = {
    type: eventNames[];
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
    type: eventNames;
    args?: {
        start?: number;
        deleteCount?: number;
        items?: any[];
    };
};
interface DataNode {
    [NID]: {
        status?: nodeStatuses;
    };
    [ND]: {
        proxyNode: ProxyNode;
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
}
interface ProxyNode {
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
}
/**
 * stop object and children from emitting change events
 */
type StopFunction = () => void;
/**
 * block object and children from any changes.
 * user can't set nor delete any property
 */
type BlockFunction = () => void;
/**
 * resume default behavior of emitting change events, inherited from parent
 * @param force - force being active regardless of parent
 */
type ActivateFunction = (force?: boolean) => void;
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
type OnFunction = (args: {
    events: eventNames | eventNames[];
    path?: string;
    listener: (this: ProxserveInstance, change: ChangeEvent) => void;
    options?: {
        deep?: boolean;
        id?: number | string;
        once?: boolean;
    };
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
type RemoveListenerFunction = (args: {
    path?: string;
    id: string | number | Function;
}) => void;
/**
 * removing all listeners of a path
 *
 * @param args.path - path selector
 */
type RemoveAllListenersFunction = (path?: string) => void;
/**
 * get original variable that is behind the proxy
 */
type GetOriginalTargetFunction = () => TargetVariable;
/**
 * get the data-node of a proxy (which holds all meta data)
 * and also get proxy-node of a proxy (which holds all related objects)
 */
type GetProxserveNodesFunction = () => {
    dataNode: DataNode;
    proxyNode: ProxyNode;
};
interface ProxserveInstance {
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
interface MakeOptions {
    /**
     * should destroy detached child-objects or deleted properties automatically
     */
    strict?: boolean;
    /**
     * should splice, shift or unshift emit one event or all internal CRUD events
     */
    emitMethods?: boolean;
    debug?: {
        /**
         * delay before destroying a detached child-object
         */
        destroyDelay: number;
    };
}
export class Proxserve {
    /**
     * make a new proxserve instance
     */
    static make(target: TargetVariable, options?: MakeOptions): ProxserveInstance;
    /**
     * create a new proxy and a new node for a property of the parent's target-object
     */
    static createProxy(metadata: ProxserveInstanceMetadata, parentDataNode: DataNode, targetProperty?: string): ProxserveInstance;
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
