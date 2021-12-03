This is the core interface of General Scene Interface.

This interface is written in Typescript but extra strict static types
to make sure it can be translated into C-style structs word-by-word.

Any typescript or javascript specific feature is not allowed in this package.

A loose version is provided to make your life easier
but keep in mind ALL processors (expect refiners) and backends
only guarantee to accept strict version of schema.
