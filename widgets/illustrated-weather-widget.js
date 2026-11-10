// Illustrated weather widget (LARGE size) for Scriptable
// Layout: picture + big weekday + weather sentence on the left,
// 4-day forecast + date + "now" on the right.
// Run it inside Scriptable to choose the picture from your Photos.

const fm = FileManager.local()
const dir = fm.documentsDirectory()
const cachePath = fm.joinPath(dir, "illustrated-weather-cache.json")
const artPath = fm.joinPath(dir, "illustrated-weather-art.jpg")

// ---------- colors & sizes ----------
const INK = new Color("#1d1d1f")
const INK_SOFT = new Color("#2c2c2e")
const LINE = new Color("#1d1d1f", 0.7)
const BOX = new Color("#61789f")

const LW = 212   // left column width
const RW = 60    // right column width
const GAP = 10
const H1 = 226   // top section height
const H2 = 60    // bottom section height
const FULL_W = LW + GAP * 2 + 1 + RW

// ---------- helpers ----------
function withTimeout(promise, ms, fallback = null) {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise(resolve => Timer.schedule(ms, false, () => resolve(fallback)))
  ])
}

function addText(stack, str, font, color = INK) {
  const t = stack.addText(str)
  t.font = font
  t.textColor = color
  return t
}

function addSymbol(stack, name, size, color = INK) {
  const sym = SFSymbol.named(name) || SFSymbol.named("cloud")
  sym.applyFont(Font.systemFont(size))
  const img = stack.addImage(sym.image)
  img.imageSize = new Size(size, size)
  img.tintColor = color
  return img
}

// A right-aligned line inside a fixed-width column
function rightRow(stack) {
  const row = stack.addStack()
  row.addSpacer()
  return row
}

function line(stack, w, h) {
  const l = stack.addStack()
  l.size = new Size(w, h)
  l.backgroundColor = LINE
  return l
}

// Shrink big photos so the widget stays within its memory limit
function resize(img, width) {
  const height = img.size.height * width / img.size.width
  const dc = new DrawContext()
  dc.size = new Size(width, height)
  dc.respectScreenScale = false
  dc.opaque = false
  dc.drawImageInRect(img, new Rect(0, 0, width, height))
  return dc.getImage()
}

// Open-Meteo weather code -> [label, outline SF Symbol]
function wx(code, isDay = true) {
  if (code === 0) return ["Clear", isDay ? "sun.max" : "moon.stars"]
  if (code <= 2) return ["Partly Cloudy", isDay ? "cloud.sun" : "cloud.moon"]
  if (code === 3) return ["Cloudy", "cloud"]
  if (code <= 48) return ["Foggy", "cloud.fog"]
  if (code <= 57) return ["Drizzle", "cloud.drizzle"]
  if (code <= 65) {
    if (code === 61) return ["Light Rain", "cloud.rain"]
    if (code === 65) return ["Heavy Rain", "cloud.heavyrain"]
    return ["Rain", "cloud.rain"]
  }
  if (code <= 67) return ["Freezing Rain", "cloud.sleet"]
  if (code <= 77) return ["Snow", "cloud.snow"]
  if (code <= 82) return ["Showers", isDay ? "cloud.sun.rain" : "cloud.moon.rain"]
  if (code <= 86) return ["Snow Showers", "cloud.snow"]
  return ["Thunderstorm", "cloud.bolt.rain"]
}

// ---------- data ----------
async function getLocation(cachedLoc) {
  if (cachedLoc && cachedLoc.time && Date.now() - cachedLoc.time < 60 * 60 * 1000) {
    return cachedLoc
  }
  Location.setAccuracyToThreeKilometers()
  const loc = await withTimeout(Location.current(), 6000)
  if (!loc) return null
  let city = (cachedLoc && cachedLoc.city) || ""
  let country = (cachedLoc && cachedLoc.country) || ""
  const geo = await withTimeout(Location.reverseGeocode(loc.latitude, loc.longitude), 3000, [])
  if (geo && geo.length) {
    city = geo[0].locality || geo[0].subAdministrativeArea || city
    country = geo[0].isoCountryCode || country
  }
  return { lat: loc.latitude, lon: loc.longitude, city, country, time: Date.now() }
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
      "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,is_day" +
      "&daily=weather_code" +
      "&timezone=auto&forecast_days=6"
    const req = new Request(url)
    req.timeoutInterval = 8
    const weather = await req.loadJSON()
    if (!weather || !weather.current) throw new Error("bad response")
    const data = { loc, weather }
    fm.writeString(cachePath, JSON.stringify(data))
    return data
  } catch (e) {
    return cache
  }
}

