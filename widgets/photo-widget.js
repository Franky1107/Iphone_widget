// Photo widget (MEDIUM size, rectangular) for Scriptable
// Shows your photos one at a time, switching to the next one on each refresh.
// Run the script inside Scriptable to add or remove photos.

const ROTATE_MINUTES = 15 // how often to switch; iOS may refresh later than this

const fm = FileManager.local()
const dir = fm.joinPath(fm.documentsDirectory(), "photo-widget")
if (!fm.fileExists(dir)) fm.createDirectory(dir)

// Move the photo saved by the old single-photo version into the folder
const oldPath = fm.joinPath(fm.documentsDirectory(), "photo-widget.jpg")
if (fm.fileExists(oldPath)) fm.move(oldPath, fm.joinPath(dir, `${Date.now()}.jpg`))

function listPhotos() {
  return fm.listContents(dir).filter(f => f.endsWith(".jpg")).sort()
}

// Same photo for the whole time slot, next photo in the next slot
function pickIndex(count, now) {
  return Math.floor(now / (ROTATE_MINUTES * 60 * 1000)) % count
}

// Shrink big photos so the widget stays within its memory limit
function resize(img, width) {
  const height = img.size.height * width / img.size.width
  const dc = new DrawContext()
  dc.size = new Size(width, height)
  dc.respectScreenScale = false
  dc.drawImageInRect(img, new Rect(0, 0, width, height))
  return dc.getImage()
}

async function menu() {
  const a = new Alert()
  a.title = "Photo widget"
  a.message = `${listPhotos().length} photo(s) saved`
  a.addAction("Add photo")
  a.addAction("Preview widget")
  a.addDestructiveAction("Remove all photos")
  a.addCancelAction("Done")
  const choice = await a.presentSheet()
  if (choice === 0) {
    try {
      const img = await Photos.fromLibrary()
      fm.writeImage(fm.joinPath(dir, `${Date.now()}.jpg`), resize(img, 1000))
    } catch (e) {} // picker cancelled
    return menu() // add another, or finish
  }
  if (choice === 2) listPhotos().forEach(f => fm.remove(fm.joinPath(dir, f)))
}

if (!config.runsInWidget) await menu() // then shows a preview

const photos = listPhotos()
const w = new ListWidget()
w.backgroundColor = Color.black()
w.refreshAfterDate = new Date(Date.now() + ROTATE_MINUTES * 60 * 1000)

if (photos.length) {
  const file = photos[pickIndex(photos.length, Date.now())]
  w.backgroundImage = fm.readImage(fm.joinPath(dir, file)) // fills and crops to the widget
} else {
  const t = w.addText("Open Scriptable and run this script to add photos")
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
