import {Command, Flags, ux} from '@oclif/core'
// eslint-disable-next-line node/no-extraneous-import
import * as fs from 'fs-extra'
import axios from 'axios'

export default class ValidateEvents extends Command {
  static description = `This script will get the events from a jCustomer instance and will validate them on another one.
  The structure of the configuration file can be found in the defaultConfig.json file at the root of this project`

  static examples = [
    `$ custom-event-checker validateEvents --configFile=./path/to/your/config/config.json --out=./out.json
  Start the events analysis
  Looking for configuration in file ./path/to/your/config/config.json
  Processed 315 events in 1546 ms
`,
  ]

  static flags = {
    configFile: Flags.string({
      default: './defaultConfig.json',
      char: 'f',
      description: 'jCustomer JSON configuration file location',
      required: true,
    }),
    out: Flags.string({
      default: './errors.json',
      char: 'o',
      description: 'Exported file path',
      required: true,
    }),
    step: Flags.string({
      default: '1000',
      char: 's',
      description: 'Number of events to process per batch',
      required: true,
    }),
    limitOfDays: Flags.string({
      default: '60',
      char: 'd',
      description: 'Exclude events older than this flag in days',
      required: true,
    }),
  }

  static args = {}

  public jcustomerConfigs: any

  public outFileLocation = ''

  public step = 1000

  public limitOfDays = 60

  private numberOfProcessedEvent = 0

  async run(): Promise<void> {
    const startingDate = new Date()
    ux.action.start('Start the events analysis')
    const {flags} = await this.parse(ValidateEvents)

    this.log('Looking for configuration in file', flags.configFile)
    this.jcustomerConfigs = await fs.readJSON(flags.configFile)
    this.outFileLocation = flags.out
    this.step = Number.parseInt(flags.step, 10)
    this.limitOfDays = Number.parseInt(flags.limitOfDays, 10)

    const errors = await this.processEvents({})

    await this.writeErrorFile(errors)

    const endDate = new Date()
    ux.action.stop()
    this.log(`Processed ${this.numberOfProcessedEvent} events in ${endDate.getTime() - startingDate.getTime()} ms`)
  }

  async processEvents(errors: { [key: string]: Set<string> }, offset = 0): Promise<any> {
    this.debug(`Start batch of ${this.step} from index ${offset}`)
    const events = await this.findEvents(offset)

    if (events.length > 0) {
      this.numberOfProcessedEvent += events.length
      errors = this.mergeErrors(errors, await this.validateEvents(events))

      return this.processEvents(errors, offset + this.step)
    }

    return errors
  }

  mergeErrors(baseErrors: { [key: string]: Set<string> }, errorToMerge: { [key: string]: Set<string> }): any {
    if (!baseErrors || Object.keys(baseErrors).length === 0) {
      return errorToMerge
    }

    for (const [key, values] of Object.entries(errorToMerge)) {
      if (baseErrors[key]) {
        for (const value of values) {
          baseErrors[key].add(value)
        }
      } else {
        baseErrors[key] = values
      }
    }

    return baseErrors
  }

  async findEvents(offset = 0): Promise<Array<any>> {
    const {source} = this.jcustomerConfigs
    const response = await axios.post(`${source.url}/cxs/events/search`, {
      sortby: 'timeStamp:desc',
      limit: this.step,
      offset: offset,
      condition: {
        type: 'booleanCondition',
        parameterValues: {
          operator: 'and',
          subConditions: [{
            type: 'eventPropertyCondition',
            parameterValues: {
              comparisonOperator: 'notIn',
              propertyName: 'eventType',
              propertyValues: ['sessionCreated', 'goal', 'sessionReassigned'],
            },
          }, {
            type: 'eventPropertyCondition',
            parameterValues: {
              comparisonOperator: 'greaterThan',
              propertyName: 'timeStamp',
              propertyValueDateExpr: `now-${this.limitOfDays}d`,
            },
          }],
        },
      },
    }, {
      auth: {
        username: source.username,
        password: source.password,
      },
    })
    return response.data ? response.data.list.map((element: any) => this.mapEvent(element)) : []
  }

  mapEvent(event: any): any {
    switch (event?.eventType) {
    case 'login':
      return this.mapLoginEvent(event)
    case 'view':
      return this.mapViewEvent(event)
    case 'form':
      return this.mapFormEvent(event)
    default:
      return event
    }
  }

  mapLoginEvent(loginEvent: any): any {
    /* Look for empty scope */
    if (loginEvent.scope) {
      loginEvent.scope = 'systemsite'
      if (loginEvent.source) {
        loginEvent.source.scope = 'systemsite'
      }

      if (loginEvent.target) {
        loginEvent.target.scope = 'systemsite'
      }
    }

    return loginEvent
  }

  mapViewEvent(viewEvent: any): any {
    if (viewEvent?.target?.properties?.interests) {
      if (!viewEvent.flattenedProperties) {
        viewEvent.flattenedProperties = {}
      }

      viewEvent.flattenedProperties.interests = viewEvent.target.properties.interests
      delete viewEvent.target.properties.interests
    }

    /* Check for URL parameters */
    if (viewEvent?.target?.properties?.pageInfo?.parameters) {
      if (!viewEvent.flattenedProperties) {
        viewEvent.flattenedProperties = {}
      }

      viewEvent.flattenedProperties.URLParameters = viewEvent.target.properties.pageInfo.parameters
      delete viewEvent.target.properties.pageInfo.parameters
    }

    return viewEvent
  }

  mapFormEvent(formEvent: any): any {
    if (formEvent.properties) {
      if (!formEvent.flattenedProperties) {
        formEvent.flattenedProperties = {}
      }

      formEvent.flattenedProperties.fields = formEvent.properties
      formEvent.properties = {}
    }

    return formEvent
  }

  async validateEvents(events: Array<any>): Promise<{ [key: string]: Set<string> }> {
    const {target} = this.jcustomerConfigs

    const response = await axios.post(`${target.url}/cxs/jsonSchema/validateEvents`, events, {
      auth: {
        username: target.username,
        password: target.password,
      },
    })
    return Object.fromEntries(Object.entries<Array<{ error: string }>>(response.data).map(([key, errors]) => {
      return [key, new Set(errors.map(error => JSON.stringify(error)))]
    }))
  }

  async writeErrorFile(data: any): Promise<void> {
    await fs.writeFile(this.outFileLocation, JSON.stringify(data, (_key, value) => {
      return (value instanceof Set ? [...value].map(v => JSON.parse(v)) : value)
    }, 4), (err: any) => {
      if (err) {
        this.error(err)
      }
    })
  }
}
