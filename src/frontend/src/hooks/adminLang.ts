import { createContext, useContext } from 'react'

/**
 * Admin UI localization -- added as part of the 2026-08 admin redesign
 * (see docs/design/CLAUDE_DESIGN_BRIEF.md and the Claude Design handoff
 * this shipped from). Not part of the original REQUIREMENTS.md scope: the
 * design prototype included a language switcher and Андрей chose to take it
 * into scope alongside the redesign rather than deferring it (2026-08-24).
 * Scoped to the admin screens only (AdminItemsPage, AdminEditItemPage,
 * WishlistAdminPanel) -- the public SPA has no localization and this
 * doesn't add any.
 *
 * Deliberately a small hand-rolled dictionary/context, not a full i18n
 * library (react-i18next etc.) -- four flat locales, no pluralization
 * rules, no interpolation beyond simple template substitution, single admin
 * user. Pulling in a library for this would be more ceremony than the
 * problem needs.
 */
export const ADMIN_LANGS = ['en', 'ru', 'uk', 'be'] as const
export type AdminLang = (typeof ADMIN_LANGS)[number]

export const ADMIN_LANG_LABELS: Record<AdminLang, string> = {
  en: 'English',
  ru: 'Русский',
  uk: 'Українська',
  be: 'Беларуская',
}

export const ADMIN_LANG_STORAGE_KEY = 'collectors-lib:admin-lang'

export interface AdminStrings {
  language: string
  // List / dashboard
  listTitle: string
  listSubtitle: string
  displayCurrency: string
  search: string
  searchPlaceholder: string
  platform: string
  all: string
  genre: string
  collection: string
  franchise: string
  colItem: string
  colType: string
  colPlatform: string
  colCollection: string
  colStatus: string
  colPrice: string
  edit: string
  noItems: string
  loading: string
  myCollection: string
  wishlist: string
  game: string
  book: string
  console: string
  peripheral: string
  // Edit form
  backToList: string
  coverPhoto: string
  uploadPhoto: string
  uploadHint: string
  title: string
  description: string
  entryType: string
  gameData: string
  genres: string
  addGenrePlaceholder: string
  franchiseLabel: string
  developer: string
  bookData: string
  author: string
  publicationYear: string
  publisher: string
  acquisitionDate: string
  unknown: string
  exactDay: string
  monthYear: string
  yearOnly: string
  purchasePrice: string
  notes: string
  scrapeStatus: string
  refreshMetadata: string
  save: string
  saving: string
  delete: string
  saved: string
  saveFailed: string
  // Wishlist fields
  wishlistSection: string
  conditionPreference: string
  noPreference: string
  newOnly: string
  usedOk: string
  cartridgeOnly: string
  desireScore: string
  editionNote: string
  priceEstimateNew: string
  priceEstimateUsed: string
  saveWishlistDetails: string
  // Mark as received
  markAsReceived: string
  markAsReceivedBody: string
  openReceivedForm: string
  gift: string
  selfPurchase: string
  gifter: string
  pick: string
  oneoff: string
  newGifter: string
  noGifterSet: string
  gifterNameOptional: string
  addGifter: string
  adding: string
  cancel: string
  name: string
  avatarOptional: string
  thankYouNote: string
  pricePaid: string
  receivedDate: string
  acquisitionNotesPlaceholder: string
  moveToCollection: string
  selectCollection: string
  confirmMarkReceived: string
}

