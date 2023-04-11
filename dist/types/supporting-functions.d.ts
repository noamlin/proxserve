import type { TargetVariable, ChangeEvent } from './types/globals';
import type { DataNode, ProxyNode, ProxserveInstanceMetadata } from './types/proxserve-class';
/**
 * Convert property name to valid path segment
 */
export declare function property2path(obj: any, property: string | number): string;
/**
 * recursively switch between all proxies to their original targets.
 * note: original targets should never hold proxies under them,
 * thus altering the object references (getting from 'value') should be ok.
 * if whoever uses this library decides to
 * 	1. create a proxy with children (sub-proxies)
 * 	2. create a regular object
 * 	3. adding sub-proxies to the regular object
 * 	4. attaching the regular object to the proxy
 * then this regular object will be altered.
 */
export declare function unproxify(value: any): any;
/**
 * create or reset a node in a tree of meta-data (mainly path related)
 * and optionally create a node in a tree of proxy data (mainly objects related)
 */
export declare function createNodes(parentDataNode: DataNode, property: string | number, parentProxyNode?: ProxyNode, target?: TargetVariable): {
    dataNode: DataNode;
    proxyNode: ProxyNode | undefined;
};
export declare function stackTraceLog(dataNode: DataNode, change: ChangeEvent, logLevel?: ProxserveInstanceMetadata['trace']): void;
