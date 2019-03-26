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

require('coffee-script');
require('coffee-script/register');
require('babel-register');
require('babel-polyfill');

var cluster = require('cluster'),
    path    = require('path');

function createLogMessage(error, p) {
  var messages = ['Uncaught Exception in script', process.env.WORKER_SCRIPT, '\n'];
  if (p) {
    messages = ['Unhandled Rejection in script:', process.env.WORKER_SCRIPT, '\n'];
  }

  messages = messages.concat(['Error:', (error && error.stack) ? error.stack : error, '\n']);
  if (p) {
    messages = messages.concat(['Unhandled promise:', p, '\n'])
  }
  if (process.env.WORKER_SCRIPT === './runner') {
    messages = messages.concat(['Running test file:', process.env.WORKER_TEST, '\n']);
  }
  if (global.lastEmittedTestEvent) {
    messages = messages.concat(['Last emitted test event:', global.lastEmittedTestEvent, '\n']);
  }
  return messages;
}

process.on('uncaughtException', function handleException (error) {
  console.log.apply(console, createLogMessage(error));
  process.exit(1);
});

process.on('unhandledRejection', function handleException (error, p) {
  console.log.apply(console, createLogMessage(error, p));
  process.exit(1);
});

process.on('message', function (message) {
  if (message.type === 'shutdown') {
    if (process.env.TEST_DEBUG === '1') {
      console.log(`Worker ${message.customId} received shutdown message`);
    }
    if (worker && worker.stop) {
      worker.stop(function () {
        try {
          cluster.worker.kill(0);
        } catch (e) {}
      });
    } else {
      try {
        cluster.worker.kill(0);
      } catch(e) {}
    }
  }
});

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