const en: AdminStrings = {
  language: 'Language',
  listTitle: 'Items',
  listSubtitle: 'Everything in My Collection and the Wishlist',
  displayCurrency: 'Display currency',
  search: 'Search',
  searchPlaceholder: 'Title...',
  platform: 'Platform',
  all: 'All',
  genre: 'Genre',
  collection: 'Collection',
  franchise: 'Franchise',
  colItem: 'Item',
  colType: 'Type',
  colPlatform: 'Platform',
  colCollection: 'Collection',
  colStatus: 'Status',
  colPrice: 'Price',
  edit: 'Edit',
  noItems: 'No items match.',
  loading: 'Loading...',
  myCollection: 'My collection',
  wishlist: 'Wishlist',
  game: 'Game',
  book: 'Book',
  console: 'Console',
  peripheral: 'Peripheral',
  backToList: 'Back to list',
  coverPhoto: 'Cover / photo',
  uploadPhoto: 'Upload photo',
  uploadHint: "IGDB cover + collector's own photos",
  title: 'Title',
  description: 'Description',
  entryType: 'Entry type',
  gameData: 'Game data',
  genres: 'Genres',
  addGenrePlaceholder: 'Type a genre, Enter to add',
  franchiseLabel: 'Franchise',
  developer: 'Developer',
  bookData: 'Book data',
  author: 'Author',
  publicationYear: 'Publication year',
  publisher: 'Publisher',
  acquisitionDate: 'Acquisition date',
  unknown: 'Unknown',
  exactDay: 'Exact day',
  monthYear: 'Month + year',
  yearOnly: 'Year only',
  purchasePrice: 'Purchase price',
  notes: 'Notes',
  scrapeStatus: 'Scrape status',
  refreshMetadata: 'Refresh metadata',
  save: 'Save',
  saving: 'Saving...',
  delete: 'Delete',
  saved: 'Saved.',
  saveFailed: 'Failed to save -- try again.',
  wishlistSection: 'Wishlist',
  conditionPreference: 'Condition preference',
  noPreference: 'No preference',
  newOnly: 'New only',
  usedOk: 'Used — ok',
  cartridgeOnly: 'Cartridge only',
  desireScore: 'Desirability',
  editionNote: 'Edition note',
  priceEstimateNew: 'Est. price, new',
  priceEstimateUsed: 'Est. price, used',
  saveWishlistDetails: 'Save wishlist details',
  markAsReceived: 'Mark as received',
  markAsReceivedBody: 'Item was gifted or bought — move it from the wishlist into the collection.',
  openReceivedForm: 'Open received form',
  gift: 'Gift',
  selfPurchase: 'Self purchase',
  gifter: 'Gifter',
  pick: 'Pick',
  oneoff: 'One-off',
  newGifter: 'New',
  noGifterSet: 'No gifter set',
  gifterNameOptional: 'Gifter name (optional)',
  addGifter: 'Add gifter',
  adding: 'Adding...',
  cancel: 'Cancel',
  name: 'Name',
  avatarOptional: 'Avatar (optional)',
  thankYouNote: 'Thank-you note',
  pricePaid: 'Price paid',
  receivedDate: 'Date received',
  acquisitionNotesPlaceholder: 'Where it was bought, circumstances, notes',
  moveToCollection: 'Move to collection',
  selectCollection: 'Select a collection...',
  confirmMarkReceived: 'Mark as received',
}

