export declare const ND: unique symbol;
export declare const NID: unique symbol;
export declare const proxyTypes: {
    Object: boolean;
    Array: boolean;
};
export declare enum NODE_STATUSES {
    active = "active",
    stopped = "stopped",
    blocked = "blocked",
    splicing = "splicing"
}
export declare enum PROXY_STATUSES {
    alive = "alive",
    deleted = "deleted",
    revoked = "revoked"
}
export declare enum EVENTS {
    create = "create",
    update = "update",
    delete = "delete",
    splice = "splice",
    shift = "shift",
    unshift = "unshift"
}
