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

// Get the list of scopes from the target system
// This is limited to jCustomer 2x
export const getScopes = async (host: JcustomerHost): Promise<string[]> => {
  const response = await axios.get(`${host.url}/cxs/scopes`, {
    auth: {
      username: host.username,
      password: host.password,
    },
  })
  const scopes: Array<string> = response.data
  .filter((s: Scope) => s.itemType === 'scope')
  .map((s: Scope) => s.itemId)

  return scopes
}

// Wait for particular scope to be present on a jCustomer 2x host
export const waitForScope = async (
  scope: string,
  host: JcustomerHost,
  timeout = 120,
): Promise<any> => {
  for (let i = 0; i < timeout; i++) {
    if ((await getScopes(host)).includes(scope)) {
      return true
    }

    await ux.wait(1000)
  }

  return false
}

// Check if a particular scope is present on a jCustomer 2x host
export const checkScope = async (
  scope: string,
  host: JcustomerHost,
): Promise<any> => {
  const scopes = await getScopes(host)
  if (scopes.includes(scope)) {
    return true
  }

  return false
}

// Return the list of scopes that are missing on the remote system
export const getMissingScopes = async (
  scopes: Array<string>,
  host: JcustomerHost,
): Promise<any> => {
  const missingScopes: Array<string> = []
  const targetScopes = await getScopes(host)
  for (const s of scopes) {
    if (!targetScopes.includes(s)) {
      missingScopes.push(s)
    }
  }

  return missingScopes
}

export const createScope = async (
  scope: string,
  host: JcustomerHost,
): Promise<boolean> => {
  const response: any = await axios.post(
    `${host.url}/cxs/scopes`,
    {
      itemId: scope,
      itemType: 'scope',
    },
    {
      auth: {
        username: host.username,
        password: host.password,
      },
    },
  )
  if (response.code === 200) {
    return true
  }

  return false
}
