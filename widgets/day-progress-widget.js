// Day progress widget (MEDIUM size) for Scriptable
// 24 bars, one per hour of the day, filled up to the current time.

const BG = new Color("#1e0c13")
const RED = new Color("#e8644f")
const FILL = new Color("#d98be0")
const EMPTY = new Color("#4b2a31")
const WHITE = Color.white()

const BARS = 24
const BAR_W = 8.5
const GAP = 3.5
const BAR_H = 52

// Share of the day that has passed, 0..1
function dayFraction(d) {
  const secs = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()
  return secs / 86400
}

function ordinalSuffix(n) {
  if (n % 100 >= 11 && n % 100 <= 13) return "th"
  return ["th", "st", "nd", "rd"][n % 10] || "th"
}

function roundedBar(dc, x, w, color) {
  const p = new Path()
  const r = Math.min(3, w / 2)
  p.addRoundedRect(new Rect(x, 0, w, BAR_H), r, r)
  dc.addPath(p)
  dc.setFillColor(color)
  dc.fillPath()
}

function drawBars(fraction) {
  const dc = new DrawContext()
  dc.size = new Size(BARS * BAR_W + (BARS - 1) * GAP, BAR_H)
  dc.opaque = false
  dc.respectScreenScale = true
  const filled = fraction * BARS
  for (let i = 0; i < BARS; i++) {
    const x = i * (BAR_W + GAP)
    roundedBar(dc, x, BAR_W, EMPTY)
    const part = Math.min(1, filled - i) // 1 = full bar, between 0 and 1 = current hour
    if (part > 0) roundedBar(dc, x, BAR_W * part, FILL)
  }
  return dc.getImage()
}

function addText(stack, str, font, color) {
  const t = stack.addText(str)
  t.font = font
  t.textColor = color
  return t
}

const now = new Date()
const fraction = dayFraction(now)

const w = new ListWidget()
w.backgroundColor = BG
w.setPadding(14, 16, 12, 16)
// Bars and percentage are redrawn only when iOS refreshes the widget
w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000)

// ----- header: date (left), live time (right) -----
const header = w.addStack()
header.centerAlignContent()
const df = new DateFormatter()
df.dateFormat = "EEEE, MMMM d"
addText(header, df.string(now), Font.semiboldSystemFont(14), RED)
const sup = header.addStack()
sup.layoutVertically()
addText(sup, ordinalSuffix(now.getDate()), Font.semiboldSystemFont(8), RED)
sup.addSpacer(7) // lifts the suffix like a superscript
header.addSpacer()
const time = header.addDate(now)
time.applyTimeStyle() // live: always shows the current time
time.font = Font.semiboldSystemFont(14)
time.textColor = RED
time.rightAlignText()

w.addSpacer(10)

// ----- bars -----
const barsRow = w.addStack()
barsRow.addSpacer()
const img = barsRow.addImage(drawBars(fraction))
img.imageSize = new Size(BARS * BAR_W + (BARS - 1) * GAP, BAR_H)
barsRow.addSpacer()

w.addSpacer(4)

// ----- footer: 12AM, percentage, 12AM -----
const footer = w.addStack()
footer.centerAlignContent()
addText(footer, "12AM", Font.boldSystemFont(10), WHITE)
footer.addSpacer()
addText(footer, `${Math.floor(fraction * 100)}%`, Font.boldSystemFont(18), FILL)
footer.addSpacer()
addText(footer, "12AM", Font.boldSystemFont(10), WHITE)

if (config.runsInWidget) {
  Script.setWidget(w)
} else {
  await w.presentMedium()
}
Script.complete()