const ru: AdminStrings = {
  language: 'Язык',
  listTitle: 'Товары',
  listSubtitle: 'Всё в «Моей коллекции» и «Вишлисте»',
  displayCurrency: 'Валюта отображения',
  search: 'Поиск',
  searchPlaceholder: 'Название...',
  platform: 'Платформа',
  all: 'Все',
  genre: 'Жанр',
  collection: 'Коллекция',
  franchise: 'Франшиза',
  colItem: 'Товар',
  colType: 'Тип',
  colPlatform: 'Платформа',
  colCollection: 'Коллекция',
  colStatus: 'Статус',
  colPrice: 'Цена',
  edit: 'Изменить',
  noItems: 'Ничего не найдено.',
  loading: 'Загрузка...',
  myCollection: 'Моя коллекция',
  wishlist: 'Вишлист',
  game: 'Игра',
  book: 'Книга',
  console: 'Консоль',
  peripheral: 'Периферия',
  backToList: 'Назад к списку',
  coverPhoto: 'Обложка / фото',
  uploadPhoto: 'Загрузить фото',
  uploadHint: 'Обложка IGDB + собственные фото коллекционера',
  title: 'Название',
  description: 'Описание',
  entryType: 'Тип записи',
  gameData: 'Игровые данные',
  genres: 'Жанры',
  addGenrePlaceholder: 'Ввести жанр, Enter — добавить',
  franchiseLabel: 'Франшиза',
  developer: 'Разработчик',
  bookData: 'Данные книги',
  author: 'Автор',
  publicationYear: 'Год издания',
  publisher: 'Издатель',
  acquisitionDate: 'Дата приобретения',
  unknown: 'Неизвестно',
  exactDay: 'Точный день',
  monthYear: 'Месяц + год',
  yearOnly: 'Только год',
  purchasePrice: 'Цена покупки',
  notes: 'Заметки',
  scrapeStatus: 'Статус скрейпа',
  refreshMetadata: 'Обновить метаданные',
  save: 'Сохранить',
  saving: 'Сохранение...',
  delete: 'Удалить',
  saved: 'Сохранено.',
  saveFailed: 'Не удалось сохранить — попробуйте ещё раз.',
  wishlistSection: 'Вишлист',
  conditionPreference: 'Предпочтение по состоянию',
  noPreference: 'Без предпочтений',
  newOnly: 'Только новое',
  usedOk: 'Б/у — ок',
  cartridgeOnly: 'Только картридж',
  desireScore: 'Желаемость',
  editionNote: 'Заметка об издании',
  priceEstimateNew: 'Оценка цены, новое',
  priceEstimateUsed: 'Оценка цены, б/у',
  saveWishlistDetails: 'Сохранить детали вишлиста',
  markAsReceived: 'Отметить как полученное',
  markAsReceivedBody:
    'Товар получен в подарок или куплен самостоятельно — перенести из вишлиста в коллекцию.',
  openReceivedForm: 'Открыть форму получения',
  gift: 'Подарок',
  selfPurchase: 'Личная покупка',
  gifter: 'Даритель',
  pick: 'Выбрать',
  oneoff: 'Разово',
  newGifter: 'Новый',
  noGifterSet: 'Даритель не указан',
  gifterNameOptional: 'Имя дарителя (необязательно)',
  addGifter: 'Добавить дарителя',
  adding: 'Добавление...',
  cancel: 'Отмена',
  name: 'Имя',
  avatarOptional: 'Аватар (необязательно)',
  thankYouNote: 'Благодарность (заметка)',
  pricePaid: 'Уплаченная цена',
  receivedDate: 'Дата получения',
  acquisitionNotesPlaceholder: 'Где куплено, обстоятельства, заметки',
  moveToCollection: 'Перенести в коллекцию',
  selectCollection: 'Выберите коллекцию...',
  confirmMarkReceived: 'Отметить как полученное',
}

