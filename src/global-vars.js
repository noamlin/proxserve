/**
 * Copyright 2021 Noam Lin <noamlin@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
"use strict"

let proxyTypes = ['Object', 'Array']; //acceptable types to be proxied
proxyTypes.OBJECT = proxyTypes[0];
proxyTypes.ARRAY = proxyTypes[1];

let nodeStatuses = ['active', 'stopped', 'blocked', 'splicing']; //statuses of data-nodes
nodeStatuses.ACTIVE = nodeStatuses[0];
nodeStatuses.STOPPED = nodeStatuses[1];
nodeStatuses.BLOCKED = nodeStatuses[2];
nodeStatuses.SPLICING = nodeStatuses[3];

let proxyStatuses = ['alive', 'deleted', 'revoked']; //statuses of proxies
proxyStatuses.ALIVE = proxyStatuses[0];
proxyStatuses.DELETED = proxyStatuses[1];
proxyStatuses.REVOKED = proxyStatuses[2];

let eventNames = ['create', 'update', 'delete', 'splice', 'shift', 'unshift'];
eventNames.CREATE = eventNames[0];
eventNames.UPDATE = eventNames[1];
eventNames.DELETE = eventNames[2];
eventNames.SPLICE = eventNames[3];
eventNames.SHIFT = eventNames[4];
eventNames.UNSHIFT = eventNames[5];

let ND = Symbol.for('proxserve_node_data'); //key for the data of a node
let NID = Symbol.for('proxserve_node_inherited_data'); //key for the inherited data of a node

export { proxyTypes, nodeStatuses, proxyStatuses, eventNames, ND, NID };