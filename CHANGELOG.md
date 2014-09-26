# MinorJS Test Changelog

## Version 0.3.6, September 26th, 2014

* Allocating an open port for a web socket connection.

## Version 0.3.5, September 10th, 2014

* Switched from disconnect to kill to stop test runner workers.

## Version 0.3.4, September 2nd, 2014

* Make the deep copy of a fixture file work with arrays.

## Version 0.3.3, September 2nd, 2014

* Use extend module so we get a copy of the fixture file.

## Version 0.3.2, August 6th, 2014

* Avoid redundant binding of uncaughtException.

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