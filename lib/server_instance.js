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
    extend       = require('extend');

function ServerInstance (options) {
  this.exit          = false
  this.port          = options.port;
  this.webSocketPort = options.webSocketPort;
  this.maxMemory     = options.maxMemory;
  this.maxTests      = options.maxTests;
  this.slow          = options.slow;
  this.timeout       = options.timeout;

  this.server        = cluster.fork({
    WORKER_SCRIPT         : options.server || './server',
    WORKER_PORT           : options.port,
    WORKER_WEBSOCKET_PORT : options.webSocketPort,
    WORKER_MAX_MEMORY     : options.maxMemory,
    WORKER_MAX_TESTS      : options.maxTests,
    WORKER_SLOW           : options.slow,
    WORKER_TIMEOUT        : options.timeout
  });

  this._setupListeners();
}

extend(ServerInstance.prototype, EventEmitter.prototype, {

  ////////////////////////////////////////////////////////////////////////////
  // Public methods /////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////

  /**
   * ServerInstance.disconnect()
   *
   * The server will disconnect after finishing the test.
   **/
  disconnect : function () {
    this.exit = true;
  },

  /**
   * ServerInstance.disconnectNow()
   *
   * The server will disconnect immediately.
   **/
  disconnectNow : function () {
    this.emit('done');
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
    var self   = this,
        runner = cluster.fork({
          WORKER_SCRIPT         : './runner',
          WORKER_TEST           : test,
          WORKER_PORT           : this.getPort(),
          WORKER_WEBSOCKET_PORT : this.webSocketPort,
          WORKER_MAX_MEMORY     : this.maxMemory,
          WORKER_MAX_TESTS      : this.maxTests,
          WORKER_SLOW           : this.slow,
          WORKER_TIMEOUT        : this.timeout
        });

    runner.on('message', function (message) {
      switch (message.type) {
        case 'testResults':
        case 'suiteDone':
          self.emit(message.type, message);
          break;
        default:
          try {
            self.server.send(message);
          } catch (e) {
            self.disconnectNow();
          }
      }
    });

    runner.on('disconnect', function () {
      runner.removeAllListeners();
      delete runner;

      if (self.exit) {
        self.disconnectNow();
      } else {
        self.emit('readyForTests');
      }
    });
  },

  ////////////////////////////////////////////////////////////////////////////
  // Psuedo-private methods /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////

  /**
   * ServerInstance._setupListeners()
   **/
  _setupListeners : function () {
    var self = this;

    this.server.on('message', function (message) {
      switch (message.type) {
        case 'readyForTests':
          self.emit('readyForTests');
      }
    });
  }
});

module.exports = ServerInstance;