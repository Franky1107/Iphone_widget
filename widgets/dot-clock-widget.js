// Dot-matrix clock widget (SMALL size) for Scriptable
// Weekday, red dotted time, month and day.

// true  = dotted "LED" digits. iOS only redraws widgets every ~15 min or more,
//         so the time can lag behind the real time.
// false = always-correct live time, in a plain monospaced font.
const DOT_MATRIX = false

const RED = new Color("#e8141c")
const TEXT = new Color("#1a1a1a")

// 5x7 dot font ("1" = dot on). ":" is one column wide.
const GLYPHS = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ":": ["0", "1", "0", "0", "0", "1", "0"],
  "a": ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
  "p": ["00000", "00000", "11110", "10001", "11110", "10000", "10000"],
  "m": ["00000", "00000", "11010", "10101", "10101", "10101", "10101"],
}

function timeString(d) {
  const h = d.getHours() % 12 || 12
  const pad = n => String(n).padStart(2, "0")
  return `${pad(h)}:${pad(d.getMinutes())}${d.getHours() < 12 ? "am" : "pm"}`
}

function ordinal(n) {
  if (n % 100 >= 11 && n % 100 <= 13) return n + "th"
  return n + (["th", "st", "nd", "rd"][n % 10] || "th")
}

function drawDotText(str, step, dot) {
  const glyphs = [...str].map(c => GLYPHS[c])
  const cols = glyphs.reduce((sum, g) => sum + g[0].length, 0) + glyphs.length - 1
  const dc = new DrawContext()
  dc.size = new Size(cols * step, 7 * step)
  dc.opaque = false
  dc.respectScreenScale = true
  dc.setFillColor(RED)
  let x0 = 0
  for (const g of glyphs) {
    g.forEach((row, r) => [...row].forEach((bit, c) => {
      if (bit === "1") dc.fillEllipse(new Rect((x0 + c) * step, r * step, dot, dot))
    }))
    x0 += g[0].length + 1 // one empty column between characters
  }
  return dc.getImage()
}

function addLabel(stack, str, size = 15) {
  const t = stack.addText(str)
  t.font = Font.regularMonospacedSystemFont(size)
  t.textColor = TEXT
  return t
}

const now = new Date()
const w = new ListWidget()
const bg = new LinearGradient()
bg.colors = [new Color("#f4f4f4"), new Color("#d9d9d9")]
bg.locations = [0, 1]
w.backgroundGradient = bg
w.setPadding(16, 16, 16, 14)

const df = new DateFormatter()
df.dateFormat = "EEE"
addLabel(w, df.string(now))
w.addSpacer(6)

if (DOT_MATRIX) {
  const img = w.addImage(drawDotText(timeString(now), 3.6, 2.9))
  img.imageSize = new Size(37 * 3.6, 7 * 3.6)
  // Ask for a redraw at the next minute; iOS treats this as a hint
  const next = new Date(now)
  next.setSeconds(60, 0)
  w.refreshAfterDate = next
} else {
  const t = w.addDate(now)
  t.applyTimeStyle()
  t.font = Font.boldMonospacedSystemFont(26)
  t.textColor = RED
}

w.addSpacer(6)
df.dateFormat = "MMMM"
addLabel(w, df.string(now))
addLabel(w, ordinal(now.getDate()))

if (config.runsInWidget) {
  Script.setWidget(w)
} else {
  await w.presentSmall()
}
Script.complete()
