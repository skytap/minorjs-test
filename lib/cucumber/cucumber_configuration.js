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
    CucumberWorkerJsonReporter = require('../reporters/cucumber_json_reporter');
    IGNORED_TAGS            = ['~@manual', '~@nozombie'];

function CucumberConfiguration() {}

extend(CucumberConfiguration.prototype, {
  getFormatters: function () {
    var formatters = [ CucumberWorkerReporter(options) ]
    var options = {
      snippets   : true,
      showSource : true,
      stream     : process.stdout,
      useColors  : true
    };

    if (process.env.REPORTS_URL && process.env.REPORTS_URL !== 'undefined') {
      var jsonOptions = {
        reportsUrl: process.env.REPORTS_URL,
      }
      formatters.push(CucumberWorkerJsonReporter(jsonOptions))
    }

    return formatters
  },

  getFeatureSources: function () {
    var featureFilePaths    = [ process.env.WORKER_TEST ],
        featureSourceLoader = Cucumber.Cli.FeatureSourceLoader(featureFilePaths);
    return featureSourceLoader.getSources();
  },

  getAstFilter: function () {
    var tagGroups = Cucumber.TagGroupParser.getTagGroupsFromStrings(IGNORED_TAGS);
    var tagRules = tagGroups.map(function (tags) {
       return Cucumber.Ast.Filter.AnyOfTagsRule(tags);
    });
    var lineRule = Cucumber.Ast.Filter.ScenarioAtLineRule([]);
    var rules = tagRules.concat([lineRule]);
    return Cucumber.Ast.Filter(rules);
  },

  getSupportCodeLibrary: function () {
    var supportFiles         = process.env.SUPPORT_FILES.split(','),
        extensions           = ['js', 'coffee'],
        supportCodeFilePaths = Cucumber.Cli.SupportCodePathExpander.expandPaths(supportFiles, extensions),
        compilerModules      = ['coffee-script/register'],
        supportCodeLoader    = Cucumber.Cli.SupportCodeLoader(supportCodeFilePaths, compilerModules);
    return supportCodeLoader.getSupportCodeLibrary();
  },

  isDryRunRequested: function () {
    return false;
  },

  isFailFastRequested: function () {
    return false;
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
  },

  shouldUseColors: function () {
    return true;
  }
});

module.exports = CucumberConfiguration;
