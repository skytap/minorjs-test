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

var EVENTS = [
  // 'start',
  'suite',
  'test end',
  'pass',
  'fail',
  // 'end',
  'pending'
];

function clean (test, error) {
  if (typeof test === 'undefined') {
    return {};
  }

  var results = {
    speed      : test.speed,
    duration   : test.duration,
    _slow      : typeof test.slow === 'function' ? test.slow() : null,
    _fullTitle : typeof test.fullTitle === 'function' ? test.fullTitle() : null
  };

  if (error) {
    results.err = {
      messsage : error.messsage || '',
      stack    : error.stack,
      actual   : error.actual,
      expected : error.expected,
      uncaught : error.uncaught,
      showDiff : error.showDiff
    };
  }

  return results;
}

function Reporter (runner) {
  EVENTS.forEach(function (eventName) {
    runner.on(eventName, function (test, error) {
      var data = {
        'event' : eventName,
        'test'  : clean(test, error)
      };

      try {
        process.send({
          type : 'testResults',
          data : JSON.stringify(data)
        });
      } catch (e) {
        console.log('Reporter: Error sending test results.', JSON.stringify(data), e.message, e.stack);
        process.exit(1);
      }
    });
  });
}

module.exports = Reporter;