import axios from 'axios'

const filterData = (scopes: Array<string>) => {
  return scopes.filter((s: string) => {
    if (s === '') return false
    if (s === '_missing') return false
    if (s === '_filtered') return false
    return true
  })
}

export const getSourceScopes = async (
  host: {
    url: string;
    username: string;
    password: string;
  },
  // limitOfDays: number,
): Promise<any> => {
  let scopes: Array<string> = []
  const response: any = await axios.get(`${host.url}/cxs/query/event/scope`, {
    auth: {
      username: host.username,
      password: host.password,
    },
  })
  if (response.data !== undefined && Object.keys(response.data).length > 0) {
    scopes = [...scopes, ...filterData(Object.keys(response.data))]
  }

  return scopes
}
