var Cucumber = require('cucumber');
var fs = require('fs-extra');
var path = require('path');
var cucumberJunit = require('cucumber-junit');

function CucumberJsonReporter(options) {
  if (options == null) {
    options = {};
  }
  var reportsDir = options.reportsUrl;

  var JsonFormatter = Cucumber.Listener.JsonFormatter();

  JsonFormatter.log = function (json) {
    var feature = JSON.parse(json)[0]
    if (!feature) {
      return
    }
    var featureName = feature.id
    var reportFile = path.join(reportsDir, featureName + '.xml');
    var output = cucumberJunit(json);
    try {
      fs.writeFileSync(reportFile, output)
    } catch(err) {
      fs.mkdirsSync(reportsDir);
      fs.writeFileSync(reportFile, output);
    }
  }
  return JsonFormatter;
}
module.exports = CucumberJsonReporter;
