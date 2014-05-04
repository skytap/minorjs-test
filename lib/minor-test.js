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
    Q       = require('q'),
    nock    = require('nock'),
    Browser = require('zombie');

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
module.exports = MinorTest = {

  PORT      : 3000,

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
    // no op
  },

  /**
   * MinorTest.before(done)
   * - done (Function)
   *
   * Runs once when the functional test suite starts.
   */
  before : function (done) {
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
  },

  /**
   * MinorTest.getUrl(uri) -> String
   * - uri (String)
   */
  getUrl : function (uri) {
    if (uri == null) {
      uri = '/';
    }
    return 'http://localhost:' + this.PORT + uri;
  },

  /**
   * MinorTest.mockBrowserRequest(mocks)
   * - mocks (Array)
   */
  mockBrowserRequest : function (mocks) {
    var url = this.getUrl('');
    this._mock(url, mocks, true);
  },

  /**
   * MinorTest.save(selector)
   * - selector (String)
   */
  save : function (selector) {
    var filename,
        html;

    if (selector == null) {
      selector = '';
    }

    html     = this.browser.html(selector);
    filename = path.join(this._getBasePath(), 'test', this.HTML_FILE);

    fs.writeFileSync(filename, html);

    console.log('Wrote HTML to ' + filename);
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

    this._startServer()
      .then(function() {
        self.before(done);
      });
  },

  /**
   * MinorTest._beforeEach(done)
   * - done (Function)
   *
   * Runs before each test.
   */
  _beforeEach : function (done) {
    var options = this.options.browser || {};
    this.browser = new Browser(options);
    this.clear();
    this.beforeEach(done);
  },

  /**
   * MinorTest._getBasePath() -> String
   */
  _getBasePath : function () {
    var basePath = process.cwd();

    if (this.basePath) {
      return this.basePath;
    }

    while (basePath !== '/') {
      if (fs.existsSync(path.join(basePath, 'app.js')) || fs.existsSync(path.join(basePath, 'package.json'))) {
        break;
      } else {
        basePath = path.join(basePath, '..');
      }
    }

    if (basePath === '/') {
      throw new Error('Could not determine application base path');
    }

    return this.basePath = basePath;
  },

  /**
   * MinorTest._getFixture(result, options)
   * - result (Object)
   * - options (Object)
   */
  _getFixture : function (result, options) {
    var status = options.status || 200,
        filePath;

    switch (typeof options.fixture) {
      case 'undefined':
        return result.reply(status);
      case 'object':
        return result.reply(status, options.fixture);
      case 'string':
        filePath = path.join(
          this._getBasePath(),
          '/test/fixtures/' + options.fixture + '.json'
        );

        if (fs.existsSync(filePath)) {
          return result.replyWithFile(status, filePath);
        } else {
          return result.reply(status, options.fixture);
        }
        break;
      default:
        throw new Error('Invalid fixture: ' + JSON.stringify(options.fixture));
    }
  },

  /**
   * MinorTest._mock(url, mocks, allowUnmocked)
   * - url (String)
   * - mocks (Array)
   * - allowUnmocked (Boolean)
   */
  _mock : function (url, mocks, allowUnmocked) {
    var self = this;

    if (allowUnmocked == null) {
      allowUnmocked = false;
    }

    if (!Array.isArray(mocks)) {
      mocks = [ mocks ];
    }

    return mocks.forEach(function(mock) {
      self._mockOne(url, mock, allowUnmocked);
    });
  },

  /**
   * MinorTest._mockOne(url, options, allowUnmocked)
   * - url (String)
   * - options (Object)
   * - allowUnmocked (Boolean)
   */
  _mockOne : function (url, options, allowUnmocked) {
    var result = nock(url, {
          allowUnmocked: allowUnmocked
        }),
        queryPath;

    if (options.query) {
      queryPath = options.path + '?' + options.query;
    } else {
      queryPath = options.path;
      result    = result.filteringPath(/\?.+$/g, '');
    }

    result = result.intercept(queryPath, options.method || 'get');

    return this._getFixture(result, options);
  },

  /**
   * MinorTest._startServer() -> Object
   */
  _startServer : function () {
    var self = this;

    if (this.started) {
      return Q();
    }

    if (typeof this.Server !== 'function') {
      throw new Error('You must specify a MinorJS HTTP server');
    }

    this.httpServer = new this.Server();

    return this.httpServer.initialize(this._getBasePath(), this.PORT)
      .then(function() {
        return self.httpServer.listen();
      })
      .then(function () {
        self.start();
        self.started = true;
      });
  }
};