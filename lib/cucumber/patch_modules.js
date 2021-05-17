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

var extend         = require('extend'),
    Cucumber       = require('cucumber'),
    scenarioFailed = false;

// Event
var OriginalEvent = Cucumber.Runtime.AstTreeWalker.Event;

Cucumber.Runtime.AstTreeWalker.Event = function (name, payload) {
  var module = OriginalEvent(name, payload);
  module.toJSON = function () {
    return {
      name    : name,
      payload : module.payloadToJSON()
    };
  };

  module.payloadToJSON = function () {
    var result = extend({}, payload);

    switch (name) {
      case 'BeforeScenario':
        scenarioFailed = false;
      case 'Scenario':
      case 'AfterScenario':
        result.scenario = payload.scenario.toJSON();
        break;
      case 'ScenarioResult':
        result.scenarioResult = payload.scenarioResult.toJSON();
        break;
      case 'BeforeFeature':
      case 'Feature':
      case 'AfterFeature':
        result.feature = payload.feature.toJSON();
        break;
      case 'BeforeFeatures':
      case 'Features':
      case 'AfterFeatures':
        result.features = payload.features.toJSON();
        break;
      case 'FeaturesResult':
        result.featuresResult = payload.featuresResult.toJSON();
        break;
      case 'BeforeStep':
      case 'Step':
      case 'AfterStep':
        result.step = payload.step.toJSON();
        break;
      case 'StepResult':
        result.stepResult = payload.stepResult.toJSON();
        break;
      case 'Background':
        result.background = payload.background.toJSON();
        break;
    }
    return result;
  };
  return module;
}

// Features
var OriginalFeatures = Cucumber.Ast.Features;

Cucumber.Ast.Features = function () {
  var module = OriginalFeatures();
  module.toJSON = function () {
    return {
      features: module.getFeatures()
    };
  };
  return module;
}

// Feature
var OriginalFeature = Cucumber.Ast.Feature;

Cucumber.Ast.Feature = function (keyword, name, description, uri, line) {
  var module = OriginalFeature(keyword, name, description, uri, line);
  module.toJSON = function () {
    return {
      keyword     : keyword,
      name        : name,
      description : description,
      uri         : uri,
      line        : line,
      background  : module.getBackground()
    };
  };
  return module;
}

// FeaturesResult
var OriginalFeaturesResult = Cucumber.Runtime.FeaturesResult;

Cucumber.Runtime.FeaturesResult = function (strict) {
  var module = OriginalFeaturesResult(strict);
  module.toJSON = function () {
    return {
      counts: module.getScenarioCounts()
    }
  };
  return module;
}

// Scenario
var OriginalScenario = Cucumber.Ast.Scenario;

Cucumber.Ast.Scenario = function (keyword, name, description, uri, line, scenarioOutlineLine) {
  var module = OriginalScenario(keyword, name, description, uri, line, scenarioOutlineLine);
  module.toJSON = function () {
    return {
      keyword             : keyword,
      name                : name,
      description         : description,
      uri                 : uri,
      line                : line,
      scenarioOutlineLine : scenarioOutlineLine,
      steps               : module.getSteps(),
      background          : module.getBackground(),
      failed              : scenarioFailed
    };
  };
  return module;
}

// ScenarioResult
var OriginalScenarioResult = Cucumber.Runtime.ScenarioResult;

Cucumber.Runtime.ScenarioResult = function (scenario) {
  var module = OriginalScenarioResult(scenario);
  module.toJSON = function () {
    return scenario;
  };
  return module;
}

// Step
var OriginalStep = Cucumber.Ast.Step;

Cucumber.Ast.Step = function (keyword, name, uri, line) {
  var module = OriginalStep(keyword, name, uri, line);
  module.toJSON = function () {
    var previousStep = module.getPreviousStep();
    return {
      keyword      : keyword,
      name         : name,
      uri          : uri,
      line         : line,
      docString    : module.getDocString(),
      dataTable    : module.getDataTable(),
      previousStep : previousStep != null ? previousStep.toJSON() : null
    };
  };
  return module;
}

// StepResult
var OriginalStepResult = Cucumber.Runtime.StepResult;

Cucumber.Runtime.StepResult = function (payload) {
  var module = OriginalStepResult(payload);
  module.toJSON = function () {
    var result = extend({}, payload);
    if (result.failureException != null) {
      result.failureException = {
        name    : result.failureException.name,
        message : result.failureException.message,
        stack   : result.failureException.stack
      };
    }
    if (payload.status === Cucumber.Status.FAILED ||
        payload.status === Cucumber.Status.AMBIGUOUS) {
      scenarioFailed = true;
    }

    if (payload.ambiguousStepDefinitions) {
      result.ambiguousStepDefinitions = payload.ambiguousStepDefinitions.map(function (stepDefinition) {
        return stepDefinition.toJSON();
      });
    }

    return result;
  };
  return module;
}

// StepDefinition
var OriginalStepDefinition = Cucumber.SupportCode.StepDefinition;

Cucumber.SupportCode.StepDefinition = function (pattern, options, code, uri, line) {
  var module = OriginalStepDefinition(pattern, options, code, uri, line);
  module.toJSON = function () {
    return {
      pattern : pattern.source,
      options : options,
      code    : code,
      uri     : uri,
      line    : line
    };
  };
  return module;
}

// Background
var OriginalBackground = Cucumber.Ast.Background;

Cucumber.Ast.Background = function (keyword, name, description, uri, line) {
  var module = OriginalBackground(keyword, name, description, uri, line);
  module.toJSON = function () {
    return {
      keyword             : keyword,
      name                : name,
      description         : description,
      uri                 : uri,
      line                : line,
      steps               : module.getSteps()
    };
  };
  return module;
}
