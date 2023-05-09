custom-event-checker
=================

jCustomer events checker CLI

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![License](https://img.shields.io/npm/l/oclif-hello-world.svg)](https://github.com/oclif/hello-world/blob/main/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g custom-event-checker
$ custom-event-checker COMMAND
running command...
$ custom-event-checker (--version)
custom-event-checker/0.1.0 darwin-x64 node-v19.4.0
$ custom-event-checker --help [COMMAND]
USAGE
  $ custom-event-checker COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`custom-event-checker help [COMMANDS]`](#custom-event-checker-help-commands)
* [`custom-event-checker validateEvents`](#custom-event-checker-validateevents)

## `custom-event-checker help [COMMANDS]`

Display help for custom-event-checker.

```
USAGE
  $ custom-event-checker help [COMMANDS] [-n]

ARGUMENTS
  COMMANDS  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for custom-event-checker.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.2.9/src/commands/help.ts)_

## `custom-event-checker validateEvents`

Build a file with the unknown properties per event

```
USAGE
  $ custom-event-checker validateEvents -f <value> -o <value> -s <value> -d <value>

FLAGS
  -d, --limitOfDays=<value>  (required) [default: 60] Exclude events older than this flag in days
  -f, --configFile=<value>   (required) [default: ./defaultConfig.json] JSON configuration file location
  -o, --out=<value>          (required) [default: ./errors.json] Exported file path
  -s, --step=<value>         (required) [default: 1000] Number of events to process per batch

DESCRIPTION
  Build a file with the unknown properties per event

EXAMPLES
  $ custom-event-checker validateEvents --configFile=./path/to/your/config/config.json --out=./out.json
    Start the events analysis
    Looking for configuration in file ./path/to/your/config/config.json
    Processed 315 events in 1546 ms
```

_See code: [dist/commands/validateEvents/index.ts](https://github.com/jsinovassin/custom-event-checker/blob/v0.1.0/dist/commands/validateEvents/index.ts)_
<!-- commandsstop -->
