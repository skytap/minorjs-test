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
  var failedScenarioLogBuffer = '';
  var undefinedStepLogBuffer  = '';
  var failedStepResults       = Cucumber.Type.Collection();
  var statsJournal            = Cucumber.Listener.StatsJournal();
  var color                   = Cucumber.Util.ConsoleColor;

  var self = Cucumber.Listener.Formatter(options);

  var parentHear = self.hear;
  self.hear = function hear(event, callback) {
    statsJournal.hear(event, function () {
      parentHear(event, callback);
    });
  };

  self.handleStepResultEvent = function handleStepResult(event, callback) {
    var stepResult = event.getPayloadItem('stepResult');
    if (stepResult.isUndefined()) {
      self.handleUndefinedStepResult(stepResult);
    } else if (stepResult.isFailed()) {
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
    if (scenario.failed === true) {
      self.storeFailedScenario(scenario);
      self.log('F');
    } else {
      self.log('.');
    }
    callback();
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
    var snippetBuilder = Cucumber.SupportCode.StepDefinitionSnippetBuilder(step, self.getStepDefinitionSyntax());
    var snippet        = snippetBuilder.buildSnippet();
    self.appendStringToUndefinedStepLogBuffer(snippet);
  };

  self.getStepDefinitionSyntax = function getStepDefinitionSyntax() {
    var syntax = options.coffeeScriptSnippets ? 'CoffeeScript' : 'JavaScript';
    return new Cucumber.SupportCode.StepDefinitionSnippetBuilderSyntax[syntax]();
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
    if (statsJournal.witnessedAnyFailedStep())
      self.logFailedStepResults();
    self.logScenariosSummary();
    if (statsJournal.witnessedAnyUndefinedStep())
      self.logUndefinedStepSnippets();
  };

  self.logFailedStepResults = function logFailedStepResults() {
    self.log('Failed steps:\n\n');
    failedStepResults.syncForEach(function (stepResult) {
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
    var scenarioCount          = statsJournal.getScenarioCount();
    var passedScenarioCount    = statsJournal.getPassedScenarioCount();
    var undefinedScenarioCount = statsJournal.getUndefinedScenarioCount();
    var pendingScenarioCount   = statsJournal.getPendingScenarioCount();
    var failedScenarioCount    = statsJournal.getFailedScenarioCount();
    var details                = [];

    self.log(scenarioCount + ' scenario' + (scenarioCount !== 1 ? 's' : ''));
    if (scenarioCount > 0 ) {
      if (failedScenarioCount > 0)
        details.push(color.format('failed', failedScenarioCount + ' failed'));
      if (undefinedScenarioCount > 0)
        details.push(color.format('undefined', undefinedScenarioCount + ' undefined'));
      if (pendingScenarioCount > 0)
        details.push(color.format('pending', pendingScenarioCount + ' pending'));
      if (passedScenarioCount > 0)
        details.push(color.format('passed', passedScenarioCount + ' passed'));
      self.log(' (' + details.join(', ') + ')');
    }
    self.log('\n');
  };

  self.logUndefinedStepSnippets = function logUndefinedStepSnippets() {
    var undefinedStepLogBuffer = self.getUndefinedStepLogBuffer();
    if (options.snippets) {
      self.log(color.format('pending', '\nYou can implement step definitions for undefined steps with these snippets:\n\n'));
      self.log(color.format('pending', undefinedStepLogBuffer));
    }
  };

  return self;
}

module.exports = DotFormatter;
