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

var cluster   = require('cluster'),
    path      = require('path'),
    extend    = require('extend'),
    Promise   = require('bluebird'),
    Mocha     = require('mocha'),
    MinorTest = require('./minor-test');

function Runner () {}

extend(Runner.prototype, {

  MAX_MEMORY: 512,

  MAX_TESTS: 25,

  SLOW: 10000,

  TIMEOUT: 15000,

  ////////////////////////////////////////////////////////////////////////////
  // Public methods /////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////

  /**
   * Runner.start() -> Object
   */
  start: function () {
    var self = this;

    return new Promise(function (resolve, reject) {
      process.send({
        type     : 'runnerId',
        runnerId : cluster.worker.id
      });

      MinorTest.port           = process.env.WORKER_PORT;
      MinorTest.requestedPorts = process.env.REQUESTED_PORTS.split(',').map(function(port) { return parseInt(port, 10); });

      self.mocha = new Mocha({
        ui       : 'bdd',
        reporter : path.join(__dirname, './reporter'),
        slow     : process.env.WORKER_SLOW || self.SLOW,
        timeout  : process.env.WORKER_TIMEOUT || self.TIMEOUT,
        bail     : true
      });

      self.mocha.addFile(process.env.WORKER_TEST);

      self.runner = self.mocha.run(function (failures) {
        resolve();
        cluster.worker.kill(0);
      });

      self.runner.on('test end', function () {
        self.testsFinished++;
        self.checkMemory();
      });

      self.runner.on('fail', function () {
        self.hasFailingTest = true;
      });

      self.runner.on('end', function () {
        self.checkFinishedTests();
        self.checkTestCount();
        self.checkMemory();

        process.send({
          type : 'suiteDone',
          data : process.env.WORKER_TEST
        });
      });
    });
  },

  /**
   * Runner.checkFinishedTests()
   **/
  checkFinishedTests : function () {
    if (this.runner.total > this.testsFinished && !this.hasFailingTest) {
      console.log("\nError! Expected to run " + this.runner.total +
        ' tests but actually ran ' + this.testsFinished +
        ' in test suite ' + process.env.WORKER_TEST);
    }
  },

  /**
   * Runner.checkMemory()
   **/
  checkMemory : function () {
    var memory = Math.round(process.memoryUsage().rss / (1024 * 1024));

    if (!this.memoryWarning && memory > this.getMaxMemory()) {
      this.memoryWarning = true;
      console.log("\nWarning! Memory usage exceeded " + this.getMaxMemory() + 'MB for test suite ' +
        process.env.WORKER_TEST + '. ' +
        'Please split these tests into smaller suites.');
    }
  },

  /**
   * Runner.checkTestCount()
   **/
  checkTestCount : function () {
    if (this.runner.total > this.getMaxTests()) {
      console.log("\nWarning! " + this.runner.total + ' tests in test suite ' +
        process.env.WORKER_TEST + '. ' +
        'Please split these tests into smaller suites.');
    }
  },

  /**
   * Runner.getMaxMemory()
   **/
  getMaxMemory : function () {
    return process.env.WORKER_MAX_MEMORY || this.MAX_MEMORY;
  },

  /**
   * Runner.getMaxTests()
   **/
  getMaxTests : function () {
    return process.env.WORKER_MAX_TESTS || this.MAX_TESTS;
  }
});

module.exports = Runner;