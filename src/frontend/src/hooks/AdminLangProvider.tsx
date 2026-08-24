import { useState, type ReactNode } from 'react'
import {
  ADMIN_LANGS,
  ADMIN_LANG_STORAGE_KEY,
  ADMIN_STRINGS,
  AdminLangContext,
  type AdminLang,
} from './adminLang'

/** Wraps the /admin route subtree (see App.tsx). Persists the chosen
 * language to localStorage, same pattern as CurrencyProvider/useCurrency. */
export function AdminLangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AdminLang>(() => {
    const stored = window.localStorage.getItem(ADMIN_LANG_STORAGE_KEY)

    return (ADMIN_LANGS as readonly string[]).includes(stored ?? '') ? (stored as AdminLang) : 'en'
  })

  function setLang(next: AdminLang) {
    setLangState(next)
    window.localStorage.setItem(ADMIN_LANG_STORAGE_KEY, next)
  }

  return (
    <AdminLangContext.Provider value={{ lang, setLang, t: ADMIN_STRINGS[lang] }}>
      {children}
    </AdminLangContext.Provider>
  )
}
