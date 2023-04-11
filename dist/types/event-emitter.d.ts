import type { EVENT_NAMES, ChangeEvent } from './types/globals';
import type { DataNode, ProxserveInstanceMetadata } from './types/proxserve-class';
/**
 * process event and then bubble up and capture down the data tree
 */
export declare function initEmitEvent(dataNode: DataNode, property: string, oldValue: any, wasOldValueProxy: boolean, value: any, isValueProxy: boolean, trace?: ProxserveInstanceMetadata['trace']): void;
/**
 * process special event for a built-in method and then bubble up the data tree
 * @param dataNode
 * @param funcName - the method's name
 * @param funcArgs - the method's arguments
 * @param oldValue
 * @param value
 */
export declare function initFunctionEmitEvent(dataNode: DataNode, funcName: EVENT_NAMES, funcArgs: ChangeEvent['args'], oldValue: any, value: any, trace?: ProxserveInstanceMetadata['trace']): void;
