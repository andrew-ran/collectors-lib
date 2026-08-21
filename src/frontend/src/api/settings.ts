import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

export interface SiteSettings {
  site_title: string
  site_description: string
}

/** US-180 -- public read; defaults ("Collectors Lib" / the tagline) apply
 * server-side until the admin sets these for the first time. */
export function useSiteSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await apiClient.get<SiteSettings>('/settings')

      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}

/** US-180 admin form -- always sends both fields together (a partial
 * payload would validate fine server-side but null out the field left
 * out, since SiteSettingsController::update() doesn't distinguish
 * "omitted" from "clear this"). */
export function useUpdateSiteSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (settings: SiteSettings) => {
      const { data } = await apiClient.put<SiteSettings>('/settings', settings)

      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data)
    },
  })
}
