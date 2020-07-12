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

function stableZoom (x, y, zoom, transform) {
  let target = [...transform]
  target[0] = zoom
  target[3] = zoom
  let factor = zoom/transform[0]
  target[4] = x - factor * (x-transform[4])
  target[5] = y - factor * (y-transform[5])
  return target
}

function startPanning (mouse, context) {
  lastX[context.element.id] = mouse.clientX
  lastY[context.element.id] = mouse.clientY
  isPanning[context.element.id] = true
}

function panning (mouse, context) {
  if (!isPanning[context.element.id]) {
    return;
  }
  let transform = context.transform
  let target = [...$transform]
  target[4] = transform[4] + mouse.clientX - lastX[context.element.id]
  target[5] = transform[5] + mouse.clientY - lastY[context.element.id]
  lastX[context.element.id] = mouse.clientX
  lastY[context.element.id] = mouse.clientY
  enforceBoundaries(width, height, extents, target)
  context.transform.set(target)
}

function stopPanning (mouse, node) {
  isPanning[node.id] = false
}

function zooming (mouse, node, width, height, extents, transform) {
  console.log(width, height, extents, transform)
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
  console.log(target)
  node.dispatchEvent(new CustomEvent("panZoomRotate", {transform: target}))
}

export default {
  enforceBoundaries,
  stableZoom,
  startPanning,
  panning,
  stopPanning,
  zooming,
}
