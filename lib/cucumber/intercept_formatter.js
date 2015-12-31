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

var Cucumber = require('cucumber');

function InterceptFormatter (eventMediator) {
  var self = Cucumber.Listener.Formatter();

  self.storeFailedScenario = function () {
    eventMediator.emit('fail');
  };

  self.handleAfterScenarioEvent = function (event, callback) {
    eventMediator.emit('scenario end');
    callback();
  };

  self.handleAfterFeaturesEvent = function (event, callback) {
    eventMediator.emit('end');
    self.finish(callback);
  };

  return self;
}

module.exports = InterceptFormatter;
