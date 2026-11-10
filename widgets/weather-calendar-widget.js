// Weather + Calendar widget (LARGE size) for Scriptable
// Uses your phone's location, Open-Meteo weather (free, no API key)
// and the calendars on your iPhone.

const NAME = "Sourav"
const ACCENT = new Color("#ff9f43")
const RED = new Color("#ff453a")
const DIM = new Color("#8e8e93")
const SOFT = new Color("#d1d1d6")
const WHITE = Color.white()

const fm = FileManager.local()
const cachePath = fm.joinPath(fm.documentsDirectory(), "weather-widget-cache.json")

// ---------- data ----------
// Resolves with `fallback` if the promise takes longer than `ms`,
// so a slow GPS fix or network call can't make the script time out.
function withTimeout(promise, ms, fallback = null) {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise(resolve => Timer.schedule(ms, false, () => resolve(fallback)))
  ])
}

async function getLocation(cachedLoc) {
  // Reuse a recent location (< 1 hour old) instead of asking GPS every time
  if (cachedLoc && cachedLoc.time && Date.now() - cachedLoc.time < 60 * 60 * 1000) {
    return cachedLoc
  }
  Location.setAccuracyToThreeKilometers()
  const loc = await withTimeout(Location.current(), 6000)
  if (!loc) return null
  let city = (cachedLoc && cachedLoc.city) || ""
  const geo = await withTimeout(Location.reverseGeocode(loc.latitude, loc.longitude), 3000, [])
  if (geo && geo.length) city = geo[0].locality || geo[0].subAdministrativeArea || city
  return { lat: loc.latitude, lon: loc.longitude, city, time: Date.now() }
}

async function getData() {
  let cache = null
  if (fm.fileExists(cachePath)) {
    try { cache = JSON.parse(fm.readString(cachePath)) } catch (e) {}
  }
  const loc = (await getLocation(cache && cache.loc)) || (cache && cache.loc)
  if (!loc) return cache
  try {
    const url = "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${loc.lat}&longitude=${loc.lon}` +
      "&current=temperature_2m,weather_code,is_day" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min" +
      "&timezone=auto&forecast_days=7"
    const req = new Request(url)
    req.timeoutInterval = 8 // seconds
    const weather = await req.loadJSON()
    if (!weather || !weather.current) throw new Error("bad response")
    const data = { loc, weather }
    fm.writeString(cachePath, JSON.stringify(data))
    return data
  } catch (e) {
    return cache // offline or slow: show last known weather
  }
}

async function getEvents() {
  const start = new Date()
  const end = new Date()
  end.setDate(end.getDate() + 60)
  const events = await withTimeout(CalendarEvent.between(start, end), 4000, [])
  return (events || []).sort((a, b) => a.startDate - b.startDate).slice(0, 2)
}

// Open-Meteo weather code -> [label, SF Symbol]
function wx(code, isDay = true) {
  if (code === 0) return ["Clear", isDay ? "sun.max.fill" : "moon.stars.fill"]
  if (code <= 2) return ["Partly Cloudy", isDay ? "cloud.sun.fill" : "cloud.moon.fill"]
  if (code === 3) return ["Cloudy", "cloud.fill"]
  if (code <= 48) return ["Fog", "cloud.fog.fill"]
  if (code <= 57) return ["Drizzle", "cloud.drizzle.fill"]
  if (code <= 65) {
    if (code === 61) return ["Light Rain", "cloud.rain.fill"]
    if (code === 65) return ["Heavy Rain", "cloud.heavyrain.fill"]
    return ["Rain", "cloud.rain.fill"]
  }
  if (code <= 67) return ["Freezing Rain", "cloud.sleet.fill"]
  if (code <= 77) return ["Snow", "cloud.snow.fill"]
  if (code <= 82) return ["Showers", isDay ? "cloud.sun.rain.fill" : "cloud.moon.rain.fill"]
  if (code <= 86) return ["Snow Showers", "cloud.snow.fill"]
  return ["Thunderstorm", "cloud.bolt.rain.fill"]
}

// ---------- helpers ----------
function addText(stack, str, font, color = WHITE) {
  const t = stack.addText(str)
  t.font = font
  t.textColor = color
  return t
}

function addSymbol(stack, name, size, color = WHITE) {
  const sym = SFSymbol.named(name)
  if (!sym) return null
  sym.applyFont(Font.systemFont(size))
  const img = stack.addImage(sym.image)
  img.imageSize = new Size(size, size)
  img.tintColor = color
  return img
}

function pill(stack, str) {
  const p = stack.addStack()
  p.backgroundColor = new Color("#ffffff", 0.12)
  p.cornerRadius = 8
  p.setPadding(3, 7, 3, 7)
  addText(p, str, Font.mediumSystemFont(11))
}

// ---------- build ----------
const data = await getData()
const events = await getEvents()
const now = new Date()

const w = new ListWidget()
const bg = new LinearGradient()
bg.colors = [new Color("#1c1c1e"), new Color("#000000")]
bg.locations = [0, 1]
w.backgroundGradient = bg
w.setPadding(14, 14, 12, 14)
w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000)

// ----- top: greeting + weather (left), date (right) -----
const top = w.addStack()
top.topAlignContent()

const left = top.addStack()
left.layoutVertically()

