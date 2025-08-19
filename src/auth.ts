import axios, { AxiosError } from 'axios'

interface LoginCredentials {
  username: string
  password: string
}

const authProvider = {
  login: async ({ username, password }: LoginCredentials) => {
    const { data } = await axios.post('auth/login', {
      username,
      password,
    })
    localStorage.setItem('token', data.token)
  },
  checkError: (error: AxiosError) => {
    const status = error.status
    if (status === 401 || status === 403) {
      localStorage.removeItem('token')
      return Promise.reject()
    }
    // other error code (404, 500, etc): no need to log out
    return Promise.resolve()
  },
  checkAuth: () => (localStorage.getItem('token') ? Promise.resolve() : Promise.reject()),
  logout: () => {
    localStorage.removeItem('token')
    return Promise.resolve()
  },
  getPermissions: async () => 'admin',
}

export default authProvider
