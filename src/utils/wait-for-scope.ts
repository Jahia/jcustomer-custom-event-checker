/* eslint-disable no-await-in-loop */
import axios from 'axios'
import {ux} from '@oclif/core'

interface JcustomerHost {
  url: string;
  username: string;
  password: string;
}

interface Scope {
  itemId: string;
  itemType: string;
}

export const waitForScope = async (
  scope: string,
  target: JcustomerHost,
  timeout = 120,
): Promise<any> => {
  for (let i = 0; i < timeout; i++) {
    const response = await axios.get(`${target.url}/cxs/scopes`, {
      auth: {
        username: target.username,
        password: target.password,
      },
    })
    const scopes = response.data
    .filter((s: Scope) => s.itemType === 'scope')
    .map((s: Scope) => s.itemId)
    if (scopes.includes(scope)) {
      return true
    }

    await ux.wait(1000)
  }

  return false
}
