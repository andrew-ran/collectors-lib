import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

// Relative baseURL on purpose -- nginx proxies /api to the Laravel backend
// under the same origin as the SPA, see docker/nginx.conf.
export const apiClient = axios.create({
  baseURL: '/api',
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Token expired/revoked server-side -- drop the stale local session so
    // ProtectedRoute redirects to the login page instead of looping on 401s.
    if (error.response?.status === 401) {
      useAuthStore.getState().clear()
    }

    return Promise.reject(error)
  },
)
