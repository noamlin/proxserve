import { eventNames, ChangeEvent, TargetVariable } from './globals';
import { ProxserveInstance, PseudoThis, DataNode, ProxyNode } from './proxserve-class';

/**
 * stop object and children from emitting change events
 */
 export type StopFunction = (this: PseudoThis) => void;

 /**
  * block object and children from any changes.
  * user can't set nor delete any property
  */
 export type BlockFunction = (this: PseudoThis) => void;
 
 /**
  * resume default behavior of emitting change events, inherited from parent
  * @param force - force being active regardless of parent
  */
 export type ActivateFunction = (this: PseudoThis, force?: boolean) => void;
 
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
 export type OnFunction = (
	 this: PseudoThis,
	 args: {
		 event: eventNames | eventNames[] | 'change',
		 path?: string,
		 listener: (this: ProxserveInstance, change: ChangeEvent) => void,
		 deep?: boolean;
		 id?: number | string;
		 once?: boolean;
	 },
 ) => void;
 
 /**
  * just like `on` but the listener will run only once
  * @see on() function
  */
 export type OnceFunction = OnFunction;
 
 /**
  * removes a listener from a path by an identifier (can have multiple listeners with the same ID)
  * or by the listener function itself
  * 
  * @param args.path - path selector
  * @param args.id - the listener(s) identifier or listener-function
  */
 export type RemoveListenerFunction = (
	 this: PseudoThis,
	 args: { path?: string, id: string | number | Function },
 ) => void;
 
 /**
  * removing all listeners of a path
  * 
  * @param args.path - path selector
  */
 export type RemoveAllListenersFunction = (this: PseudoThis, path?: string) => void;
 
 /**
  * get original variable that is behind the proxy
  */
 export type GetOriginalTargetFunction = (this: PseudoThis) => TargetVariable;
 
 /**
  * get the data-node of a proxy (which holds all meta data)
  * and also get proxy-node of a proxy (which holds all related objects)
  */
 export type GetProxserveNodesFunction = (this: PseudoThis) => { dataNode: DataNode, proxyNode: ProxyNode };
 