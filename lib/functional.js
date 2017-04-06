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

var path             = require('path'),
    fs               = require('fs'),
    cluster          = require('cluster'),
    child_process    = require('child_process'),
    EventEmitter     = require('events').EventEmitter,
    Promise          = require('bluebird'),
    _                = require('underscore'),
    portfinder       = require('portfinder'),
    glob             = require('glob'),
    extend           = require('extend'),
    CucumberReporter = require('./reporters/cucumber_reporter'),
    MochaReporter    = require('./reporters/mocha_reporter'),
    ServerInstance   = require('./server_instance');

module.exports = Functional = {

  MAX_SERVERS         : 2,

  TEST_DIRECTORY      : 'test/functional/',

  TYPE_CUCUMBER       : 'cucumber',

  TYPE_MOCHA          : 'mocha',

  servers             : [],

  serversDone         : 0,

  eventMediator       : null,

  tests               : [],

  testsCount          : 0,

  finishedSuitesCount : 0,

  finishedSuites      : [],

  hasFailingTest      : false,

  ////////////////////////////////////////////////////////////////////////////
  // Public methods /////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////

  /**
   * Functional.start(options) -> Promise
   * - options (Object)
   **/
  start : function (options) {
    var self = this;

    if (options == null) {
      options = {};
    }

    this.options = extend({
      requestedPorts : 0,
      type           : this.TYPE_MOCHA
    }, options);

    this.eventMediator = new EventEmitter();

    this.eventMediator.on('bail', this._bail.bind(this));

    switch (this.options.type) {
      case this.TYPE_CUCUMBER:
        this.reporter = new CucumberReporter(this.eventMediator);
        break;
      case this.TYPE_MOCHA:
      default:
        this.reporter = new MochaReporter(this.eventMediator);
    }

    this._setColors();

    this._handleSignals();

    cluster.setupMaster({
      exec   : path.join(__dirname, 'fork_worker.js'),
      silent : false
    });

    this._loadTestSuites()
      .then(function (tests) {
        return self._processTests(self._batchTests(tests));
      })
      .then(function(){
        self.eventMediator.emit('start');
        return self._getOpenPorts(self.options.requestedPorts);
      })
      .then(function (ports) {
        for (var i=0; i<self._getMaxServers(); i++) {
          var portBlockSize  = self.options.requestedPorts + 1,
              portBlockStart = i * portBlockSize,
              port           = ports[portBlockStart],
              requestedPorts = ports.slice(portBlockStart+1, portBlockStart+portBlockSize);

          self._createServerWorker(port, requestedPorts);
        }
      })
      .done();
  },

  ////////////////////////////////////////////////////////////////////////////
  // Psuedo-private methods /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////

  /**
   * Functional._batchTests(testPaths)
   * - testPaths (Array)
   *
   * Return sub array of testPaths.
   **/
  _batchTests : function (testPaths) {
    var batchCount = this.options.batchCount
    var currentBatch = this.options.currentBatch
    if (!batchCount && !currentBatch) {
      return testPaths
    }
    var batchSize = Math.floor(testPaths.length / batchCount)
    var end = (batchSize * currentBatch)
    var start = (end - batchSize)
    if (batchCount === currentBatch) {
      end = undefined
    }
    return testPaths.slice(start, end)
  },

  /**
   * Functional._bail()
   *
   * Bail out of running any more tests when we encounter a failure.
   **/
  _bail : function () {
    this.hasFailingTest = true;
    this.tests          = [];
  },

  /**
   * Functional._checkMissingSuites()
   *
   * See if we failed to run any test suites.
   **/
  _checkMissingSuites : function () {
    var missedSuites = _.difference(this.originalTests, this.finishedSuites);

    if (missedSuites.length > 0 && !this.hasFailingTest) {
      console.log("\nError! Expected to run " + this.originalTests.length +
        ' test suites but actually ran ' + this.finishedSuites.length +
        '. Missing '  + missedSuites.length +
        ' test ' + (missedSuites.length > 1 ? 'suites' : 'suite') + '. Suites not run:');
      console.log(missedSuites);
    }
  },

  /**
   * Functional._checkPathExists(testPath)
   * - testPath (String)
   *
   * Exit if the file/directory doesn't exist.
   **/
  _checkPathExists : function (testPath) {
    if (!fs.existsSync(testPath)) {
      console.log("The path '" + testPath + "' does not exist.");
      process.exit();
    }
  },

  /**
   * Functional._createServerWorker(port, requestedPorts)
   * - port (Integer)
   * - requestedPorts (Integer)
   **/
  _createServerWorker : function (port, requestedPorts) {
    var self           = this,
        serverInstance = this._getServerInstance(port, requestedPorts);

    this.servers.push(serverInstance);

    serverInstance.on('readyForTests', function () {
      self._runTestOnServer(serverInstance);
    });

    serverInstance.on('done', function () {
      self._incrementDone();
    });

    serverInstance.on('testResults', this.reporter.handleTestResults.bind(this.reporter));

    serverInstance.on('suiteDone', function (suite) {
      self.finishedSuitesCount++;
      self.finishedSuites.push(suite.data);
    });
  },

  /**
   * Functional._finish()
   **/
  _finish : function () {
    this.servers.forEach(function (server) {
      server.disconnect();
    });
  },

  /**
   * Functional._getMaxServers() -> Integer
   **/
  _getMaxServers : function () {
    return Math.min(parseInt(process.env.MAX_SERVERS) || this.MAX_SERVERS, this.testsCount);
  },

  /**
   * Functional._getOpenPort() -> Object
   **/
  _getOpenPort : function () {
    return new Promise(function (resolve, reject) {
      portfinder.getPort(function (error, port) {
        if (error) {
          reject(error);
        } else {
          resolve(port);
        }
      });
    });
  },

  /**
   * Functional._getOpenPorts() -> Array
   * Allocates a port for each server instance, and each requested port per each server instance
   **/
  _getOpenPorts : function (requestedPortCount) {
    var self      = this,
        promises  = [],
        totalPorts = this._getMaxServers() * (requestedPortCount + 1);

    for (var i = 0; i < totalPorts; i++) {
      promises.push((function () {
        return self._getOpenPort();
      })());
    }

    return Promise.all(promises);
  },

  /**
   * Functional._getServerInstance(port, requestedPorts) -> Object
   * - port (Integer)
   * - requestedPorts (Integer)
   **/
  _getServerInstance : function (port, requestedPorts) {
    return new ServerInstance({
      port           : port,
      requestedPorts : requestedPorts,
      server         : this.options.server,
      maxMemory      : this.options.maxMemory,
      maxTests       : this.options.maxTests,
      slow           : this.options.slow,
      timeout        : this.options.timeout,
      type           : this.options.type,
      supportFiles   : this.options.supportFiles || []
    });
  },

  /**
   * Functional._getTest() -> String
   **/
  _getTest : function () {
    return this.tests.length > 0 ? this.tests.shift() : null;
  },

  /**
   * Functional._getTestDirectory() -> String
   **/
  _getTestDirectory : function () {
    return this.options.testPath || this.TEST_DIRECTORY;
  },

  /**
   * Functional._handleSignals()
   **/
  _handleSignals : function () {
    var self = this;

    process.on('SIGINT', function handleInteruptSignal () {
      self._shutdown();
    });

    process.on('uncaughtException', function handleException (error) {
      console.log(error.stack);
      self._bail();
      self._shutdown(1);
    });
  },

  /**
   * Functional._incrementDone()
   *
   * Keep track of the number of servers that have finished. Exit
   * the process when all workers are finished.
   **/
  _incrementDone : function () {
    this.serversDone++;

    if (this.serversDone === this._getMaxServers()) {
      this._checkMissingSuites();
      this.eventMediator.emit('end');
      this._shutdown(this.reporter.hasFailures() ? 1 : 0);
    }
  },

  /**
   * Functional._isTestFileSpecified() -> Boolean
   **/
  _isTestFileSpecified : function () {
    var extension = path.extname(this.options.testPath || '');
    return extension === '.js' || extension === '.coffee' || extension === '.feature';
  },

  /**
   * Functional._loadTestSuites() -> Object
   **/
  _loadTestSuites : function () {
    if (this._isTestFileSpecified()) {
      this._checkPathExists(this.options.testPath);

      return Promise.resolve([ this.options.testPath ]);
    }

    var directory = this._getTestDirectory();

    this._checkPathExists(directory);

    var pattern = path.join(directory, '/**/*.{js,coffee,feature}');

    return Promise.promisify(glob)(pattern);
  },

  /**
   * Functional._processTests(tests) -> Object
   * - tests (Array)
   **/
  _processTests : function (tests) {
    var self     = this,
        command  = "egrep '(describe|it).only' " + tests.join(' ');

    return new Promise(function (resolve, reject) {
      child_process.exec(
        command,
        function (error, stdout, stderr) {
          if (error || stderr) {
            self._updateTests(tests);
            resolve();
            return;
          }

          var rows = stdout.split('\n');

          if (rows.length > 0) {
            tests = [];
          }

          rows.forEach(function (row) {
            row = row.trim();

            if (row.length === 0) {
              return;
            }

            tests.push(row.split(':')[0]);
          });

          self._updateTests(_.uniq(tests));

          resolve();
        }
      );
    });
  },

  /**
   * Functional._runTestOnServer(server)
   * - server (Object)
   **/
  _runTestOnServer : function (server) {
    var test = this._getTest();

    if (!test) {
      server.disconnectNow();
      this._finish();
      return;
    }

    server.run(test);
  },

  /**
   * Functional._setColors()
   **/
  _setColors : function () {
    if (process.env.TEST_COLORS !== undefined) {
      this.reporter.setColors(process.env.TEST_COLORS == 0 ? false : true);
    }
  },

  /**
   * Functional._shutdown(exitCode)
   * - exitCode (Integer)
   **/
  _shutdown : function (exitCode) {
    exitCode = exitCode || 0

    // make sure all the workers are disconnected before exiting
    cluster.disconnect(function () {
      process.exit(exitCode);
    });
  },

  /**
   * Functional._updateTests(tests)
   * - tests (Array)
   **/
  _updateTests : function (tests) {
    this.originalTests = [].concat(tests);
    this.tests         = tests;
    this.testsCount    = tests.length;
    console.log('Running ' + this.testsCount + ' test ' + (this.testsCount > 1 ? 'suites' : 'suite'));
  }
};
