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

var fs      = require('fs'),
    path    = require('path'),
    Promise = require('bluebird'),
    nock    = require('nock'),
    Browser = require('zombie'),
    extend  = require('extend'),
    Mock    = require('./mock');

/**
 * Module to support functional testing of MinorJS web applications.
 *
 * For more information on the functional test browser, see the Zombie.js documentation.
 *
 * https://github.com/assaf/zombie
 *
 * For more information on HTTP mocking, see the nock.js documentation.
 *
 * https://github.com/pgte/nock
 *
 */
var MinorTest = {

  HTML_FILE : 'test.html',

  browser   : null,

  started   : false,

  options   : {},

  ////////////////////////////////////////////////////////////////////////////
  // Public methods /////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////

  /**
   * MinorTest.start()
   *
   * Runs once after the HTTP server starts.
   */
  start : function () {
    return Promise.resolve();
  },

  /**
   * MinorTest.before(done)
   * - done (Function)
   *
   * Runs once when the functional test suite starts.
   */
  before : function (done) {
    nock.enableNetConnect('localhost');
    done();
  },

  /**
   * MinorTest.beforeEach(done)
   * - done (Function)
   *
   * Runs before each test.
   */
  beforeEach : function (done) {
    done();
  },

  /**
   * MinorTest.clear()
   *
   * Clears all HTTP mocks.
   */
  clear : function () {
    nock.cleanAll();
    process.send({
      type  : 'clearMocks',
      start : Date.now()
    })
  },

  /**
   * MinorTest.save()
   */
  save : function () {
    var filename,
        html;

    html     = this.browser.html();
    filename = path.join(this._getBasePath(), 'test', this.HTML_FILE);

    fs.writeFileSync(filename, html);

    console.log('Wrote HTML to ' + filename);
  },

  /**
   * MinorTest.setPort(port)
   * - port (Integer)
   */
  setPort : function (port) {
    console.log('%%%%%%%%%%%%% setPort', port);
    this.port = port;
  },

  /**
   * MinorTest.setup(options) -> Function
   * - options (Object)
   */
  setup : function () {
    var self = this;

    return {
      run: function() {
        before(function(done) {
          self._before(done);
        });

        beforeEach(function(done) {
          self._beforeEach(done);
        });
      }
    };
  },

  ////////////////////////////////////////////////////////////////////////////
  // Psuedo-private methods /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////

  /**
   * MinorTest._before(done)
   * - done (Function)
   *
   * Run once when the functional test suite starts.
   */
  _before : function (done) {
    var self = this;

    process.env.NODE_ENV        = 'production';
    process.env.FUNCTIONAL_TEST = true;

    this.start()
      .then(function () {
        self.before(done);
      })
      .done();
  },

  /**
   * MinorTest._beforeEach(done)
   * - done (Function)
   *
   * Runs before each test.
   */
  _beforeEach : function (done) {
    var options = this.options.browser || {};
    // simulate browser onbeforeunload event when cleaning up browser
    if (this.browser && this.browser.window) {
      if (this.browser.window.onbeforeunload) {
        this.browser.window.onbeforeunload();
      }
      if (this.browser.window.onunload) {
        this.browser.window.onunload();
      }
      try {
        this.browser.destroy();
      } catch (e) {
        if (process.env.TEST_DEBUG === '1') {
          console.log('minorjs-test: error calling destroy() on zombie browser instance', e);
        }
      }
    }
    this.browser = new Browser(options);
    this.clear();
    this.beforeEach(done);
  }
};

module.exports = extend({}, Mock, MinorTest);
