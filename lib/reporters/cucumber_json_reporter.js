var Cucumber = require('cucumber');
var fs = require('fs-extra');
var path = require('path');
var cucumberJunit = require('cucumber-junit')

function CucumberJsonReporter(options) {
  if (options == null) {
    options = {};
  }
  var reportsDir = options.reportsUrl;

  var JsonFormatter = Cucumber.Listener.JsonFormatter();

  JsonFormatter.log = function (json) {
    var featureName = JSON.parse(json)[0].id
    var reportFile = path.join(reportsDir, featureName + '.xml');
    fs.open(reportFile, 'w+', function (err, fd) {
      if (err) {
        fs.mkdirsSync(reportsDir);
        fd = fs.openSync(reportFile, 'w+');
      }

      fs.writeSync(fd, cucumberJunit(json));
    });
  };

  return JsonFormatter;
}

module.exports = CucumberJsonReporter;
