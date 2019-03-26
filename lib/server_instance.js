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

var cluster      = require('cluster'),
    EventEmitter = require('events').EventEmitter,
    extend       = require('extend'),
    WorkerMeta   = require('./worker_meta');

function ServerInstance (options) {
  this.port           = options.port;
  this.requestedPorts = options.requestedPorts;
  this.maxMemory      = options.maxMemory;
  this.maxTests       = options.maxTests;
  this.slow           = options.slow;
  this.timeout        = options.timeout;
  this.testType       = options.type;
  this.reportsUrl     = options.reportsUrl;
  this.supportFiles   = options.supportFiles || [];

  this._onRunnerMessage = this._onRunnerMessage.bind(this);
  this._onRunnerExit    = this._onRunnerExit.bind(this);

  this.server        = cluster.fork({
    WORKER_SCRIPT         : options.server || './server',
    WORKER_PORT           : options.port,
    REQUESTED_PORTS       : options.requestedPorts,
    WORKER_MAX_MEMORY     : options.maxMemory,
    WORKER_MAX_TESTS      : options.maxTests,
    WORKER_SLOW           : options.slow,
    WORKER_TIMEOUT        : options.timeout,
    TEST_TYPE             : options.type,
    SUPPORT_FILES         : options.supportFiles,
    REPORTS_URL           : options.reportsUrl
  });

  WorkerMeta.registerServerWorker(this.server.id);
  this._setupListeners();
}

extend(ServerInstance.prototype, EventEmitter.prototype, {

  ////////////////////////////////////////////////////////////////////////////
  // Public methods /////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////

  shutdown : function () {
    if (this._serverShuttingDown) { return }
    this._serverShuttingDown = true;
    if (this.runner && this.runner.isConnected()) {
      // Tell the runner worker to shutdown.
      // When the runner worker exits it will
      // initiate the server worker shutdown.
      return this._cleanKill(this.runner);
    }
    // No connected runner worker to worry about, shutdown the server
    return this._cleanKill(this.server);
  },

  /**
   * ServerInstance.getPort() -> Integer
   **/
  getPort : function () {
    return this.port;
  },

  /**
   * ServerInstance.getServer() -> Object
   **/
  getServer : function () {
    return this.server;
  },

  /**
   * ServerInstance.run(test)
   * - test (String)
   **/
  run : function (test) {
    if (this._serverShuttingDown) { return }
    this.runner = cluster.fork({
      WORKER_SCRIPT         : './runner',
      WORKER_TEST           : test,
      WORKER_PORT           : this.getPort(),
      REQUESTED_PORTS       : this.requestedPorts,
      WORKER_MAX_MEMORY     : this.maxMemory,
      WORKER_MAX_TESTS      : this.maxTests,
      WORKER_SLOW           : this.slow,
      WORKER_TIMEOUT        : this.timeout,
      TEST_TYPE             : this.testType,
      SUPPORT_FILES         : this.supportFiles,
      REPORTS_URL           : this.reportsUrl
    });

    WorkerMeta.registerRunnerWorker(this.runner.id);
    this.runner.on('message', this._onRunnerMessage);
    this.runner.on('exit', this._onRunnerExit);
  },

  ////////////////////////////////////////////////////////////////////////////
  // Psuedo-private methods /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////

  _onRunnerMessage(message) {
    switch (message.type) {
      case 'testResults':
      case 'suiteDone':
        this.emit(message.type, message);
        break;
      default:
        if (this._serverShuttingDown) {
          // server is shutting down so don't forward messages to the server worker anymore
          return;
        }
        try {
          message.runnerId = this.runner.id;
          this.server.send(message);
        } catch (e) {
          console.log(
            'Unable to forward runner worker message to server:', message,
            'reason:', e,
          );
          this.shutdown();
        }
    }
  },

  _onRunnerExit(code) {
    if (this._serverShuttingDown) {
      // server is shutting down
      return this._cleanKill(this.server);
    }

    var askForAnother = (this.runner.exitedAfterDisconnect && code === 0);

    this.runner.removeListener('message', this._onRunnerMessage);
    this.runner.removeListener('exit', this._onRunnerExit);
    delete this.runner;

    if (askForAnother) {
      // successful test run, ask for another
      this.emit('readyForTests');
    }
  },

  /**
   * ServerInstance._setupListeners()
   **/
  _setupListeners : function () {
    this.server.on('message', message => {
      switch (message.type) {
        case 'readyForTests': {
          this.emit('readyForTests');
          break;
        }
        default: {
          if (this._serverShuttingDown) {
            // server is shutting down so don't forward messages to the runner worker anymore
            return;
          }
          try {
            this.runner.send(message);
          } catch (e) {
            if (process.env.TEST_DEBUG === '1') {
              console.log(
                'Unable to forward server worker message to runner:', message,
                'reason:', e,
              );
            }
          }
        }
      }
    });
  },

  /**
   * _cleanKill(worker)
   *
   * @param {Worker} worker
   *
   * Send a shutdown message to the worker process.
   * Wait a few seconds for a disconnect response,
   * if one is not received then kill the worker.
   *
   * Modeled after https://nodejs.org/api/cluster.html#cluster_worker_disconnect
   */
  _cleanKill : function (worker) {
    if (!worker.isConnected()) {
      // worker is already disconnected
      return
    }
    var meta = WorkerMeta.clusterMap[worker.id];
    var customId = (meta) ? meta.customId : null;
    var timeout = null;
    var onDisconnect = function() {
      worker.removeListener('disconnect', onDisconnect);
      clearTimeout(timeout);
    }
    worker.on('disconnect', onDisconnect);
    // send the shutdown signal
    worker.send({ type: 'shutdown', customId, });
    // if the worker doesn't disconnect itself from the shutdown signal
    // we'll send a kill signal
    timeout = setTimeout(function () {
      worker.removeListener('disconnect', onDisconnect);
      worker.kill();
    }, 4000);
  },
});

module.exports = ServerInstance;
