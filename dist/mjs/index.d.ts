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
enum eventNames {
    create = "create",
    update = "update",
    delete = "delete",
    splice = "splice",
    shift = "shift",
    unshift = "unshift"
}
type SomeObject = {
    [key: string | number | symbol]: any;
};
type SomeArray = Array<any>;
type TargetVariable = SomeObject | SomeArray;
interface ProxserveInstance {
    [ND]: ProxyNode[typeof ND];
    [NID]: ProxyNode[typeof NID];
    [property: string]: any;
}
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
interface MakeOptions {
    /**
     * should destroy detached child-objects or deleted properties automatically
     */
    strict: boolean;
    /**
     * should splice, shift or unshift emit one event or all internal CRUD events
     */
    emitMethods: boolean;
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
    static splitPath(path: string): Array<string | number>;
    static evalPath(obj: SomeObject, path: string): {
        object: SomeObject;
        property: string | number;
        value: any;
    };
}

//# sourceMappingURL=index.d.ts.map
