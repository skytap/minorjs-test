/**
 * Copyright 2014 Skytap Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

var cluster       = require('cluster'),
    path          = require('path'),
    workerModules = process.env.WORKER_MODULES.split(',');

for (var workerModuleIndex in workerModules) {
  var workerModule = workerModules[workerModuleIndex];
  if (workerModule.length > 0) {
    require(workerModule);
  }
}

if (!process.env.WORKER_SCRIPT) {
  throw new Error('No worker script specified');
}

// set the process title so we can tell the difference between
// servers and test runners
process.title = 'node ' + path.basename(process.env.WORKER_SCRIPT);

var Worker = require(process.env.WORKER_SCRIPT),
    worker = new Worker();

worker.start()
  .done();