const uk: AdminStrings = {
  language: 'Мова',
  listTitle: 'Товари',
  listSubtitle: 'Усе в «Моїй колекції» та «Вішлисті»',
  displayCurrency: 'Валюта відображення',
  search: 'Пошук',
  searchPlaceholder: 'Назва...',
  platform: 'Платформа',
  all: 'Усі',
  genre: 'Жанр',
  collection: 'Колекція',
  franchise: 'Франшиза',
  colItem: 'Товар',
  colType: 'Тип',
  colPlatform: 'Платформа',
  colCollection: 'Колекція',
  colStatus: 'Статус',
  colPrice: 'Ціна',
  edit: 'Змінити',
  noItems: 'Нічого не знайдено.',
  loading: 'Завантаження...',
  myCollection: 'Моя колекція',
  wishlist: 'Вішлист',
  game: 'Гра',
  book: 'Книга',
  console: 'Консоль',
  peripheral: 'Периферія',
  backToList: 'Назад до списку',
  coverPhoto: 'Обкладинка / фото',
  uploadPhoto: 'Завантажити фото',
  uploadHint: 'Обкладинка IGDB + власні фото колекціонера',
  title: 'Назва',
  description: 'Опис',
  entryType: 'Тип запису',
  gameData: 'Ігрові дані',
  genres: 'Жанри',
  addGenrePlaceholder: 'Ввести жанр, Enter — додати',
  franchiseLabel: 'Франшиза',
  developer: 'Розробник',
  bookData: 'Дані книги',
  author: 'Автор',
  publicationYear: 'Рік видання',
  publisher: 'Видавець',
  acquisitionDate: 'Дата придбання',
  unknown: 'Невідомо',
  exactDay: 'Точний день',
  monthYear: 'Місяць + рік',
  yearOnly: 'Лише рік',
  purchasePrice: 'Ціна купівлі',
  notes: 'Нотатки',
  scrapeStatus: 'Статус скрейпу',
  refreshMetadata: 'Оновити метадані',
  save: 'Зберегти',
  saving: 'Збереження...',
  delete: 'Видалити',
  saved: 'Збережено.',
  saveFailed: 'Не вдалося зберегти — спробуйте ще раз.',
  wishlistSection: 'Вішлист',
  conditionPreference: 'Перевага щодо стану',
  noPreference: 'Без переваг',
  newOnly: 'Тільки нове',
  usedOk: 'Б/в — ок',
  cartridgeOnly: 'Лише картридж',
  desireScore: 'Бажаність',
  editionNote: 'Нотатка про видання',
  priceEstimateNew: 'Оцінка ціни, нове',
  priceEstimateUsed: 'Оцінка ціни, б/в',
  saveWishlistDetails: 'Зберегти деталі вішлиста',
  markAsReceived: 'Позначити як отримане',
  markAsReceivedBody:
    'Товар отримано в подарунок або куплено самостійно — перенести з вішлиста в колекцію.',
  openReceivedForm: 'Відкрити форму отримання',
  gift: 'Подарунок',
  selfPurchase: 'Особиста покупка',
  gifter: 'Дарувальник',
  pick: 'Обрати',
  oneoff: 'Разово',
  newGifter: 'Новий',
  noGifterSet: 'Дарувальника не вказано',
  gifterNameOptional: "Ім'я дарувальника (необов'язково)",
  addGifter: 'Додати дарувальника',
  adding: 'Додавання...',
  cancel: 'Скасувати',
  name: "Ім'я",
  avatarOptional: "Аватар (необов'язково)",
  thankYouNote: 'Подяка (нотатка)',
  pricePaid: 'Сплачена ціна',
  receivedDate: 'Дата отримання',
  acquisitionNotesPlaceholder: 'Де куплено, обставини, нотатки',
  moveToCollection: 'Перенести в колекцію',
  selectCollection: 'Оберіть колекцію...',
  confirmMarkReceived: 'Позначити як отримане',
}

