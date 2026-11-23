// Photo widget (MEDIUM size, rectangular) for Scriptable
// Shows your photos one at a time, switching to the next one on each refresh.
//
// Scriptable can't read a Photos album, so the widget uses a folder instead:
//   Files app → iCloud Drive → Scriptable → photo-widget
// Save photos into that folder (in Photos: select → Share → Save to Files),
// then run this script once in Scriptable so it can prepare them.

const ROTATE_MINUTES = 15 // how often to switch; iOS may refresh later than this
const IMAGE_EXT = /\.(jpe?g|png|heic|heif)$/i

// iCloud so the folder shows up in the Files app; local if iCloud Drive is off
let fm
try { fm = FileManager.iCloud() } catch (e) { fm = FileManager.local() }
const dir = fm.joinPath(fm.documentsDirectory(), "photo-widget")
const small = fm.joinPath(dir, "prepared") // shrunk copies the widget actually shows
if (!fm.fileExists(small)) fm.createDirectory(small, true)

// Shrink big photos so the widget stays within its memory limit
function resize(img, width) {
  if (img.size.width <= width) return img
  const height = img.size.height * width / img.size.width
  const dc = new DrawContext()
  dc.size = new Size(width, height)
  dc.respectScreenScale = false
  dc.drawImageInRect(img, new Rect(0, 0, width, height))
  return dc.getImage()
}

// iCloud files may only be stubs on this phone until downloaded
async function ensureLocal(path) {
  if (fm.isFileStoredIniCloud(path)) await fm.downloadFileFromiCloud(path)
}

function listPhotos() {
  return fm.listContents(small).filter(f => f.endsWith(".jpg")).sort()
}

// Same photo for the whole time slot, next photo in the next slot
function pickIndex(count, now) {
  return Math.floor(now / (ROTATE_MINUTES * 60 * 1000)) % count
}

// Make a shrunk copy of every photo in the folder that doesn't have one yet.
// Full-size photos are too big for a widget, so this runs in the app, not the widget.
async function preparePhotos() {
  let added = 0
  for (const name of fm.listContents(dir)) {
    if (!IMAGE_EXT.test(name)) continue
    const target = fm.joinPath(small, name.replace(IMAGE_EXT, "") + ".jpg")
    if (fm.fileExists(target)) continue
    const src = fm.joinPath(dir, name)
    await ensureLocal(src)
    const img = fm.readImage(src)
    if (!img) continue
    fm.writeImage(target, resize(img, 1000))
    added++
  }
  // Drop copies whose original was deleted from the folder
  const originals = new Set(fm.listContents(dir).filter(n => IMAGE_EXT.test(n)).map(n => n.replace(IMAGE_EXT, "")))
  for (const f of listPhotos()) {
    if (!f.startsWith("picked-") && !originals.has(f.replace(/\.jpg$/, ""))) fm.remove(fm.joinPath(small, f))
  }
  return added
}

// Photos saved by older versions of this script (stored on the phone only)
function migrateOld() {
  const local = FileManager.local()
  const oldDir = local.joinPath(local.documentsDirectory(), "photo-widget")
  const files = [local.joinPath(local.documentsDirectory(), "photo-widget.jpg")]
  if (local.fileExists(oldDir) && local.isDirectory(oldDir)) {
    local.listContents(oldDir).forEach(f => files.push(local.joinPath(oldDir, f)))
  }
  for (const f of files) {
    if (!f.endsWith(".jpg") || !local.fileExists(f) || local.isDirectory(f)) continue
    const img = local.readImage(f)
    if (img) fm.writeImage(fm.joinPath(small, `picked-${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`), img)
    local.remove(f)
  }
}

async function menu() {
  const a = new Alert()
  a.title = "Photo widget"
  a.message = `${listPhotos().length} photo(s) ready.\nAdd more by saving photos to Files → iCloud Drive → Scriptable → photo-widget.`
  a.addAction("Pick one photo")
  a.addAction("Preview widget")
  a.addDestructiveAction("Remove all photos from widget")
  a.addCancelAction("Done")
  const choice = await a.presentSheet()
  if (choice === 0) {
    try {
      const img = await Photos.fromLibrary()
      fm.writeImage(fm.joinPath(small, `picked-${Date.now()}.jpg`), resize(img, 1000))
    } catch (e) {} // picker cancelled
    return menu()
  }
  if (choice === 2) {
    listPhotos().forEach(f => fm.remove(fm.joinPath(small, f)))
    fm.listContents(dir).filter(n => IMAGE_EXT.test(n)).forEach(n => fm.remove(fm.joinPath(dir, n)))
  }
}

if (!config.runsInWidget) {
  migrateOld()
  const added = await preparePhotos()
  if (added) {
    const n = new Alert()
    n.title = `Added ${added} photo(s) from the folder`
    n.addAction("OK")
    await n.present()
  }
  await menu()
}

const photos = listPhotos()
const w = new ListWidget()
w.backgroundColor = Color.black()
w.refreshAfterDate = new Date(Date.now() + ROTATE_MINUTES * 60 * 1000)

if (photos.length) {
  const path = fm.joinPath(small, photos[pickIndex(photos.length, Date.now())])
  await ensureLocal(path)
  w.backgroundImage = fm.readImage(path) // fills and crops to the widget
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
