import events from './events'


const lastX = {}
const lastY = {}
const isPanning = {}

function enforceBoundaries (width, height, transform, extents, maxZoom=null) {
  let zoom = transform[0]
  let minZoom = Math.max(width/(extents.right-extents.left), height/(extents.bottom-extents.top))

  if (zoom < minZoom) {
    zoom = minZoom
  } else if (maxZoom && zoom > maxZoom) {
    zoom = maxZoom
  }
  transform[0] = zoom
  transform[3] = zoom

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

function stableZoom (x, y, zoom, transform) {
  let target = [...transform]
  target[0] = zoom
  target[3] = zoom
  let factor = zoom/transform[0]
  target[4] = x - factor * (x-transform[4])
  target[5] = y - factor * (y-transform[5])
  return target
}

function startPanning (x, y, id) {
  lastX[id] = x
  lastY[id] = y
  isPanning[id] = true
}

function panning (x, y, transform, id) {
  if (!isPanning[id]) {
    return transform;
  }
  let target = [...transform]
  target[4] = transform[4] + x - lastX[id]
  target[5] = transform[5] + y - lastY[id]
  lastX[id] = x
  lastY[id] = y
  return target
}

function stopPanning (id) {
  isPanning[id] = false
}

function mouseZoom (mouse, transform, speed=1.2) {
  let zoom = transform[0] * (speed ** -Math.sign(mouse.deltaY))
  mouse.preventDefault()
  mouse.stopPropagation()

  return stableZoom(mouse.offsetX, mouse.offsetY, zoom, transform)
}

export default {
  enforceBoundaries,
  stableZoom,
  startPanning,
  panning,
  stopPanning,
  mouseZoom
}
