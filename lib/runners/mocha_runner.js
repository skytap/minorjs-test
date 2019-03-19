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
    return new Promise(resolve => {
      this.mocha = new Mocha({
        ui       : 'bdd',
        reporter : path.join(__dirname, '../reporters/mocha_worker_reporter'),
        slow     : process.env.WORKER_SLOW || this.SLOW,
        timeout  : process.env.WORKER_TIMEOUT || this.TIMEOUT,
        bail     : true
      });

      this.mocha.addFile(process.env.WORKER_TEST);

      this.runner = this.mocha.run(() => {
        resolve();
      });

      this.runner.on('suite', suite => {
        this.totalTests = suite.total;
      });

      this.runner.on('test end', () => {
        this.testsFinished++;
        this.checkMemory();
      });

      this.runner.on('fail', () => {
        this.hasFailingTest = true;
      });

      this.runner.on('end', () => {
        if (this.stopped) { return }
        this.checkFinishedTests();
        this.checkTestCount();
        this.checkMemory();

        process.send({
          type : 'suiteDone',
          data : process.env.WORKER_TEST
        });

        cluster.worker.kill(0);
      });
    });
  },

  stop(done) {
    // process is exiting turn off all event listeners
    try {
      this.stopped = true;
      this.runner.removeAllListeners();
    } catch (e) {}
    setImmediate(done);
  }
});

module.exports = MochaRunner;
