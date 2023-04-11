/**
 * a wrapper function for the 'splice' method
 *
 * @param start
 * @param deleteCount
 * @param items - rest of arguments
 */
export type SpliceFunction = (start: number, deleteCount: number, items: any[]) => any[];
/**
 * a wrapper function for the 'shift' method
 */
export type ShiftFunction = () => any;
/**
 * a wrapper function for the 'unshift' method
 *
 * @param items
 */
export type UnshiftFunction = (items: any[]) => number;
