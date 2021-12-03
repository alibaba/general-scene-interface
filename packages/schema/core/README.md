This is the core interface of General Scene Interface.

This interface is written in Typescript but extra strict static types
to make sure it can be translated into C-style structs word-by-word.

Any typescript or javascript specific feature is not allowed in this package.

A loose version is provided to make your life easier
but keep in mind ALL processors (expect refiners) and backends
only guarantee to accept strict version of schema.

## About extensions

It is necessary to only keep stable and universal parameters in the core schema.
Un-stable parameters and implement-specific features goes to extensions.
Extensions may not be implemented by all converters and renderers.
Advanced extensions may be conflict with core parameters, in which situation,
extension features will override stable parameters.
For example, if you set

#### Extensions versioning

For simplicity, extensions don't have dedicated versions.
EXT-prefixed extensions are parts of the core schema.
