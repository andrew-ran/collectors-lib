import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import { useAuthStore } from '../stores/authStore'
import type { Admin } from '../stores/authStore'

interface LoginCredentials {
  email: string
  password: string
}

interface LoginResponse {
  token: string
  admin: Admin
}

/** US-100 */
export function useLogin() {
  const setAuth = useAuthStore((state) => state.setAuth)

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const { data } = await apiClient.post<LoginResponse>('/auth/login', credentials)

      return data
    },
    onSuccess: (data) => {
      setAuth(data.token, data.admin)
    },
  })
}

/** US-102 -- clears local state even if the network call fails, since the
 * admin's intent to log out should win either way. */
export function useLogout() {
  const clear = useAuthStore((state) => state.clear)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/logout')
    },
    onSettled: () => {
      clear()
      queryClient.clear()
    },
  })
}

/** US-101 -- verifies an existing token is still valid on load, rather than
 * just assuming a token in localStorage means the admin is still logged in. */
export function useCurrentAdmin() {
  const token = useAuthStore((state) => state.token)

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await apiClient.get<Admin>('/auth/me')

      return data
    },
    enabled: Boolean(token),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}
