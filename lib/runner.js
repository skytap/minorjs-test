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

var cluster        = require('cluster'),
    extend         = require('extend'),
    MinorTest      = require('./minor-test'),
    CucumberRunner = require('./runners/cucumber_runner'),
    MochaRunner    = require('./runners/mocha_runner');

function Runner () {}

extend(Runner.prototype, {

  ////////////////////////////////////////////////////////////////////////////
  // Public methods /////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////

  /**
   * Runner.start() -> Object
   */
  start: function () {
    var runner;

    process.send({
      type     : 'runnerId',
      runnerId : cluster.worker.id
    });

    MinorTest.port           = process.env.WORKER_PORT;
    MinorTest.requestedPorts = this.getRequestedPorts();

    switch (process.env.TEST_TYPE) {
      case 'cucumber':
        runner = new CucumberRunner();
        break;
      case 'mocha':
      default:
        runner = new MochaRunner();
    }

    return runner.start();
  },

  stop: function (done) {
    try {
      this.runner.stop(done);
    } catch (e) {}
  },

  /**
   * Runner.getRequestedPorts() -> Array
   */
  getRequestedPorts: function () {
    return process.env.REQUESTED_PORTS.split(',').map(function (port) {
      return parseInt(port, 10);
    });
  }
});

module.exports = Runner;
