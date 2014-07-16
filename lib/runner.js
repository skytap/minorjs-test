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

var extend    = require('extend'),
    Q         = require('q'),
    Mocha     = require('mocha'),
    cluster   = require('cluster'),
    path      = require('path'),
    MinorTest = require('./minor-test');

function Runner () {}

extend(Runner.prototype, {

  // @todo make this value configurable at runtime
  MAX_MEMORY: 512,

  // @todo make this value configurable at runtime
  MAX_TESTS: 25,

  ////////////////////////////////////////////////////////////////////////////
  // Public methods /////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////

  /**
   * Runner.start() -> Object
   */
  start: function () {
    var self     = this,
        deferred = Q.defer();

    MinorTest.port = process.env.WORKER_PORT;

    this.mocha = new Mocha({
      ui       : 'bdd',
      reporter : path.join(__dirname, './reporter'),
      slow     : 10000,
      timeout  : 15000,
      bail     : true
    });

    this.mocha.addFile(process.env.WORKER_TEST);

    this.runner = this.mocha.run(function (failures) {
      deferred.resolve();
      cluster.worker.disconnect();
    });

    this.runner.on('test end', function () {
      self.testsFinished++;
      self.checkMemory();
    });

    this.runner.on('fail', function () {
      self.hasFailingTest = true;
    });

    this.runner.on('end', function () {
      self.checkFinishedTests();
      self.checkTestCount();
      self.checkMemory();

      process.send({
        type : 'suiteDone',
        data : process.env.WORKER_TEST
      });
    });

    return deferred.promise;
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

    if (!this.memoryWarning && memory > this.MAX_MEMORY) {
      this.memoryWarning = true;
      console.log("\nWarning! Memory usage exceeded " + this.MAX_MEMORY + 'MB for test suite ' +
        process.env.WORKER_TEST + '. ' +
        'Please split these tests into smaller suites.');
    }
  },

  /**
   * Runner.checkTestCount()
   **/
  checkTestCount : function () {
    if (this.runner.total > this.MAX_TESTS) {
      console.log("\nWarning! " + this.runner.total + ' tests in test suite ' +
        process.env.WORKER_TEST + '. ' +
        'Please split these tests into smaller suites.');
    }
  }
});

module.exports = Runner;