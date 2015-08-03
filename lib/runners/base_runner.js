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

var extend = require('extend');

function BaseRunner () {
  this.hasFailingTest = false;
  this.testsFinished  = 0;
  this.totalTests     = 0;
}

extend(BaseRunner.prototype, {

  MAX_MEMORY: 512,

  MAX_TESTS: 25,

  SLOW: 10000,

  TIMEOUT: 15000,

  ////////////////////////////////////////////////////////////////////////////
  // Public methods /////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////

  /**
   * BaseRunner.checkFinishedTests()
   **/
  checkFinishedTests : function () {
    if (this.totalTests > this.testsFinished && !this.hasFailingTest) {
      console.log("\nError! Expected to run " + this.totalTests +
        ' tests but actually ran ' + this.testsFinished +
        ' in test suite ' + process.env.WORKER_TEST);
    }
  },

  /**
   * BaseRunner.checkMemory()
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
   * BaseRunner.checkTestCount()
   **/
  checkTestCount : function () {
    if (this.totalTests > this.getMaxTests()) {
      console.log("\nWarning! " + this.totalTests + ' tests in test suite ' +
        process.env.WORKER_TEST + '. ' +
        'Please split these tests into smaller suites.');
    }
  },

  /**
   * BaseRunner.getMaxMemory() -> Integer
   **/
  getMaxMemory : function () {
    return process.env.WORKER_MAX_MEMORY || this.MAX_MEMORY;
  },

  /**
   * BaseRunner.getMaxTests() -> Integer
   **/
  getMaxTests : function () {
    return process.env.WORKER_MAX_TESTS || this.MAX_TESTS;
  }
});

module.exports = BaseRunner;