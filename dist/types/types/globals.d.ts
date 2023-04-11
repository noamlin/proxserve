/**
 * 2023 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
import { DataNode } from './proxserve-class';
import { EVENTS } from '../globals';
export type EVENT_NAMES = keyof typeof EVENTS;
export type SomeObject = {
    [key: string | number | symbol]: any;
};
export type SomeArray = Array<any>;
export type TargetVariable = SomeObject | SomeArray;
export type VariableTypes = 'Object' | 'Array' | 'Number' | 'String' | 'Boolean' | 'Null' | 'Undefined' | 'BigInt' | 'Symbol' | 'Date';
export type ListenerData = {
    type: EVENT_NAMES[];
    once: boolean;
    func: Function;
    id?: string | number;
};
export type DeferredEvent = {
    dataNode: DataNode;
    change: ChangeEvent;
    shouldCapture: boolean;
};
export type ChangeEvent = {
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
