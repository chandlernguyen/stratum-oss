import { useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { getCurrentLanguage } from '@/lib/i18n'
import { DEFAULT_LOCALE, type SupportedLocale } from '@/lib/locales'
import {
  buildLocalizedLocation,
  buildLocalizedPath,
  getPathLocale,
} from '@/lib/localePath'

type LocationLike = Pick<Location, 'pathname' | 'search' | 'hash'> | {
  pathname: string
  search?: string
  hash?: string
}

export function useLocalizedPath() {
  const location = useLocation()
  const routeLocale = getPathLocale(location.pathname)
  const locale = (
    routeLocale === DEFAULT_LOCALE ? getCurrentLanguage() : routeLocale
  ) as SupportedLocale

  const localizePath = useCallback(
    (pathname: string) => buildLocalizedPath(locale, pathname),
    [locale]
  )

  const localizeLocation = useCallback(
    (nextLocation: LocationLike) => buildLocalizedLocation(locale, nextLocation),
    [locale]
  )

  return {
    locale,
    routeLocale,
    localizePath,
    localizeLocation,
  }
}
