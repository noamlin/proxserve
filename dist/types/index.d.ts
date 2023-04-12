import type { TargetVariable, SomeObject } from './types/globals';
import type { ProxserveInstance, DataNode, ProxserveInstanceMetadata } from './types/proxserve-class';
interface MakeOptions {
    strict?: ProxserveInstanceMetadata['strict'];
    methodsEmitRaw?: ProxserveInstanceMetadata['methodsEmitRaw'];
    /** internal root name of the instance */
    name?: string;
    debug?: {
        destroyDelay?: ProxserveInstanceMetadata['destroyDelay'];
        trace?: ProxserveInstanceMetadata['trace'];
    };
}
export declare class Proxserve {
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
export type { ProxserveInstance };