const h = now.getHours()
const greet = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
addText(left, `${greet}, ${NAME}`, Font.mediumSystemFont(13))
left.addSpacer(2)

if (data && data.weather) {
  const cur = data.weather.current
  const daily = data.weather.daily
  const [label, sym] = wx(cur.weather_code, cur.is_day === 1)

  const tempRow = left.addStack()
  tempRow.centerAlignContent()
  addText(tempRow, `${Math.round(cur.temperature_2m)}°`, Font.lightSystemFont(38))
  tempRow.addSpacer(8)
  addSymbol(tempRow, sym, 26)

  const place = data.loc && data.loc.city ? ` · ${data.loc.city}` : ""
  const cond = addText(left, label + place, Font.systemFont(13), SOFT)
  cond.lineLimit = 1

  left.addSpacer(6)
  const pills = left.addStack()
  pills.spacing = 6
  pill(pills, `↑ ${Math.round(daily.temperature_2m_max[0])}°`)
  pill(pills, `↓ ${Math.round(daily.temperature_2m_min[0])}°`)
} else {
  addText(left, "Weather unavailable", Font.systemFont(13), DIM)
}

top.addSpacer()

const right = top.addStack()
right.layoutVertically()
right.centerAlignContent()
const df = new DateFormatter()
df.dateFormat = "MMMM"
addText(right, df.string(now).toUpperCase(), Font.boldSystemFont(13))
df.dateFormat = "dd"
addText(right, df.string(now), Font.boldRoundedSystemFont(48))
df.dateFormat = "EEEE"
addText(right, df.string(now), Font.mediumSystemFont(14), SOFT)

// ----- middle: events (left), month grid (right) -----
w.addSpacer(10)
const mid = w.addStack()
mid.topAlignContent()

const evStack = mid.addStack()
evStack.layoutVertically()
evStack.size = new Size(135, 0)

if (events.length === 0) {
  addText(evStack, "No upcoming events", Font.systemFont(11), DIM)
}
const edf = new DateFormatter()
events.forEach((e, i) => {
  if (i > 0) evStack.addSpacer(8)
  const t = addText(evStack, e.title, Font.semiboldSystemFont(12), i === 0 ? ACCENT : WHITE)
  t.lineLimit = 1
  edf.dateFormat = "MMM d"
  let when = edf.string(e.startDate)
  if (e.isAllDay) {
    when += " · All day"
  } else {
    edf.dateFormat = "h:mm a"
    when += " · " + edf.string(e.startDate)
  }
  addText(evStack, when, Font.italicSystemFont(10), SOFT)
  const c = addText(evStack, e.calendar.title, Font.systemFont(10), DIM)
  c.lineLimit = 1
})

mid.addSpacer()

const CW = 21, CH = 14
const grid = mid.addStack()
grid.layoutVertically()
grid.spacing = 2

const header = grid.addStack()
;["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].forEach((d, i) => {
  const c = header.addStack()
  c.size = new Size(CW, CH)
  c.centerAlignContent()
  addText(c, d, Font.mediumSystemFont(9), i === 0 ? RED : DIM)
})

const y = now.getFullYear(), m = now.getMonth()
const firstDay = new Date(y, m, 1).getDay()
const daysIn = new Date(y, m + 1, 0).getDate()
const prevDays = new Date(y, m, 0).getDate()
const cells = Math.ceil((firstDay + daysIn) / 7) * 7

let row
for (let i = 0; i < cells; i++) {
  if (i % 7 === 0) row = grid.addStack()
  const n = i - firstDay + 1
  const inMonth = n >= 1 && n <= daysIn
  const num = n < 1 ? prevDays + n : n > daysIn ? n - daysIn : n
  const isToday = inMonth && n === now.getDate()

  const c = row.addStack()
  c.size = new Size(CW, CH)
  c.centerAlignContent()
  if (isToday) {
    c.backgroundColor = RED
    c.cornerRadius = CH / 2
  }
  let color = WHITE
  if (!inMonth) color = new Color("#48484a")
  else if (i % 7 === 0 && !isToday) color = RED
  addText(c, String(num), isToday ? Font.boldSystemFont(10) : Font.systemFont(10), color)
}

// ----- bottom: 6-day forecast -----
w.addSpacer()
if (data && data.weather) {
  const d = data.weather.daily
  const fc = w.addStack()
  const fdf = new DateFormatter()
  fdf.dateFormat = "EEE"
  for (let i = 1; i <= 6 && i < d.time.length; i++) {
    if (i > 1) fc.addSpacer()
    const col = fc.addStack()
    col.layoutVertically()
    col.centerAlignContent()
    const day = new Date(d.time[i] + "T00:00:00")
    addText(col, fdf.string(day).toUpperCase(), Font.boldSystemFont(10), ACCENT)
    col.addSpacer(3)
    addSymbol(col, wx(d.weather_code[i])[1], 18)
    col.addSpacer(3)
    const t = col.addStack()
    addText(t, `${Math.round(d.temperature_2m_max[i])}°`, Font.mediumSystemFont(10))
    t.addSpacer(3)
    addText(t, `${Math.round(d.temperature_2m_min[i])}°`, Font.systemFont(10), DIM)
  }
}

if (config.runsInWidget) {
  Script.setWidget(w)
} else {
  await w.presentLarge()
}
Script.complete()
