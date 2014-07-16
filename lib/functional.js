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

var path           = require('path'),
    cluster        = require('cluster'),
    child_process  = require('child_process'),
    EventEmitter   = require('events').EventEmitter,
    Q              = require('q'),
    _              = require('underscore'),
    portfinder     = require('portfinder'),
    glob           = require('glob'),
    DotReporter    = require('mocha/lib/reporters/dot'),
    ServerInstance = require('./server_instance');

module.exports = Functional = {

  // @todo make this configurable at runtime
  MAX_SERVERS         : 2,

  servers             : [],

  serversDone         : 0,

  mochaRunner         : null,

  tests               : [],

  testsCount          : 0,

  finishedSuitesCount : 0,

  finishedSuites      : [],

  hasFailingTest      : false,

  ////////////////////////////////////////////////////////////////////////////
  // Public methods /////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////

  /**
   * Functional.start(options)
   * - options (Object)
   **/
  start : function (options) {
    var self = this;

    this.options = options || {};

    this.mochaRunner = new EventEmitter();
    this.reporter    = new DotReporter(this.mochaRunner);

    this._handleSignals();

    cluster.setupMaster({
      exec   : path.join(__dirname, 'fork_worker.js'),
      silent : false
    });

    this._loadTestSuites()
      .then(function (tests) {
        return self._processTests(tests);
      })
      .then(function () {
        self.mochaRunner.emit('start');
        return self._getOpenPorts();
      })
      .then(function (ports) {
        for (var index in ports) {
          var port = ports[index];

          self._createServerWorker(port);
        }
      })
      .done();
  },

  ////////////////////////////////////////////////////////////////////////////
  // Psuedo-private methods /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////

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
   * Functional._createServerWorker(port)
   * - port (Integer)
   **/
  _createServerWorker : function (port) {
    var self           = this,
        serverInstance = this._getServerInstance(port);

    this.servers.push(serverInstance);

    serverInstance.on('readyForTests', function () {
      self._runTestOnServer(serverInstance);
    });

    serverInstance.on('done', function () {
      self._incrementDone();
    });

    serverInstance.on('testResults', function (results) {
      var data = self._hydrateTestResult(results.data);

      if (data.event === 'fail') {
        self._bail();
      }

      self.mochaRunner.emit(
        data.event,
        data.test,
        data.test.err ? data.test && data.test.err : null
      );
    });

    serverInstance.on('uncaughtException', function () {
      self._bail();
    });

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
    var deferred = Q.defer();
    portfinder.getPort(deferred.makeNodeResolver());
    return deferred.promise;
  },

  /**
   * Functional._getOpenPorts() -> Array
   **/
  _getOpenPorts : function () {
    var self     = this,
        promises = [];

    for (var i = 0; i < this._getMaxServers(); i++) {
      promises.push((function () {
        return self._getOpenPort();
      })());
    }

    return Q.all(promises);
  },

  /**
   * Functional._getServerInstance(port) -> Object
   * - port (Integer)
   **/
  _getServerInstance : function (port) {
    return new ServerInstance(port, this.options.server);
  },

  /**
   * Functional._getTest() -> String
   **/
  _getTest : function () {
    return this.tests.length > 0 ? this.tests.shift() : null;
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
      self._shutdown(1);
    });
  },

  /**
   * Functional._hasFailures() -> Boolean
   **/
  _hasFailures : function () {
    return this.reporter.stats.failures > 0;
  },

  /**
   * Functional._hydrateTestResult(data) -> Object
   * - data (Object)
   **/
  _hydrateTestResult : function (data) {
    data = JSON.parse(data);

    data.test.slow = function () {
      return this._slow;
    };

    data.test.fullTitle = function () {
      return this._fullTitle;
    };

    return data;
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
      this.mochaRunner.emit('end');
      this._shutdown(this._hasFailures() ? 1 : 0);
    }
  },

  /**
   * Functional._loadTestSuites() -> Object
   **/
  _loadTestSuites : function () {
    var deferred = Q.defer();
    glob('test/functional/**/*.coffee', deferred.makeNodeResolver());
    return deferred.promise;
  },

  /**
   * Functional._processTests(tests) -> Object
   * - tests (Array)
   **/
  _processTests : function (tests) {
    var self     = this,
        command  = "egrep '(describe|it).only' " + tests.join(' '),
        deferred = Q.defer();

    child_process.exec(
      command,
      function (error, stdout, stderr) {
        if (error || stderr) {
          self._updateTests(tests);
          deferred.resolve();
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

        deferred.resolve();
      }
    );

    return deferred.promise;
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