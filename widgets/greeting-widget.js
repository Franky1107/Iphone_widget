// Simple greeting + date widget (SMALL size) for Scriptable
let w = new ListWidget()
w.backgroundColor = new Color("#1e1e2e")

let hour = new Date().getHours()
let greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"

let t = w.addText(greet + ", Sourav")
t.font = Font.boldSystemFont(18)
t.textColor = Color.white()

w.addSpacer(6)

let d = w.addDate(new Date())
d.applyDateStyle()
d.font = Font.systemFont(14)
d.textColor = new Color("#a6adc8")

if (config.runsInWidget) {
  Script.setWidget(w)
} else {
  w.presentSmall()
}
Script.complete()