const be: AdminStrings = {
  language: 'Мова',
  listTitle: 'Тавары',
  listSubtitle: 'Усё ў «Маёй калекцыі» і «Вішлісце»',
  displayCurrency: 'Валюта адлюстравання',
  search: 'Пошук',
  searchPlaceholder: 'Назва...',
  platform: 'Платформа',
  all: 'Усе',
  genre: 'Жанр',
  collection: 'Калекцыя',
  franchise: 'Франшыза',
  colItem: 'Тавар',
  colType: 'Тып',
  colPlatform: 'Платформа',
  colCollection: 'Калекцыя',
  colStatus: 'Статус',
  colPrice: 'Цана',
  edit: 'Змяніць',
  noItems: 'Нічога не знойдзена.',
  loading: 'Загрузка...',
  myCollection: 'Мая калекцыя',
  wishlist: 'Вішліст',
  game: 'Гульня',
  book: 'Кніга',
  console: 'Кансоль',
  peripheral: 'Перыферыя',
  backToList: 'Назад да спісу',
  coverPhoto: 'Вокладка / фота',
  uploadPhoto: 'Загрузіць фота',
  uploadHint: 'Вокладка IGDB + уласныя фота калекцыянера',
  title: 'Назва',
  description: 'Апісанне',
  entryType: 'Тып запісу',
  gameData: 'Гульнявыя дадзеныя',
  genres: 'Жанры',
  addGenrePlaceholder: 'Увесці жанр, Enter — дадаць',
  franchiseLabel: 'Франшыза',
  developer: 'Распрацоўшчык',
  bookData: 'Дадзеныя кнігі',
  author: 'Аўтар',
  publicationYear: 'Год выдання',
  publisher: 'Выдавец',
  acquisitionDate: 'Дата набыцця',
  unknown: 'Невядома',
  exactDay: 'Дакладны дзень',
  monthYear: 'Месяц + год',
  yearOnly: 'Толькі год',
  purchasePrice: 'Цана куплі',
  notes: 'Нататкі',
  scrapeStatus: 'Статус скрэйпу',
  refreshMetadata: 'Абнавіць метаданыя',
  save: 'Захаваць',
  saving: 'Захаванне...',
  delete: 'Выдаліць',
  saved: 'Захавана.',
  saveFailed: 'Не ўдалося захаваць — паспрабуйце яшчэ раз.',
  wishlistSection: 'Вішліст',
  conditionPreference: 'Перавага па стане',
  noPreference: 'Без пераваг',
  newOnly: 'Толькі новае',
  usedOk: 'Б/у — добра',
  cartridgeOnly: 'Толькі картрыдж',
  desireScore: 'Пажаданасць',
  editionNote: 'Нататка пра выданне',
  priceEstimateNew: 'Ацэнка цаны, новае',
  priceEstimateUsed: 'Ацэнка цаны, б/у',
  saveWishlistDetails: 'Захаваць дэталі вішліста',
  markAsReceived: 'Пазначыць як атрыманае',
  markAsReceivedBody:
    'Тавар атрыманы ў падарунак або куплены самастойна — перанесці з вішліста ў калекцыю.',
  openReceivedForm: 'Адкрыць форму атрымання',
  gift: 'Падарунак',
  selfPurchase: 'Асабістая пакупка',
  gifter: 'Дарыльнік',
  pick: 'Выбраць',
  oneoff: 'Разова',
  newGifter: 'Новы',
  noGifterSet: 'Дарыльнік не пазначаны',
  gifterNameOptional: 'Імя дарыльніка (неабавязкова)',
  addGifter: 'Дадаць дарыльніка',
  adding: 'Даданне...',
  cancel: 'Адмена',
  name: 'Імя',
  avatarOptional: 'Аватар (неабавязкова)',
  thankYouNote: 'Падзяка (нататка)',
  pricePaid: 'Заплачаная цана',
  receivedDate: 'Дата атрымання',
  acquisitionNotesPlaceholder: 'Дзе куплена, акалічнасці, нататкі',
  moveToCollection: 'Перанесці ў калекцыю',
  selectCollection: 'Абярыце калекцыю...',
  confirmMarkReceived: 'Пазначыць як атрыманае',
}

export const ADMIN_STRINGS: Record<AdminLang, AdminStrings> = { en, ru, uk, be }

export interface AdminLangContextValue {
  lang: AdminLang
  setLang: (lang: AdminLang) => void
  t: AdminStrings
}

// Defined in this plain hook/constants module, not the .tsx provider file --
// react-refresh/only-export-components requires component-exporting files
// to *only* export components (same split as hooks/currency.ts vs
// hooks/CurrencyProvider.tsx).
export const AdminLangContext = createContext<AdminLangContextValue | null>(null)

export function useAdminLang(): AdminLangContextValue {
  const ctx = useContext(AdminLangContext)

  if (!ctx) {
    throw new Error('useAdminLang() must be used within an AdminLangProvider')
  }

  return ctx
}
