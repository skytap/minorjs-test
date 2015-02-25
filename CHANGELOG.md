# MinorJS Test Changelog

## Version 1.1.0, February 25th, 2015

* Added support for running tests with no colors by specifying the TEST_COLORS=0 environment variable.

## Version 1.0.0, February 19th, 2015

* Stopped using zero based versioning for the project.
* Switched from Q to bluebird promises. bluebird implements Promises/A+.

## Version 0.5.0, February 15th, 2015

* Upgraded to zombie version 3.
* Always save the entire document when calling the save method.

## Version 0.4.1, January 1st, 2015

* Added support for running a single test file or a directory of tests.

## Version 0.4.0, December 30th, 2014

* Updated module dependencies.

## Version 0.3.10, November 17th, 2014

* Allow the server to send messages to the runner.

## Version 0.3.9, November 12th, 2014

* Provide the server with the test runner cluster ID.

## Version 0.3.8, October 17th, 2014

* Made the max memory, max tests, slow test and test timeout values configurable at runtime.

## Version 0.3.7, October 10th, 2014

* Updated zombie and underscore dependencies.

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