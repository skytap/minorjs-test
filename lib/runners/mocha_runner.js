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

var cluster    = require('cluster'),
    path       = require('path'),
    extend     = require('extend'),
    Promise    = require('bluebird'),
    Mocha      = require('mocha'),
    BaseRunner = require('./base_runner');

function MochaRunner () {
  BaseRunner.constructor.apply(this, arguments);
}

extend(MochaRunner.prototype, BaseRunner.prototype, {

  ////////////////////////////////////////////////////////////////////////////
  // Public methods /////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////

  /**
   * MochaRunner.start() -> Object
   */
  start: function () {
    var self = this;

    return new Promise(function (resolve, reject) {
      self.mocha = new Mocha({
        ui       : 'bdd',
        reporter : path.join(__dirname, '../reporters/mocha_worker_reporter'),
        slow     : process.env.WORKER_SLOW || self.SLOW,
        timeout  : process.env.WORKER_TIMEOUT || self.TIMEOUT,
        bail     : true
      });

      self.mocha.addFile(process.env.WORKER_TEST);

      self.runner = self.mocha.run(function (failures) {
        resolve();
        cluster.worker.kill(0);
      });

      self.runner.on('suite', function (suite) {
        self.totalTests = suite.total;
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
  }
});

module.exports = MochaRunner;