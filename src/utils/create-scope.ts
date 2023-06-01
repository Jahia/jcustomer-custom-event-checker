import axios from 'axios'

export const createScope = async (
  scope: string,
  target: {
    url: string;
    username: string;
    password: string;
  },
): Promise<any> => {
  const response: any = await axios.post(
    `${target.url}/cxs/scopes`,
    {
      itemId: scope,
      itemType: 'scope',
    },
    {
      auth: {
        username: target.username,
        password: target.password,
      },
    },
  )
  if (response.code === 200) {
    return true
  }

  return false
}
