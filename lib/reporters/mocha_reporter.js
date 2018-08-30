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

var extend       = require('extend'),
    DotReporter  = require('mocha/lib/reporters/dot'),
    BaseReporter = require('mocha/lib/reporters/base');

/**
 * Assembles test results from the worker processes and outputs the results
 * to the console.
 **/
function MochaReporter (eventMediator) {
  this.eventMediator = eventMediator;
  this.reporter      = new DotReporter(this.eventMediator);
}

extend(MochaReporter.prototype, {

  ////////////////////////////////////////////////////////////////////////////
  // Public methods /////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////

  /**
   * MochaReporter.hasFailures() -> Boolean
   **/
  hasFailures : function () {
    return this.reporter.stats.failures > 0;
  },

   /**
   * MochaReporter._setColors(showColors)
   * - showColors (Boolean)
   **/
  setColors : function (showColors) {
    BaseReporter.useColors = showColors;
  },

  /**
   * MochaReporter.handleTestResults(results)
   * - results (Object)
   **/
  handleTestResults: function (results) {
    var data = this.hydrateTestResult(results.data);

    if (data.event === 'fail') {
      this.eventMediator.emit('bail')
    }

    this.eventMediator.emit(
      data.event,
      data.test,
      data.test.err ? data.test && data.test.err : null
    );
  },

  /**
   * MochaReporter.hydrateTestResult(data) -> Object
   * - data (Object)
   **/
  hydrateTestResult : function (data) {
    data.test.slow = function () {
      return this._slow;
    };

    data.test.fullTitle = function () {
      return this._fullTitle;
    };

    data.test.titlePath = function () {
      return this._titlePath;
    };

    return data;
  }
});

module.exports = MochaReporter;