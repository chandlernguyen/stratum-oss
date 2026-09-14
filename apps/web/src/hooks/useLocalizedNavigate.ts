import { useCallback } from 'react'
import { useNavigate, type NavigateOptions, type To } from 'react-router-dom'
import { useLocalizedPath } from '@/hooks/useLocalizedPath'

export function useLocalizedNavigate() {
  const navigate = useNavigate()
  const { localizePath, localizeLocation } = useLocalizedPath()

  return useCallback(
    (to: To, options?: NavigateOptions) => {
      if (typeof to === 'string') {
        navigate(localizePath(to), options)
        return
      }

      navigate(
        localizeLocation({
          pathname: to.pathname ?? '/',
          search: to.search,
          hash: to.hash,
        }),
        options
      )
    },
    [localizeLocation, localizePath, navigate]
  )
}
