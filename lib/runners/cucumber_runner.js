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
    var self = this;

    return new Promise(function (resolve, reject) {
      var configuration      = new CucumberConfiguration(),
          runtime            = Cucumber.Runtime(configuration),
          formatter          = configuration.getFormatter(),
          eventMediator      = new EventEmitter(),
          interceptFormatter = new InterceptFormatter(eventMediator);

      runtime.attachListener(formatter);
      runtime.attachListener(interceptFormatter);

      runtime.start(function () {
        resolve();
        cluster.worker.kill(0);
      });

      eventMediator.on('scenario end', function () {
        self.testsFinished++;
        self.totalTests++;
        self.checkMemory();
      });

      eventMediator.on('fail', function () {
        self.hasFailingTest = true;
      });

      eventMediator.on('end', function () {
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

module.exports = CucumberRunner;