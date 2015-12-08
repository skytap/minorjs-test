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
    Cucumber     = require('cucumber'),
    DotFormatter = require('../cucumber/dot_formatter');

/**
 * Assembles test results from the worker processes and outputs the results
 * to the console.
 **/
function CucumberReporter (eventMediator) {
  var options = {
    snippets: true
  };
  this.failureCount  = 0;
  this.eventMediator = eventMediator;
  this.formatter     = DotFormatter(options);

  // all feature files are finished
  this.eventMediator.on('end', this.allFeaturesDone.bind(this));
}

extend(CucumberReporter.prototype, {

  ////////////////////////////////////////////////////////////////////////////
  // Public methods /////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////

  allFeaturesDone: function () {
    var event = Cucumber.Runtime.AstTreeWalker.Event('AfterAllFeatures', Cucumber.Ast.Features());
    this.formatter.hear(event, function () {});
  },

  /**
   * CucumberReporter.hasFailures() -> Boolean
   **/
  hasFailures : function () {
    return this.failureCount > 0;
  },

   /**
   * CucumberReporter._setColors(showColors)
   * - showColors (Boolean)
   **/
  setColors : function (showColors) {
    // no op
  },

  /**
   * CucumberReporter.handleTestResults(results)
   * - results (Object)
   **/
  handleTestResults: function (results) {
    var packet  = results.data,
        payload = this.hydratePayload(packet.name, packet.payload);

    var event = Cucumber.Runtime.AstTreeWalker.Event(packet.name, payload);

    this.formatter.hear(event, function () {});

    if (packet.payload && packet.payload.stepResult && event.getPayloadItem('stepResult').isFailed()) {
      this.failureCount++;
      this.eventMediator.emit('bail');
    }
  },

  /**
   * CucumberReporter.hydratePayload(eventName, payload)
   * - eventName (String)
   * - payload (Object)
   **/
  hydratePayload: function (eventName, payload) {
    var result;

    switch (eventName) {
      case 'BeforeScenario':
      case 'Scenario':
      case 'AfterScenario':
        result = {
          scenario: new Cucumber.Ast.Scenario(
            payload.scenario.keyword,
            payload.scenario.name,
            payload.scenario.description,
            payload.scenario.uri,
            payload.scenario.line
          )
        };
        for (index in payload.scenario.steps) {
          var step = payload.scenario.steps[index];
          result.scenario.addStep(step);
        }
        result.scenario.failed = payload.scenario.failed;
        break;

      case 'BeforeFeature':
      case 'Feature':
      case 'AfterFeature':
        result = new Cucumber.Ast.Feature(
          payload.feature.keyword,
          payload.feature.name,
          payload.feature.description,
          payload.feature.uri,
          payload.feature.line
        );
        break;

      case 'BeforeFeatures':
      case 'Features':
      case 'AfterFeatures':
        result = new Cucumber.Ast.Features();
        for (index in payload.features) {
          var feature = payload.features[index];
          result.addFeature(feature);
        }
        break;

      case 'BeforeStep':
      case 'Step':
      case 'AfterStep':
        result = {
          step: this.hydrateStep(payload.step)
        };
        break;

      case 'StepResult':
        var stepResult = extend({}, payload.stepResult);
        stepResult.step = this.hydrateStep(stepResult.step);
        result = {
          stepResult: this.hydrateStepResult(stepResult)
        };
        break;

      default:
        throw new Error('Invalid payload ' + eventName);
        break;
    }

    return result;
  },

  hydrateStepResult: function (stepResult) {
    var StepResult;

    if (stepResult.isFailed) {
      StepResult = Cucumber.Runtime.FailedStepResult;
    } else if (stepResult.isPending) {
      StepResult = Cucumber.Runtime.PendingStepResult;
    } else if (stepResult.isSkipped) {
      StepResult = Cucumber.Runtime.SkippedStepResult;
    } else if (stepResult.isSuccessful) {
      StepResult = Cucumber.Runtime.SuccessfulStepResult;
    } else if (stepResult.isUndefined) {
      StepResult = Cucumber.Runtime.UndefinedStepResult;
    } else {
      throw new Error('Unknown StepResult status');
    }

    if (stepResult.failureException != null) {
      e       = new Error(stepResult.failureException.message);
      e.name  = stepResult.failureException.name;
      e.stack = stepResult.failureException.stack.split("\n").slice(0, 10).join("\n") + "\n  ...";
      stepResult.failureException = e;
    }

    return new StepResult(stepResult);
  },

  hydrateStep: function (step) {
    var result = new Cucumber.Ast.Step(
      step.keyword,
      step.name,
      step.uri,
      step.line
    );
    result.attachDocString(step.docString);
    result.attachDataTable(step.dataTable);
    if (step.previousStep != null) {
      result.setPreviousStep(this.hydrateStep(step.previousStep));
    }
    return result;
  }
});

module.exports = CucumberReporter;