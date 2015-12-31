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

var Cucumber = require('cucumber'),
    _        = require('underscore');

function DotFormatter(options) {
  var MAX_COLUMNS = 56;

  var currentColumn           = 0;
  var failedScenarioLogBuffer = '';
  var undefinedStepLogBuffer  = '';
  var failedStepResults       = Cucumber.Type.Collection();
  var statsJournal            = Cucumber.Listener.StatsJournal();
  var colors                  = Cucumber.Util.Colors(options.useColors);
  var statusReportOrder = [
    Cucumber.Status.FAILED,
    Cucumber.Status.UNDEFINED,
    Cucumber.Status.PENDING,
    Cucumber.Status.SKIPPED,
    Cucumber.Status.PASSED
  ];

  var self = Cucumber.Listener.Formatter(options);

  var parentHear = self.hear;
  self.hear = function hear(event, callback) {
    statsJournal.hear(event, function () {
      parentHear(event, callback);
    });
  };

  self.handleStepResultEvent = function handleStepResult(event, callback) {
    var stepResult = event.getPayloadItem('stepResult');
    switch (stepResult.getStatus()) {
      case Cucumber.Status.UNDEFINED:
        self.handleUndefinedStepResult(stepResult);
        break;
      case Cucumber.Status.FAILED:
        self.handleFailedStepResult(stepResult);
        break;
    }
    callback();
  };

  self.handleUndefinedStepResult = function handleUndefinedStepResult(stepResult) {
    self.storeUndefinedStepResult(stepResult);
  };

  self.handleFailedStepResult = function handleFailedStepResult(stepResult) {
    self.storeFailedStepResult(stepResult);
  };

  self.handleAfterScenarioEvent = function handleAfterScenarioEvent(event, callback) {
    var scenario = event.getPayloadItem('scenario');
    self.logScenarioResult(scenario);
    callback();
  };

  self.logScenarioResult = function logScenarioResult(scenario) {
    if (currentColumn === 0) {
      self.log('\n  ');
    }
    if (scenario.failed === true) {
      self.storeFailedScenario(scenario);
      self.log('F');
    } else {
      self.log('.');
    }
    currentColumn = (currentColumn + 1) % MAX_COLUMNS;
  };

  self.handleAfterFeaturesEvent = function handleAfterFeaturesEvent(event, callback) {
    self.finish(callback);
  };

  self.handleAfterAllFeaturesEvent = function handleAfterAllFeaturesEvent(event, callback) {
    self.log('\n\n');
    self.logSummary();
    callback();
  };

  self.storeFailedStepResult = function storeFailedStepResult(failedStepResult) {
    failedStepResults.add(failedStepResult);
  };

  self.storeFailedScenario = function storeFailedScenario(failedScenario) {
    var name = failedScenario.getName();
    var uri  = failedScenario.getUri();
    var line = failedScenario.getLine();
    self.appendStringToFailedScenarioLogBuffer(uri + ':' + line + ' # Scenario: ' + name);
  };

  self.storeUndefinedStepResult = function storeUndefinedStepResult(stepResult) {
    var step           = stepResult.getStep();
    var syntax         = Cucumber.SupportCode.StepDefinitionSnippetBuilder.JavaScriptSyntax();
    var snippetBuilder = Cucumber.SupportCode.StepDefinitionSnippetBuilder(step, syntax);
    var snippet        = snippetBuilder.buildSnippet();
    self.appendStringToUndefinedStepLogBuffer(snippet);
  };

  self.appendStringToFailedScenarioLogBuffer = function appendStringToFailedScenarioLogBuffer(string) {
    failedScenarioLogBuffer += string + '\n';
  };

  self.appendStringToUndefinedStepLogBuffer = function appendStringToUndefinedStepLogBuffer(string) {
    if (undefinedStepLogBuffer.indexOf(string) === -1)
      undefinedStepLogBuffer += string + '\n';
  };

  self.getFailedScenarioLogBuffer = function getFailedScenarioLogBuffer() {
    return failedScenarioLogBuffer;
  };

  self.getUndefinedStepLogBuffer = function getUndefinedStepLogBuffer() {
    return undefinedStepLogBuffer;
  };

  self.logSummary = function logSummary() {
    if (failedScenarioLogBuffer)
      self.logFailedStepResults();
    self.logScenariosSummary();
    if (undefinedStepLogBuffer)
      self.logUndefinedStepSnippets();
  };

  self.logFailedStepResults = function logFailedStepResults() {
    self.log('Failed steps:\n\n');
    failedStepResults.forEach(function (stepResult) {
      self.logFailedStepResult(stepResult);
    });
    self.log('Failing scenarios:\n\n');
    var failedScenarios = self.getFailedScenarioLogBuffer();
    self.log(failedScenarios);
    self.log('\n');
  };

  self.logFailedStepResult = function logFailedStepResult(stepResult) {
    var step = stepResult.getStep();
    self.log(step.getName() + "\n" + step.getUri() + ':' + step.getLine());
    self.log('\n\n');
    var failureMessage = stepResult.getFailureException();
    if (failureMessage)
      self.log(failureMessage.stack || failureMessage);
    self.log('\n\n');
  };

  self.logScenariosSummary = function logScenariosSummary() {
    self.logCountSummary('scenario', statsJournal.getScenarioCounts());
  };

  self.logUndefinedStepSnippets = function logUndefinedStepSnippets() {
    var undefinedStepLogBuffer = self.getUndefinedStepLogBuffer();
    if (options.snippets) {
      self.log(colors.pending('\nYou can implement step definitions for undefined steps with these snippets:\n\n'));
      self.log(colors.pending(undefinedStepLogBuffer));
    }
  };

  self.logCountSummary = function logCountSummary (type, counts) {
    var total = _.reduce(counts, function(memo, value){
      return memo + value;
    });

    self.log(total + ' ' + type + (total !== 1 ? 's' : ''));
    if (total > 0) {
      var details = [];
      statusReportOrder.forEach(function (status) {
        if (counts[status] > 0)
          details.push(colors[status](counts[status] + ' ' + status));
      });
      self.log(' (' + details.join(', ') + ')');
    }
    self.log('\n');
  };

  return self;
}

module.exports = DotFormatter;
