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
    EventEmitter = require('events').EventEmitter,
    Mock         = require('./mock');

function Server () {}

extend(Server.prototype, EventEmitter.prototype, Mock, {

  port          : null,

  webSocketPort : null,

  started       : false,

  ////////////////////////////////////////////////////////////////////////////
  // Public methods /////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////

  /**
   * MinorTest.start()
   *
   * Runs once to start the server.
   */
  start : function () {
    if (this.started) {
      throw new Error('The server was already started');
    }

    process.env.NODE_ENV        = 'production';
    process.env.FUNCTIONAL_TEST = true;

    this.port           = process.env.WORKER_PORT;
    this.requestedPorts = process.env.REQUESTED_PORTS;

    return this._startServer();
  },

  ////////////////////////////////////////////////////////////////////////////
  // Psuedo-private methods /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////

  /**
   * MinorTest._startServer() -> Object
   */
  _startServer : function () {
    var self = this;

    if (typeof this.Server !== 'function') {
      throw new Error('You must specify a MinorJS HTTP server');
    }

    this.httpServer = new this.Server();

    return this.httpServer.initialize(this._getBasePath(), this.port)
      .then(function () {
        return self.httpServer.listen();
      })
      .then(function () {
        self.started = true;
        process.send({
          type : 'readyForTests'
        });
      });
  }
});

module.exports = Server;