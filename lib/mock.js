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

var fs        = require('fs'),
    urlParser = require('url'),
    extend    = require('extend'),
    path      = require('path'),
    nock      = require('nock');

module.exports = Mock = {

  ////////////////////////////////////////////////////////////////////////////
  // Public methods /////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////

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
    return 'http://localhost:' + this.port + uri;
  },

  /**
   * MinorTest.removeMockBrowserRequest(mocks)
   * - mocks (Array)
   */
  removeMockBrowserRequest : function (mocks) {
    var url = this.getUrl('');
    this._removeMock(url, mocks);
  },

  /**
   * MinorTest.mockBrowserRequest(mocks)
   * - mocks (Array)
   */
  mockBrowserRequest : function (mocks) {
    var url = this.getUrl('');
    this._mock(url, mocks, true);
  },

  ////////////////////////////////////////////////////////////////////////////
  // Psuedo-private methods /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////

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
        filePathBase = this._getBasePath(),
        filePathJson,
        filePath,
        fixtureFile;

    switch (typeof options.fixture) {
      case 'undefined':
        return result.reply(status);
      case 'object':
        return result.reply(
          status,
          options.fixture,
          options.headers ? options.headers : {}
        );
      case 'string':
        if (options.fixture === '') throw new Error('Invalid fixture: Empty string is not allowed, use OK');
        filePathJson = path.join(filePathBase, '/test/fixtures/' + options.fixture + '.json');
        filePath     = path.join(filePathBase, '/test/fixtures/' + options.fixture);

        if (fs.existsSync(filePathJson)) {
          fixtureFile = require(filePathJson);

          // use extend so we get a copy of the fixture file
          if (Array.isArray(fixtureFile)) {
            fixtureFile = extend(true, [], fixtureFile);
          } else if (typeof fixtureFile === 'object') {
            fixtureFile = extend(true, {}, fixtureFile);
          }

          return result.reply(status, fixtureFile, options.headers ? options.headers : {} );
        } else if (fs.existsSync(filePath)) {
          fixtureFile = fs.readFileSync(filePath);
          return result.reply(status, fixtureFile);
        } else {
          return result.reply(status, options.fixture);
        }
        break;
      default:
        throw new Error('Invalid fixture: ' + JSON.stringify(options.fixture));
    }
  },

  /**
   * MinorTest._removeMock(url, mocks)
   * - url (String)
   * - mocks (Array)
   */
  _removeMock : function (url, mocks) {
    var self = this;

    if (!Array.isArray(mocks)) {
      mocks = [ mocks ];
    }

    return mocks.forEach(function(mock) {
      self._removeOne(url, mock);
    });
  },

  /**
   * MinorTest._removeOne(url, options)
   * - url (String)
   * - options (Object)
   */
  _removeOne : function (url, options) {
    // reconstruct nock scope
    var interceptOptions = {}
    var urlParts         = urlParser.parse(url);
    interceptOptions.port     = urlParts.port || ((urlParts.protocol === 'http:') ? 80 : 443);
    interceptOptions.proto    = urlParts.protocol.replace(/:$/, '');
    interceptOptions.hostname = urlParts.hostname;
    interceptOptions.method   = options.method || 'get';
    interceptOptions.path     = (options.query) ? options.path + '?' + options.query : options.path;

    return nock.removeInterceptor(interceptOptions);
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
    var result     = nock(url, {
          allowUnmocked: allowUnmocked
        }),
        httpMethod = options.method || 'get',
        httpBody   = httpMethod.toLowerCase() === 'delete' ? undefined : options.body,
        queryPath;

    if (options.query) {
      queryPath = options.path + '?' + options.query;
    } else {
      queryPath = options.path;
      result    = result.filteringPath(/\?.+$/g, '');
    }

    result = result.intercept(queryPath, httpMethod, httpBody);

    return this._getFixture(result, options);
  }
};