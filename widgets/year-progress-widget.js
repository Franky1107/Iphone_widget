// Year progress widget (MEDIUM size) for Scriptable
// One dot per day: past days black, today red, remaining days grey.

const BG = Color.white()
const PAST = new Color("#111111")
const TODAY = new Color("#ff3b30")
const FUTURE = new Color("#d6d6d6")
const TEXT = new Color("#111111")

const COLS = 37
const STEP = 8      // distance between dot centres, in points
const DOT = 5.5     // dot diameter

// Day-of-year math in UTC so daylight-saving shifts can't skew the count
function yearInfo(date) {
  const y = date.getFullYear()
  const today = Date.UTC(y, date.getMonth(), date.getDate())
  const dayIndex = (today - Date.UTC(y, 0, 1)) / 86400000  // 0 = Jan 1
  const total = (Date.UTC(y + 1, 0, 1) - Date.UTC(y, 0, 1)) / 86400000
  return { year: y, dayIndex, total, left: total - dayIndex - 1 }
}

function drawDots(info) {
  const rows = Math.ceil(info.total / COLS)
  const dc = new DrawContext()
  dc.size = new Size(COLS * STEP, rows * STEP)
  dc.opaque = false
  dc.respectScreenScale = true
  const pad = (STEP - DOT) / 2
  for (let i = 0; i < info.total; i++) {
    const x = (i % COLS) * STEP + pad
    const y = Math.floor(i / COLS) * STEP + pad
    dc.setFillColor(i < info.dayIndex ? PAST : i === info.dayIndex ? TODAY : FUTURE)
    dc.fillEllipse(new Rect(x, y, DOT, DOT))
  }
  return dc.getImage()
}

const info = yearInfo(new Date())

const w = new ListWidget()
w.backgroundColor = BG
w.setPadding(16, 18, 14, 18)

// Refresh just after midnight so the red dot moves each day
const tomorrow = new Date()
tomorrow.setHours(24, 0, 5, 0)
w.refreshAfterDate = tomorrow

const dotsRow = w.addStack()
dotsRow.addSpacer()
const img = dotsRow.addImage(drawDots(info))
img.imageSize = new Size(COLS * STEP, Math.ceil(info.total / COLS) * STEP)
dotsRow.addSpacer()

w.addSpacer()

const footer = w.addStack()
const yearText = footer.addText(String(info.year))
yearText.font = Font.regularMonospacedSystemFont(13)
yearText.textColor = TEXT
footer.addSpacer()
const leftText = footer.addText(`${info.left} ${info.left === 1 ? "day" : "days"} left`)
leftText.font = Font.regularMonospacedSystemFont(13)
leftText.textColor = TEXT

if (config.runsInWidget) {
  Script.setWidget(w)
} else {
  await w.presentMedium()
}
Script.complete()
