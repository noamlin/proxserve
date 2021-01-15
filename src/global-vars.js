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

let proxyStatuses = ['active', 'stopped', 'blocked', 'splicing']; //statuses of proxies
proxyStatuses.ACTIVE = proxyStatuses[0];
proxyStatuses.STOPPED = proxyStatuses[1];
proxyStatuses.BLOCKED = proxyStatuses[2];
proxyStatuses.SPLICING = proxyStatuses[3];

let eventNames = ['create', 'update', 'delete', 'splice'];
eventNames.CREATE = eventNames[0];
eventNames.UPDATE = eventNames[1];
eventNames.DELETE = eventNames[2];
eventNames.SPLICE = eventNames[3];

let ND = Symbol.for('proxserve_node_data'); //key for the data of a node
let NID = Symbol.for('proxserve_node_inherited_data'); //key for the inherited data of a node

export { proxyTypes, proxyStatuses, eventNames, ND, NID };