// ---------- widget ----------
async function buildWidget() {
  const data = await getData()
  const now = new Date()
  const cur = data && data.weather ? data.weather.current : null
  const daily = data && data.weather ? data.weather.daily : null
  const [label, curSym] = cur ? wx(cur.weather_code, cur.is_day === 1) : ["", "cloud"]

  const w = new ListWidget()
  const bg = new LinearGradient()
  bg.colors = [new Color("#a9b9bf"), new Color("#8d9fa6")]
  bg.locations = [0, 1]
  w.backgroundGradient = bg
  w.setPadding(14, 14, 14, 14)
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000)

  const outer = w.addStack()
  outer.layoutVertically()
  outer.centerAlignContent()

  // ===== top section =====
  const top = outer.addStack()

  const left = top.addStack()
  left.layoutVertically()
  left.size = new Size(LW, H1)

  // picture box
  const box = left.addStack()
  box.size = new Size(LW, 158)
  box.cornerRadius = 18
  box.backgroundColor = BOX
  box.centerAlignContent()
  if (fm.fileExists(artPath)) {
    const img = box.addImage(fm.readImage(artPath))
    img.imageSize = new Size(LW, 158)
    img.applyFillingContentMode()
  } else {
    addSymbol(box, curSym, 72, Color.white())
  }

  left.addSpacer()
  const df = new DateFormatter()
  df.dateFormat = "EEEE"
  const dayRow = rightRow(left)
  const day = addText(dayRow, df.string(now).toUpperCase(), Font.heavySystemFont(32))
  day.lineLimit = 1
  day.minimumScaleFactor = 0.6

  top.addSpacer(GAP)
  line(top, 1, H1)
  top.addSpacer(GAP)

  const right = top.addStack()
  right.layoutVertically()
  right.centerAlignContent()
  right.size = new Size(RW, H1)

  const fdf = new DateFormatter()
  fdf.dateFormat = "EEE"
  if (daily) {
    for (let i = 1; i <= 4 && i < daily.time.length; i++) {
      addSymbol(right, wx(daily.weather_code[i])[1], 26)
      right.addSpacer(2)
      const d = new Date(daily.time[i] + "T00:00:00")
      addText(right, fdf.string(d).toUpperCase(), Font.boldSystemFont(10), INK_SOFT)
      right.addSpacer()
    }
  } else {
    right.addSpacer()
  }
  df.dateFormat = "dd"
  addText(right, df.string(now), Font.heavySystemFont(24))
  df.dateFormat = "MMM"
  addText(right, df.string(now).toUpperCase(), Font.boldSystemFont(12))

  // ===== divider =====
  outer.addSpacer(8)
  line(outer, FULL_W, 1)
  outer.addSpacer(8)

  // ===== bottom section =====
  const bottom = outer.addStack()

  const bl = bottom.addStack()
  bl.layoutVertically()
  bl.size = new Size(LW, H2)

  if (cur) {
    const sentence = `Today's weather is ${Math.round(cur.temperature_2m)}°C ${label} ` +
      `with ${Math.round(cur.relative_humidity_2m)}% humidity and wind speed ` +
      `${cur.wind_speed_10m.toFixed(1)} km/h`
    const sRow = rightRow(bl)
    const s = addText(sRow, sentence, Font.systemFont(11), INK_SOFT)
    s.rightAlignText()
    s.lineLimit = 3
    s.minimumScaleFactor = 0.8
  } else {
    const sRow = rightRow(bl)
    addText(sRow, "Weather unavailable", Font.systemFont(11), INK_SOFT)
  }
  bl.addSpacer(3)
  if (data && data.loc && data.loc.city) {
    const place = data.loc.city + (data.loc.country ? " - " + data.loc.country : "")
    const pRow = rightRow(bl)
    const p = addText(pRow, place.toUpperCase(), Font.heavySystemFont(12))
    p.lineLimit = 1
  }

  bottom.addSpacer(GAP)
  line(bottom, 1, H2)
  bottom.addSpacer(GAP)

  const br = bottom.addStack()
  br.layoutVertically()
  br.centerAlignContent()
  br.size = new Size(RW, H2)
  addSymbol(br, curSym, 28)
  br.addSpacer(3)
  addText(br, "NOW", Font.boldSystemFont(10), INK_SOFT)

  return w
}

// ---------- run ----------
async function main() {
  if (!config.runsInWidget) {
    const a = new Alert()
    a.title = "Weather widget"
    a.addAction("Preview widget")
    a.addAction("Choose picture")
    if (fm.fileExists(artPath)) a.addAction("Remove picture")
    a.addCancelAction("Cancel")
    const choice = await a.presentSheet()
    if (choice === -1) return
    if (choice === 1) {
      try {
        const img = await Photos.fromLibrary()
        fm.writeImage(artPath, resize(img, 600))
      } catch (e) {} // picker cancelled
    }
    if (choice === 2) fm.remove(artPath)
  }

  const w = await buildWidget()
  if (config.runsInWidget) {
    Script.setWidget(w)
  } else {
    await w.presentLarge()
  }
}

await main()
Script.complete()
