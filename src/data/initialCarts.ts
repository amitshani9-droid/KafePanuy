import type { CoffeeCart, CrowdStatus, DataSource, FilterTag, Region } from '../types/cart'

const minutesAgo = (min: number) => new Date(Date.now() - min * 60_000).toISOString()

interface SeedInput {
  id: string
  name: string
  aliases?: string[]
  area: string
  region: Region
  lat: number
  lng: number
  description: string
  status: CrowdStatus
  waitMinutes: number
  rating: number
  reviewCount: number
  tags: FilterTag[]
  specialties: string[]
  fieldTags: string[]
  openingHours?: string
  dataSource?: DataSource
  updatedMinAgo?: number
}

const DEFAULT_HOURS = 'א׳–ו׳ 07:00–14:00 · ש׳ 07:00–15:00'

function seed(s: SeedInput): CoffeeCart {
  return {
    id: s.id,
    name: s.name,
    aliases: s.aliases,
    area: s.area,
    region: s.region,
    source: 'curated',
    description: s.description,
    coordinates: { lat: s.lat, lng: s.lng },
    openingHours: s.openingHours ?? DEFAULT_HOURS,
    rating: s.rating,
    reviewCount: s.reviewCount,
    status: s.status,
    waitMinutes: s.waitMinutes,
    specialties: s.specialties,
    tags: s.tags,
    lastUpdated: minutesAgo(s.updatedMinAgo ?? 6),
    dataSource: s.dataSource ?? 'live',
    fieldTags: s.fieldTags,
  }
}

/**
 * Curated seed — well-known carts & nature cafés across Israel.
 * Coordinates were checked to be within ~2 km of their settlement (OSM/Nominatim, 2026-10-17).
 * Ratings, hours, menus and crowd levels are demo values, not live data.
 */
