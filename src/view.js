import events from './events'


function minZoom(geo) {
  const width = geo.camera.area.width
  const height = geo.camera.area.height
  const right = geo.camera.extents.max.x
  const left = geo.camera.extents.min.x
  const top = geo.camera.extents.min.y
  const bottom = geo.camera.extents.max.y

  const possibleMinZoom = [geo.camera.extents.min.zoom]
  if (right !== null && left !== null) possibleMinZoom.push(width/(right-left))
  if (top !== null && bottom !== null) possibleMinZoom.push(height/(bottom-top))
  const minZoom = Math.max(...possibleMinZoom)

  return minZoom
}

function mouseZoom (mouse, geo, speed=1.2) {
  let zoom = geo.camera.transform[0] * (speed ** -Math.sign(mouse.deltaY))
  zoom = zoom > geo.camera.extents.max.zoom ? geo.camera.extents.max.zoom : zoom
  const min = minZoom(geo)
  zoom = zoom < min ? min : zoom
  if (zoom !== geo.camera.transform) {
    let factor = zoom / geo.camera.transform[0]
    let x = mouse.clientX
    let y = mouse.clientY
    geo.camera.transform[4] = x - factor * (x-geo.camera.transform[4])
    geo.camera.transform[5] = y - factor * (y-geo.camera.transform[5])
    geo.camera.transform[0] = zoom
    geo.camera.transform[3] = zoom
    geo.enforceExtents()
  }

  mouse.preventDefault()
  mouse.stopPropagation()
}

export default {
  mouseZoom
}
