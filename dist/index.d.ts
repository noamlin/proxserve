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
type SomeProxy = {
    [ND]: ProxyNode[typeof ND];
    [NID]: ProxyNode[typeof NID];
    [property: string]: any;
};
type SomeArray = Array<any>;
type TargetVariable = SomeObject | SomeArray;
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
        proxy?: SomeProxy;
        revoke?: () => void;
        isTreePrototype?: boolean;
    };
    [property: string]: ProxyNode;
}
interface ProxserveInterface {
    strict: boolean;
    emitMethods: boolean;
    destroyDelay: number;
    dataTree: DataNode;
    proxyTree: ProxyNode;
    createProxy(parentDataNode: DataNode, targetProperty?: string): SomeProxy;
}
interface ConstructorOptions {
    strict: boolean;
    emitMethods: boolean;
    debug?: {
        destroyDelay: number;
    };
}
export class Proxserve implements ProxserveInterface {
    strict: boolean;
    emitMethods: boolean;
    destroyDelay: number;
    dataTree: DataNode;
    proxyTree: ProxyNode;
    /**
     * construct a new proxserve instance
     * @param {Object|Array} target
     * @param {Object} [options]
     * 	@property {Boolean} [options.strict] - should destroy detached child-objects or deleted properties automatically
     * 	@property {Boolean} [options.emitMethods] - should splice/shift/unshift emit one event or all CRUD events
     */
    constructor(target: TargetVariable, options: ConstructorOptions);
    /**
     * create a new proxy and a new node for a property of the parent's target-object
     * @param {Object} parentDataNode
     * @param {String} [targetProperty]
     */
    createProxy(parentDataNode: DataNode, targetProperty?: string): SomeProxy;
    /**
     * Recursively revoke proxies, allowing them to be garbage collected.
     * this functions delays 1000 milliseconds to let time for all events to finish
     * @param {*} proxy
     */
    static destroy(proxy: any): void;
    static splitPath(path: any): (string | number)[];
    static evalPath(obj: any, path: any): {
        object: import("globals").SomeObject;
        property: string | number;
        value: any;
    };
}

//# sourceMappingURL=index.d.ts.map
