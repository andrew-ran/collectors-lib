import { ADMIN_LANGS, ADMIN_LANG_LABELS, useAdminLang, type AdminLang } from '../../hooks/adminLang'
import { ADMIN_INPUT, ADMIN_LABEL } from './adminUi'

/** Small language-select, reused across the redesigned admin screens (list,
 * edit form). See hooks/adminLang.ts's docblock for why this exists at all. */
export function AdminLangSwitch() {
  const { lang, setLang, t } = useAdminLang()

  return (
    <div className="min-w-[140px]">
      <label className={ADMIN_LABEL}>{t.language}</label>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as AdminLang)}
        className={ADMIN_INPUT}
      >
        {ADMIN_LANGS.map((l) => (
          <option key={l} value={l}>
            {ADMIN_LANG_LABELS[l]}
          </option>
        ))}
      </select>
    </div>
  )
}
