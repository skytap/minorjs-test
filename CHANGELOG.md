# MinorJS Test Changelog

## Version 3.5.1, March 6th, 2016

* fix: listen for both exit and disconnect events to fix an intermittent test hang
* chore: fixed changelog file

## Version 3.5.0, January 2nd, 2016

* Downgraded bluebird to version 2.10

## Version 3.4.0, January 1st, 2016

* Upgraded to cucumber version 0.9.

## Version 3.3.0, December 30th, 2015

* Upgraded to cucumber version 0.8.0.

## Version 3.2.0, December 8th, 2015

* Downgraded cucumber module to 0.7.0.

## Version 3.1.0, December 7th, 2015

* Updated module dependencies.

## Version 3.0.0, October 23rd, 2015

* Work around zombie bug with the body of DELETE requests.

## Version 3.0.0-beta.1, October 22nd, 2015

* Fire the event indicating the suite is done before we kill the worker.

## Version 3.0.0-beta, October 22nd, 2015

* Upgraded to zombie version 4.

## Version 2.2.3, October 13th, 2015

* Fixed a bug introduced from upgrading cucumber.

## Version 2.2.2, October 12th, 2015

* Fix for API change introduced in cucumber 0.6.0.

## Version 2.2.1, October 12th, 2015

* Fix for API change introduced in cucumber 0.5.3.

## Version 2.2.0, October 12th, 2015

* Upgraded module dependencies.

## Version 2.1.0, September 28th, 2015

* Return mocked headers when fixture is passed as string.
* Pretty formatting for cucumber test dots.

## Version 2.0.1, August 6th, 2015

* Fixed a bug with console colors.

## Version 2.0.0, August 5th, 2015

* Added support for running tests with cucumber and feature files.
* Refactored the mocha test running code to be more modular.

## Version 1.6.0, July 21st, 2015

* Fixing number of requested ports to default to zero.

## Version 1.5.0, July 21st, 2015

* Added configurable number of ports for server instance.
* Potentially breaking change: functional.js now exposes requestedPorts array instead of webSocketPort variable.

## Version 1.4.0, June 1st, 2015

* Downgrade nock to version 1.9.0.

## Version 1.3.0, June 1st, 2015

* Updated nock version to 2.3.0.

## Version 1.2.2, April 8th, 2015

* Just use the hostname when configuring allowed connections through nock.

## Version 1.2.1, April 3rd, 2015

* Fixed a bug with mocking introduced from upgrading nock.

## Version 1.2.0, April 3rd, 2015

* Updated node module dependencies.

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