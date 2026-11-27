// נקודת היציאה להרפתקה: המיקום הנוכחי (GPS) או עיר שבוחרים מרשימה.
// הבחירה נשמרת במכשיר.

export const CITIES = [
  { name: 'אילת', lat: 29.5577, lng: 34.9519 },
  { name: 'אשדוד', lat: 31.8014, lng: 34.6435 },
  { name: 'אשקלון', lat: 31.6688, lng: 34.5743 },
  { name: 'באר שבע', lat: 31.2518, lng: 34.7913 },
  { name: 'בית שמש', lat: 31.747, lng: 34.9881 },
  { name: 'דימונה', lat: 31.0708, lng: 35.0336 },
  { name: 'הרצליה', lat: 32.1624, lng: 34.8447 },
  { name: 'חיפה', lat: 32.794, lng: 34.9896 },
  { name: 'טבריה', lat: 32.7922, lng: 35.5312 },
  { name: 'ירושלים', lat: 31.7683, lng: 35.2137 },
  { name: 'כפר סבא', lat: 32.1782, lng: 34.9076 },
  { name: 'כרמיאל', lat: 32.919, lng: 35.295 },
  { name: 'מודיעין', lat: 31.8986, lng: 35.0104 },
  { name: 'מצפה רמון', lat: 30.61, lng: 34.8017 },
  { name: 'נצרת', lat: 32.6996, lng: 35.3035 },
  { name: 'נתניה', lat: 32.3215, lng: 34.8532 },
  { name: 'עפולה', lat: 32.6078, lng: 35.2897 },
  { name: 'ערד', lat: 31.2589, lng: 35.2125 },
  { name: 'פתח תקווה', lat: 32.0871, lng: 34.8875 },
  { name: 'צפת', lat: 32.9646, lng: 35.496 },
  { name: 'קצרין', lat: 32.9925, lng: 35.6917 },
  { name: 'קריית שמונה', lat: 33.2073, lng: 35.5702 },
  { name: 'ראשון לציון', lat: 31.973, lng: 34.7925 },
  { name: 'רחובות', lat: 31.8928, lng: 34.8113 },
  { name: 'תל אביב', lat: 32.0853, lng: 34.7818 },
];

const KEY = 'thv-origin';
const CUSTOM_KEY = 'thv-origin-custom';
export const MY_LOCATION = 'gps';
// מיקום אחר שהמשתמש חיפש (כתובת, יישוב או מקום): נשמר כ-{ name, lat, lng }
export const CUSTOM = 'custom';

export function loadCustomOrigin() {
  try {
    const c = JSON.parse(localStorage.getItem(CUSTOM_KEY));
    return c && typeof c.lat === 'number' && typeof c.lng === 'number' ? c : null;
  } catch {
    return null;
  }
}
export function saveCustomOrigin(place) {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify({ name: String(place.name).slice(0, 60), lat: place.lat, lng: place.lng }));
    localStorage.setItem(KEY, CUSTOM);
  } catch {}
}

// שם קצר לבחירה הנוכחית, להצגה ("המיקום שלי", "חיפה", "קיבוץ דן")
export function originLabel(choice = loadOriginChoice()) {
  if (choice === CUSTOM) return loadCustomOrigin()?.name || 'מיקום אחר';
  if (choice === MY_LOCATION) return 'המיקום שלי עכשיו';
  return choice;
}

// מה נבחר: 'gps' (ברירת מחדל) או שם של עיר
export function loadOriginChoice() {
  try {
    return localStorage.getItem(KEY) || MY_LOCATION;
  } catch {
    return MY_LOCATION;
  }
}
export function saveOriginChoice(choice) {
  try {
    localStorage.setItem(KEY, choice);
  } catch {}
}

// מחזיר { lat, lng, label, source } או null אם אי אפשר לדעת (אין הרשאת מיקום וכו')
export function resolveOrigin(choice = loadOriginChoice(), timeoutMs = 8000) {
  if (choice === CUSTOM) {
    const c = loadCustomOrigin();
    if (c) return Promise.resolve({ lat: c.lat, lng: c.lng, label: c.name, source: 'custom' });
  }
  const city = CITIES.find((c) => c.name === choice);
  if (city) return Promise.resolve({ lat: city.lat, lng: city.lng, label: city.name, source: 'city' });
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'המיקום שלך', source: 'gps' }),
      () => resolve(null),
      { enableHighAccuracy: false, maximumAge: 120000, timeout: timeoutMs },
    );
  });
}
