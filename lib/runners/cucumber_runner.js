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

var cluster               = require('cluster'),
    extend                = require('extend'),
    Promise               = require('bluebird'),
    Cucumber              = require('cucumber'),
    EventEmitter          = require('events').EventEmitter,
    CucumberConfiguration = require('../cucumber/cucumber_configuration'),
    InterceptFormatter    = require('../cucumber/intercept_formatter'),
    BaseRunner            = require('./base_runner');

require('../cucumber/patch_modules');

function CucumberRunner () {
  BaseRunner.constructor.apply(this, arguments);
}

extend(CucumberRunner.prototype, BaseRunner.prototype, {

  ////////////////////////////////////////////////////////////////////////////
  // Public methods /////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////

  /**
   * CucumberRunner.start() -> Object
   */
  start: function () {
    return new Promise(resolve => {
      var configuration      = new CucumberConfiguration(),
          runtime            = Cucumber.Runtime(configuration),
          formatters         = configuration.getFormatters(),
          eventMediator      = new EventEmitter(),
          interceptFormatter = new InterceptFormatter(eventMediator);

      this.eventMediator = eventMediator;
      this.listeners = [].concat(formatters);
      this.listeners.push(interceptFormatter);

      formatters.forEach((formatter) => {
        runtime.attachListener(formatter);
      });

      runtime.attachListener(interceptFormatter);

      runtime.start(() => {
        resolve();
      });

      eventMediator.on('scenario end', () => {
        this.testsFinished++;
        this.totalTests++;
        this.checkMemory();
      });

      eventMediator.on('fail', () => {
        this.hasFailingTest = true;
      });

      eventMediator.on('end', () => {
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
      this.eventMediator.removeAllListeners();
      this.listeners.forEach(listener => listener.hear = () => {});
    } catch (e) {}
    setImmediate(done);
  }
});

module.exports = CucumberRunner;
