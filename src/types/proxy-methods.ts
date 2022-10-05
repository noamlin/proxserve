import { PseudoThis } from './proxserve-class';

/**
 * a wrapper function for the 'splice' method
 * 
 * @param start 
 * @param deleteCount 
 * @param items - rest of arguments
 */
export type SpliceFunction = (
	this: PseudoThis,
	start: number,
	deleteCount: number,
	items: any[],
) => any[];

/**
 * a wrapper function for the 'shift' method
 */
export type ShiftFunction = (this: PseudoThis) => any;

/**
 * a wrapper function for the 'unshift' method
 * 
 * @param items 
 */
export type UnshiftFunction = (this: PseudoThis, items: any[]) => number;
