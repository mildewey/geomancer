import events from './events'

const lastX = {}
const lastY = {}
const isPanning = {}

function enforceBoundaries (width, height, extents, transform) {
  let zoom = transform[0]
  let x = transform[4]
  let y = transform[5]
  let maxX = -extents.left*zoom
  let minX = width-extents.right*zoom
  let maxY = -extents.top*zoom
  let minY = height-extents.bottom*zoom

  if (x < minX) transform[4] = minX
  if (x > maxX) transform[4] = maxX
  if (y < minY) transform[5] = minY
  if (y > maxY) transform[5] = maxY
}

function stableZoom ( x, y, zoom, transform ) {
  let target = [...transform]
  target[0] = zoom
  target[3] = zoom
  let factor = zoom/transform[0]
  target[4] = x - factor * (x-transform[4])
  target[5] = y - factor * (y-transform[5])
  return target
}

function startPanning (mouse) {
  lastX[mouse.target.id] = mouse.clientX
  lastY[mouse.target.id] = mouse.clientY
  isPanning[mouse.target.id] = true
}

function panning (mouse, width, height, extents, transform) {
  if (!isPanning[mouse.target.id]) {
    return transform
  }
  let target = [...transform]
  target[4] = transform[4] + mouse.clientX - lastX[mouse.target.id]
  target[5] = transform[5] + mouse.clientY - lastY[mouse.target.id]
  lastX[mouse.target.id] = mouse.clientX
  lastY[mouse.target.id] = mouse.clientY
  enforceBoundaries(width, height, extents, target)
  events.transforms[mouse.target.id].set(target)
}

function stopPanning (mouse) {
  isPanning[mouse.target.id] = false
}

function zooming (mouse, width, height, extents, transform) {
  let delta = -Math.sign(mouse.deltaY)
  let zoom = transform[0] * (1.2 ** delta)
  let minZoom = Math.max(
    width/(extents.right - extents.left),
    height/(extents.bottom - extents.top),
    0.5
  )
  if (zoom > 5) zoom = 5
  if (zoom < minZoom) zoom = minZoom

  let target = stableZoom(mouse.offsetX, mouse.offsetY, zoom, transform)
  enforceBoundaries(width, height, extents, target)

  mouse.preventDefault()
  mouse.stopPropagation()
  events.transforms[mouse.target.id].set(target)
}

export default {
  enforceBoundaries,
  stableZoom,
  startPanning,
  panning,
  stopPanning,
  zooming,
}
