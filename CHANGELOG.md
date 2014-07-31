# MinorJS Test Changelog

## Version 0.3.1, July 31st, 2014

* Updated nock, glob and mocha dependencies.

## Version 0.3.0, July 29th, 2014

* Added the ability to specify the mock request body (rdevaissiere). This is useful for ensuring the request body contains the correct data.

## Version 0.2.0, July 16th, 2014

* Make sure the framework can load both .js and .coffee test suite files.

## Version 0.1.0, July 16th, 2014

* Refactored the framework to run tests in a separate worker process by leveraging the cluster module.
* Added warnings when a test suite isn't run (for example when a test process exits prematurely).

## Version 0.0.1, May 2nd, 2014

* Initial release.