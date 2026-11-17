// Photo widget (MEDIUM size, rectangular) for Scriptable
// Run the script inside Scriptable to choose a photo from your library.

const fm = FileManager.local()
const photoPath = fm.joinPath(fm.documentsDirectory(), "photo-widget.jpg")

// Shrink big photos so the widget stays within its memory limit
function resize(img, width) {
  const height = img.size.height * width / img.size.width
  const dc = new DrawContext()
  dc.size = new Size(width, height)
  dc.respectScreenScale = false
  dc.drawImageInRect(img, new Rect(0, 0, width, height))
  return dc.getImage()
}

if (!config.runsInWidget) {
  try {
    const img = await Photos.fromLibrary()
    fm.writeImage(photoPath, resize(img, 1000))
  } catch (e) {} // picker cancelled: keep the current photo
}

const w = new ListWidget()
w.backgroundColor = Color.black()
if (fm.fileExists(photoPath)) {
  w.backgroundImage = fm.readImage(photoPath) // fills and crops to the widget
} else {
  const t = w.addText("Open Scriptable and run this script to choose a photo")
  t.font = Font.mediumSystemFont(13)
  t.textColor = Color.white()
  t.centerAlignText()
}

if (config.runsInWidget) {
  Script.setWidget(w)
} else {
  await w.presentMedium()
}
Script.complete()
