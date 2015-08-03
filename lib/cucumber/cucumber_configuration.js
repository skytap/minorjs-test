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

var extend                 = require('extend'),
    Cucumber               = require('cucumber'),
    CucumberWorkerReporter = require('../reporters/cucumber_worker_reporter');

function CucumberConfiguration() {}

extend(CucumberConfiguration.prototype, {
  getFormatter: function () {
    return CucumberWorkerReporter();
  },

  getFeatureSources: function () {
    var featureFilePaths    = [ process.env.WORKER_TEST ],
        featureSourceLoader = Cucumber.Cli.FeatureSourceLoader(featureFilePaths);
    return featureSourceLoader.getSources();
  },

  getAstFilter: function () {
    return Cucumber.Ast.Filter([Cucumber.Ast.Filter.ScenarioAtLineRule()]);
  },

  getSupportCodeLibrary: function () {
    var supportFiles         = process.env.SUPPORT_FILES.split(','),
        supportCodeFilePaths = Cucumber.Cli.ArgumentParser.SupportCodePathExpander.expandPaths(supportFiles),
        supportCodeLoader    = Cucumber.Cli.SupportCodeLoader(supportCodeFilePaths);
    return supportCodeLoader.getSupportCodeLibrary();
  },

  isHelpRequested: function () {
    return false;
  },

  isStrictRequested: function () {
    return false;
  },

  isVersionRequested: function () {
    return false;
  },

  shouldFilterStackTraces: function () {
    return false;
  }
});

module.exports = CucumberConfiguration;
