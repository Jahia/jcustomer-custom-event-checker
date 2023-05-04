import {Command, Flags, ux} from '@oclif/core'
import * as fs from 'fs-extra'
import axios from 'axios'

export default class ValidateEvents extends Command {
  static description = 'Build a file with the unknown properties per event'

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
      description: 'JSON configuration file location',
      required: true,
    }),
    out: Flags.string({
      default: './data/error.json',
      char: 'o',
      description: 'Exported file name',
      required: true,
    }),
  }

  static args = {}

  public jcustomerConfigs: any

  public outFileLocation = ''

  private step = 1000

  private numberOfProcessedEvent = 0

  private numberOfMillisecondInADay = 1000 * 60 * 60 * 24

  async run(): Promise<void> {
    const startingDate = new Date()
    ux.action.start('Start the events analysis')
    const {flags} = await this.parse(ValidateEvents)

    this.log('Looking for configuration in file', flags.configFile)
    this.jcustomerConfigs = await fs.readJSON(flags.configFile)
    this.outFileLocation = flags.out

    const errors = await this.processEvents({})

    await this.writeErrorFile(errors)

    const endDate = new Date()
    ux.action.stop()
    this.log(`Processed ${this.numberOfProcessedEvent} events in ${endDate.getTime() - startingDate.getTime()} ms`)
  }

  async processEvents(errors: { [key: string]: Set<string> }, limit = this.step, offset = 0): Promise<any> {
    this.debug(`Start batch of ${limit} from index ${offset}`)
    const events = await this.findEvents(limit, offset)

    if (events.length > 0) {
      this.numberOfProcessedEvent += events.length
      errors = this.mergeErrors(errors, await this.validateEvents(events))

      const lastEventDate = new Date(events.pop().timeStamp)
      const currentDate = new Date()

      if ((currentDate.getTime() - lastEventDate.getTime()) / this.numberOfMillisecondInADay <= 60) {
        return this.processEvents(errors, limit, offset + this.step)
      }
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

  async findEvents(limit = 100, offset = 0): Promise<Array<any>> {
    const {source} = this.jcustomerConfigs
    const response = await axios.post(`${source.url}/cxs/events/search`, {
      sortby: 'timeStamp:desc',
      limit: limit,
      offset: offset,
      condition: {
        type: 'eventPropertyCondition',
        parameterValues: {
          comparisonOperator: 'notIn',
          propertyName: 'eventType',
          propertyValues: ['sessionCreated', 'goal', 'sessionReassigned'],
        },
      },
    }, {
      auth: {
        username: source.username,
        password: source.password,
      },
    })

    return response.data.list.map((element: any) => this.mapEvent(element))
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
