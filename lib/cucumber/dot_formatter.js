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

function DotFormatter(options) {
  var MAX_COLUMNS = 56;

  var currentColumn           = 0;
  var failedScenarioLogBuffer = '';
  var undefinedStepLogBuffer  = '';
  var failedStepResults       = Cucumber.Type.Collection();
  var statsJournal            = Cucumber.Listener.StatsJournal();
  var colors                  = Cucumber.Util.Colors(true);

  options.logToFunction = function (message) {
    process.stdout.write(message);
  }

  var self = Cucumber.Listener.Formatter(options);

  var statusReportOrder = [
    Cucumber.Status.FAILED,
    Cucumber.Status.UNDEFINED,
    Cucumber.Status.PENDING,
    Cucumber.Status.SKIPPED,
    Cucumber.Status.PASSED
  ];

  var parentHear = self.hear;
  self.hear = function hear(event, callback) {
    statsJournal.hear(event, function () {
      parentHear(event, callback);
    });
  };

  self.handleStepResultEvent = function handleStepResult(event, callback) {
    var stepResult = event.getPayloadItem('stepResult');
    if (stepResult.getStatus() === Cucumber.Status.UNDEFINED) {
      self.handleUndefinedStepResult(stepResult);
    } else if (stepResult.getStatus() === Cucumber.Status.FAILED) {
      self.handleFailedStepResult(stepResult);
    }
    callback();
  };

  self.handleUndefinedStepResult = function handleUndefinedStepResult(stepResult) {
    var step = stepResult.getStep();
    self.storeUndefinedStepResult(step);
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

  self.storeUndefinedStepResult = function storeUndefinedStepResult(step) {
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
    var stepCounts = statsJournal.getStepCounts();
    if (stepCounts[Cucumber.Status.FAILED] > 0) {
      self.logFailedStepResults();
    }
    self.logScenariosSummary();
    if (stepCounts[Cucumber.Status.UNDEFINED] > 0) {
      self.logUndefinedStepSnippets();
    }
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
    self.logCountSummary('scenario', statsJournal.getScenarioCounts())
  };

  self.logCountSummary = function logCountSummary (type, counts) {
    var total = 0;

    for (var countType in counts) {
      total += counts[countType];
    }

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

  self.logUndefinedStepSnippets = function logUndefinedStepSnippets() {
    var undefinedStepLogBuffer = self.getUndefinedStepLogBuffer();
    if (options.snippets) {
      self.log(colors.pending('\nYou can implement step definitions for undefined steps with these snippets:\n\n'));
      self.log(colors.pending(undefinedStepLogBuffer));
    }
  };

  return self;
}

module.exports = DotFormatter;
