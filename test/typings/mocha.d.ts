/**
 * @link https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/mocha/index.d.ts
 */

/**
 * Describe a "suite" containing nested suites and tests.
 */

declare function describe(title: string, fn?: Function): any

/**
 * Describes a test case.
 */
declare function it(fn: Function): any
declare function it(title: string, fn?: Function): any