export const initialCarts: CoffeeCart[] = [
  // ---------- 🌿 Emek Hefer & Sharon ----------
  seed({
    id: 'agalakafe-alexander', name: 'עגלקפה', area: 'נחל אלכסנדר, מעברות', region: 'sharon', lat: 32.3712, lng: 34.8924,
    description: 'צמודה לשביל נחל אלכסנדר — עצירת חובה לרוכבי אופניים ולמשפחות. בשבת בבוקר זה כבר מוסד.',
    status: 'busy', waitMinutes: 28, rating: 4.8, reviewCount: 640,
    tags: ['cyclist', 'kids', 'dogs'], specialties: ['פלאט וייט', 'קרואסון חמאה', 'לימונענע קפוא'],
    fieldTags: ['התור עד השביל 😅', 'החניה מלאה 🚫🚗'], updatedMinAgo: 3,
  }),
  seed({
    id: 'kafe-bagiva', name: 'קפה בגבעה', area: 'גבעת חיים איחוד', region: 'sharon', lat: 32.3934, lng: 34.9312,
    description: 'מדשאות רחבות וצל של עצים ותיקים. הכלבים מתרוצצים, הרוכבים נחים, והקפה טוב.',
    status: 'busy', waitMinutes: 20, rating: 4.7, reviewCount: 410,
    tags: ['shaded', 'dogs', 'cyclist', 'kids'], specialties: ['קפוצ׳ינו', 'עוגת שמרים', 'שקשוקה בלחמנייה'],
    fieldTags: ['יש מקום בצל 🌳', 'נשארו מאפים חמים 🥐'],
  }),
  seed({
    id: 'ruchale-kfar-vitkin', name: 'רוחלה', aliases: ['Ruchale'], area: 'כפר ויתקין', region: 'sharon', lat: 32.3821, lng: 34.8785,
    description: 'מאפים מלוחים ומתוקים שיוצאים מהתנור כל הבוקר, בחורשה נעימה ובאווירה קהילתית.',
    status: 'moderate', waitMinutes: 12, rating: 4.8, reviewCount: 520,
    tags: ['kids', 'shaded'], specialties: ['בורקס גבינה', 'רוגלך שוקולד', 'קפה שחור'],
    fieldTags: ['נשארו מאפים חמים 🥐'],
  }),
  seed({
    id: 'kafe-bahorsha-bahan', name: 'קפה בחורשה', area: 'קיבוץ בחן', region: 'sharon', lat: 32.352, lng: 35.0185,
    description: 'חורשת אורנים מוצלת ושקטה יחסית. מקום מושלם למשפחות שרוצות לפרוש שמיכה ולנשום.',
    status: 'calm', waitMinutes: 3, rating: 4.6, reviewCount: 180,
    tags: ['shaded', 'kids', 'dogs'], specialties: ['לאטה', 'שוקו קר', 'עוגת גבינה'],
    fieldTags: ['יש חניה בשפע 🚗', 'הערסלים פנויים 🌿'], updatedMinAgo: 9,
  }),
  seed({
    id: 'thomas-mishmar-hasharon', name: 'תומס קפה', aliases: ['Thomas'], area: 'משמר השרון', region: 'sharon', lat: 32.3615, lng: 34.912,
    description: 'כריכים מושקעים וקפה ספשלטי, נגיש מאוד מכביש 4. עצירה מעולה בדרך צפונה.',
    status: 'moderate', waitMinutes: 10, rating: 4.7, reviewCount: 300,
    tags: ['cyclist', 'vegan'], specialties: ['קורטדו', 'כריך חביתה', 'כריך טבעוני עם חציל'],
    fieldTags: ['התור זז מהר ⚡'],
  }),
  seed({
    id: 'pirurei-or-hogla', name: 'פירורי אור', area: 'חוגלה', region: 'sharon', lat: 32.388, lng: 34.941,
    description: 'אווירה כפרית ועוגות שמרים ומאפים בעבודת יד. שקט, ריחני, ובלי לחץ.',
    status: 'calm', waitMinutes: 4, rating: 4.6, reviewCount: 140,
    tags: ['kids', 'shaded'], specialties: ['עוגת שמרים', 'מאפה תפוחים', 'הפוך'],
    fieldTags: ['נשארו מאפים חמים 🥐'], dataSource: 'estimate', updatedMinAgo: 12,
  }),
  seed({
    id: 'butka-hofit', name: 'בוטקה קפה', area: 'חופית', region: 'sharon', lat: 32.3845, lng: 34.871,
    description: 'מרחק הליכה קצר מהים, באווירה שקטה בין העצים. קפה אחרי שחייה של בוקר.',
    status: 'calm', waitMinutes: 2, rating: 4.5, reviewCount: 120,
    tags: ['dogs', 'shaded', 'vegan'], specialties: ['אייס אמריקנו', 'שייק פירות', 'טוסט'],
    fieldTags: ['יש חניה בשפע 🚗'], updatedMinAgo: 8,
  }),
  seed({
    id: 'alma-avihayil', name: 'קפה עלמה', area: 'אביחיל', region: 'sharon', lat: 32.351, lng: 34.868,
    description: 'חצר ירוקה ופוקאצ׳ות חמות, קרוב לנתניה אבל מרגיש כמו כפר.',
    status: 'calm', waitMinutes: 5, rating: 4.6, reviewCount: 160,
    tags: ['kids', 'vegan', 'shaded'], specialties: ['פוקאצ׳ה זעתר', 'צ׳אי לאטה', 'עוגת גזר'],
    fieldTags: ['יש מקום ישיבה בצל 🌳'],
  }),
  seed({
    id: 'teo-batzra', name: 'קפה תאו', aliases: ['Teo', 'Café Teo'], area: 'בצרה', region: 'sharon', lat: 32.2155, lng: 34.876,
    description: 'בלב השרון, עם מאפים מעולים. בשישי בבוקר כולם פה — שווה להגיע מוקדם.',
    status: 'busy', waitMinutes: 25, rating: 4.8, reviewCount: 470,
    tags: ['kids', 'dogs'], specialties: ['קרואסון פיסטוק', 'פלאט וייט', 'מאפה שמרים'],
    fieldTags: ['התור זז לאט 🐢', 'החניה מלאה 🚫🚗'], updatedMinAgo: 4,
  }),
  seed({
    id: 'artura-ruppin', name: 'קפה ארטורה', aliases: ['Artura'], area: 'מדרשת רופין', region: 'sharon', lat: 32.345, lng: 34.9125,
    description: 'בית קפה באווירת קמפוס וגינה — מעולה לשבת עם לפטופ או עם חברים.',
    status: 'calm', waitMinutes: 4, rating: 4.5, reviewCount: 210,
    tags: ['vegan', 'shaded'], specialties: ['אמריקנו כפול', 'מאפין טבעוני', 'סלט קינואה'],
    fieldTags: ['יש חלב סויה ושקדים 🥛'], updatedMinAgo: 10,
  }),
  seed({
    id: 'yasha-tzoran', name: 'יאשה קפה', area: 'צורן, חורשת קדימה-צורן', region: 'sharon', lat: 32.298, lng: 34.951,
    description: 'צמוד לחורשת קדימה-צורן — נקודת מפגש קבועה לרוכבי שטח ולרצי בוקר.',
    status: 'calm', waitMinutes: 5, rating: 4.6, reviewCount: 230,
    tags: ['cyclist', 'dogs', 'shaded'], specialties: ['אספרסו כפול', 'חטיף אנרגיה', 'מיץ תפוזים'],
    fieldTags: ['קבוצת רוכבים יצאה הרגע 🚴'],
  }),

  // ---------- 🌲 North: Galilee, Jezreel, Golan & Carmel ----------
  seed({
    id: 'yodfat', name: 'קפה יודפת', area: 'מושב יודפת, גליל', region: 'north', lat: 32.836, lng: 35.274,
    description: 'נוף פנורמי לגליל, ממש ליד יער הקופים. כוס קפה עם הנוף הכי יפה בסביבה.',
    status: 'calm', waitMinutes: 3, rating: 4.7, reviewCount: 260,
    tags: ['kids', 'dogs'], specialties: ['קפה שחור', 'עוגת שוקולד', 'לבנה וזעתר'],
    fieldTags: ['הנוף פתוח היום 🌄'],
  }),
  seed({
    id: 'arthur-nahalal', name: 'ארתור קפה', aliases: ['Arthur'], area: 'נהלל, עמק יזרעאל', region: 'north', lat: 32.69, lng: 35.195,
    description: 'בלב המושב העגול ההיסטורי, עם דשא, כריכים טובים ומאפים טריים.',
    status: 'moderate', waitMinutes: 11, rating: 4.6, reviewCount: 310,
    tags: ['kids', 'cyclist'], specialties: ['כריך סביח', 'קפוצ׳ינו', 'עוגיות חמאה'],
    fieldTags: ['יש מקום על הדשא 🌱'],
  }),
  seed({
    id: 'kafe-79-alon-hagalil', name: 'קפה 79', area: 'אלון הגליל', region: 'north', lat: 32.758, lng: 35.221,
    description: 'מרכז שטח לרוכבי אופניים בסינגל אלון הגליל. מים, קפה וכל הרכילות מהשביל.',
    status: 'moderate', waitMinutes: 9, rating: 4.7, reviewCount: 290,
    tags: ['cyclist', 'dogs'], specialties: ['אספרסו', 'בננה ותמרים', 'איזוטוני'],
    fieldTags: ['קבוצת רוכבים גדולה 🚴'],
  }),
  seed({
    id: 'baemek-kfar-yehoshua', name: 'קפה בעמק', area: 'כפר יהושע', region: 'north', lat: 32.681, lng: 35.152,
    description: 'ליד תחנת רכבת העמק ההיסטורית. מוצל, רגוע וטוב לעצירה עם הילדים.',
    status: 'calm', waitMinutes: 4, rating: 4.5, reviewCount: 150,
    tags: ['shaded', 'kids'], specialties: ['הפוך', 'עוגת תפוזים', 'טוסט'],
    fieldTags: ['יש מקום ישיבה בצל 🌳'], dataSource: 'estimate', updatedMinAgo: 15,
  }),
  seed({
    id: 'al-hamayim-hagoshrim', name: 'קפה על המים', area: 'קיבוץ הגושרים', region: 'north', lat: 33.2235, lng: 35.623,
    description: 'ישיבה ממש ליד נחל הקורן — קריר גם באמצע הקיץ. רגליים במים וקפה ביד.',
    status: 'moderate', waitMinutes: 14, rating: 4.8, reviewCount: 380,
    tags: ['shaded', 'kids', 'dogs'], specialties: ['אייס לאטה', 'ארטיק פירות', 'קרואסון'],
    fieldTags: ['המים קרים ומעולים 💧'],
  }),
  seed({
    id: 'materello-ein-zivan', name: 'מטרלו', aliases: ['Materello'], area: 'עין זיוון, רמת הגולן', region: 'north', lat: 33.095, lng: 35.795,
    description: 'פטיסרי עם הקרואסונים מהמפורסמים בארץ. העומס בהתאם — תתכוננו לתור.',
    status: 'busy', waitMinutes: 35, rating: 4.9, reviewCount: 890,
    tags: ['kids'], specialties: ['קרואסון שקדים', 'פן או שוקולה', 'קפוצ׳ינו'],
    fieldTags: ['נגמר הקרואסון שקדים ❌', 'התור יוצא מהדלת 😅'], updatedMinAgo: 2,
  }),
  seed({
    id: 'bamata-odem', name: 'קפה במטע', area: 'אודם, רמת הגולן', region: 'north', lat: 33.195, lng: 35.751,
    description: 'ליד יער אודם — אוויר הרים, פירות יער ומאפים. אחד המקומות הכי שלווים בגולן.',
    status: 'calm', waitMinutes: 3, rating: 4.7, reviewCount: 200,
    tags: ['dogs', 'kids', 'vegan'], specialties: ['שייק פירות יער', 'עוגת דובדבנים', 'תה צמחים'],
    fieldTags: ['קריר ונעים בחוץ 🍃'],
  }),
  seed({
    id: 'bahorsha-kerem-maharal', name: 'קפה בחורשה', area: 'כרם מהר״ל, חוף הכרמל', region: 'north', lat: 32.645, lng: 34.985,
    description: 'למרגלות הכרמל, על הסינגלים של האופניים ומסלולי ההליכה. צל, שקט וקפה.',
    status: 'moderate', waitMinutes: 8, rating: 4.6, reviewCount: 170,
    tags: ['cyclist', 'shaded', 'dogs'], specialties: ['קורטדו', 'כריך גבינות', 'עוגיית שיבולת שועל'],
    fieldTags: ['יש מים לכלבים 💧'],
  }),
  seed({
    id: 'dalia-ramot-menashe', name: 'קפה דליה', area: 'קיבוץ דליה, רמות מנשה', region: 'north', lat: 32.589, lng: 35.095,
    description: 'ליד נחל השופט וגבעת הרקפות — טבע פראי, נוף פתוח, וקפה לפני או אחרי המסלול.',
    status: 'calm', waitMinutes: 2, rating: 4.5, reviewCount: 110,
    tags: ['dogs', 'kids', 'cyclist'], specialties: ['קפה שחור', 'פיתה עם לבנה', 'לימונדה'],
    fieldTags: ['יש חניה בשפע 🚗'], dataSource: 'estimate', updatedMinAgo: 14,
  }),

  // ---------- ⛰️ Center, Shfela & Jerusalem Hills ----------
  seed({
    id: 'napa-ben-shemen', name: 'קפה נאפה', aliases: ['Napa'], area: 'יער בן שמן, גמזו', region: 'center', lat: 31.945, lng: 34.938,
    description: 'בלב יער בן שמן — מוקד עלייה לרגל לרוכבים ולרצים. בסופ״ש מלא מאוד.',
    status: 'busy', waitMinutes: 22, rating: 4.7, reviewCount: 560,
    tags: ['cyclist', 'dogs', 'shaded'], specialties: ['אספרסו כפול', 'בננה ושוקולד', 'קפה קר'],
    fieldTags: ['קבוצת רוכבים גדולה 🚴', 'אין חניה קרובה ⚠️'], updatedMinAgo: 3,
  }),
  seed({
    id: 'bakerem-karmei-yosef', name: 'קפה בכרם', area: 'כרמי יוסף', region: 'center', lat: 31.845, lng: 34.918,
    description: 'נוף לכרמים וצמוד לסינגל כרמי יוסף. מקום לנשום אחרי עלייה טובה.',
    status: 'moderate', waitMinutes: 9, rating: 4.6, reviewCount: 190,
    tags: ['cyclist', 'kids'], specialties: ['לאטה', 'עוגת יין ואגוזים', 'כריך טונה'],
    fieldTags: ['הנוף פתוח היום 🌄'],
  }),
  seed({
    id: 'bar-bahar-nes-harim', name: 'בר בהר', area: 'נס הרים, הרי ירושלים', region: 'center', lat: 31.725, lng: 35.061,
    description: 'המוקד מספר 1 בארץ לרוכבי כביש והרים, עם נוף עוצר נשימה. ביום שישי — פקק של אופניים.',
    status: 'busy', waitMinutes: 30, rating: 4.8, reviewCount: 720,
    tags: ['cyclist', 'dogs'], specialties: ['אספרסו', 'עוגת שמרים', 'שייק חלבון'],
    fieldTags: ['קבוצת רוכבים גדולה 🚴', 'התור זז לאט 🐢'], updatedMinAgo: 2,
  }),
  seed({
    id: 'agur-ela-valley', name: 'קפה עגור', area: 'מושב עגור, עמק האלה', region: 'center', lat: 31.692, lng: 34.908,
    description: 'חצר ירוקה בעמק האלה, עם מאפים וגבינות מקומיות מהמשקים מסביב.',
    status: 'calm', waitMinutes: 4, rating: 4.6, reviewCount: 160,
    tags: ['kids', 'shaded', 'dogs'], specialties: ['פלטת גבינות', 'פוקאצ׳ה', 'הפוך'],
    fieldTags: ['יש מקום ישיבה בצל 🌳'],
  }),
  seed({
    id: 'srigim-cart', name: 'עגלת קפה שריגים', area: 'שריגים (לי-און), פארק בריטניה', region: 'center', lat: 31.678, lng: 34.929,
    description: 'צמודה לפארק בריטניה — מוצלת ומתאימה למשפחות שיוצאות לטייל.',
    status: 'calm', waitMinutes: 3, rating: 4.5, reviewCount: 130,
    tags: ['kids', 'shaded', 'dogs'], specialties: ['שוקו חם', 'קפה שחור', 'עוגייה'],
    fieldTags: ['יש חניה בשפע 🚗'], dataSource: 'estimate', updatedMinAgo: 16,
  }),
  seed({
    id: 'givat-brenner', name: 'קפה גבעת ברנר', area: 'קיבוץ גבעת ברנר', region: 'center', lat: 31.862, lng: 34.805,
    description: 'ליד המשתלה, עם מדשאות גדולות. נוח מאוד למשפחות מהמרכז.',
    status: 'moderate', waitMinutes: 12, rating: 4.5, reviewCount: 240,
    tags: ['kids', 'shaded'], specialties: ['קפוצ׳ינו', 'וופל בלגי', 'מיץ טבעי'],
    fieldTags: ['הדשא מלא ילדים 🪁'],
  }),
  seed({
    id: 'satariya', name: 'קפה סתריה', area: 'מושב סתריה', region: 'center', lat: 31.895, lng: 34.842,
    description: 'בין פרדסים ושדות, נגיש מאוד מרחובות ונס ציונה. שקט של מושב, עשר דקות מהעיר.',
    status: 'calm', waitMinutes: 3, rating: 4.6, reviewCount: 150,
    tags: ['dogs', 'cyclist', 'vegan'], specialties: ['קפה שיבולת שועל', 'עוגת תפוזים', 'סלט'],
    fieldTags: ['יש חניה בשפע 🚗'],
  }),
  seed({
    id: 'kidron', name: 'קפה קדרון', area: 'מושב קדרון', region: 'center', lat: 31.815, lng: 34.812,
    description: 'שקט, חניה בשפע ומאפים טריים. בדיוק מה שצריך בבוקר של סופ״ש.',
    status: 'calm', waitMinutes: 2, rating: 4.4, reviewCount: 90,
    tags: ['kids', 'dogs'], specialties: ['בורקס', 'הפוך', 'עוגת שמרים'],
    fieldTags: ['נשארו מאפים חמים 🥐'], dataSource: 'estimate', updatedMinAgo: 20,
  }),

  // ---------- ☀️ South & Negev ----------
  seed({
    id: 'ruhama', name: 'קפה רוחמה', area: 'קיבוץ רוחמה', region: 'south', lat: 31.498, lng: 34.702,
    description: 'ליד שמורת בתרונות רוחמה — נוף פתוח ומרחבים. בחורף הכל ירוק.',
    status: 'calm', waitMinutes: 3, rating: 4.6, reviewCount: 140,
    tags: ['cyclist', 'kids', 'dogs'], specialties: ['קפה שחור', 'עוגת גבינה', 'כריך'],
    fieldTags: ['הנוף פתוח היום 🌄'],
  }),
  seed({
    id: 'gvaram', name: 'קפה גברעם', area: 'קיבוץ גברעם', region: 'south', lat: 31.591, lng: 34.612,
    description: 'חורשה נעימה בין מסלולי הליכה ורכיבה. עצירה רגועה בדרך דרומה.',
    status: 'moderate', waitMinutes: 8, rating: 4.5, reviewCount: 120,
    tags: ['shaded', 'cyclist'], specialties: ['קורטדו', 'מאפה גבינה', 'לימונענע'],
    fieldTags: ['יש מקום ישיבה בצל 🌳'],
  }),
  seed({
    id: 'mitzpe-ramon', name: 'קפה מצפה רמון', area: 'רובע הבשמים, מצפה רמון', region: 'south', lat: 30.618, lng: 34.805,
    description: 'קפה ספשלטי ומאפים על שפת המכתש. השקיעה פה היא חוויה בפני עצמה.',
    status: 'moderate', waitMinutes: 10, rating: 4.8, reviewCount: 330,
    tags: ['vegan', 'dogs'], specialties: ['פילטר ספשלטי', 'מאפה תמרים', 'עוגת סילאן'],
    fieldTags: ['הנוף למכתש מושלם 🏜️'],
  }),
  seed({
    id: 'sapir-park', name: 'עגלת קפה פארק ספיר', area: 'פארק ספיר, הערבה התיכונה', region: 'south', lat: 30.612, lng: 35.185,
    description: 'נווה מדבר עם אגם קטן ודקלים, ממש על כביש 90. עצירה מושלמת בדרך לאילת.',
    status: 'calm', waitMinutes: 2, rating: 4.5, reviewCount: 160,
    tags: ['kids', 'shaded', 'dogs'], specialties: ['אייס קפה', 'ארטיק', 'מים קרים'],
    fieldTags: ['יש צל ליד האגם 🌴'],
  }),
]
