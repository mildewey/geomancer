function minZoom({extents, area}) {
  const possibleMinZoom = [extents.min.zoom]
  if (extents.max.x !== null && extents.min.x !== null) possibleMinZoom.push(area.width/(extents.max.x-extents.min.x))
  if (extents.min.y !== null && extents.max.y !== null) possibleMinZoom.push(area.height/(extents.max.y-extents.min.y))
  const minZoom = Math.max(...possibleMinZoom)

  return minZoom
}

function enforceExtents ({area, extents, transform}) {
  let maxX = -extents.min.x
  let minX = area.width - extents.max.x*transform[0]
  let maxY = -extents.min.y
  let minY = area.height - extents.max.y*transform[3]

  if (extents.min.x !== null && transform[4] < minX) transform[4] = minX
  if (extents.max.x !== null && transform[4] > maxX) transform[4] = maxX
  if (extents.min.y !== null && transform[5] < minY) transform[5] = minY
  if (extents.max.y !== null && transform[5] > maxY) transform[5] = maxY
}

function zoom ({transform}, zoom, x=null, y=null) {
  x = x === null ? transform[4] + (area.width / (2 * transform[0])) : x
  y = y === null ? transform[5] + (area.height / (2 * transform[3])) : y
  transform[4] = x - zoom * (x-transform[4]) / transform[0]
  transform[5] = y - zoom * (y-transform[5]) / transform[3]
  transform[0] = zoom
  transform[3] = zoom
}

export default {
  mouse: {
    zoom: (mouse, camera, speed=1.2) => {
      let factor = camera.transform[0] * (speed ** -Math.sign(mouse.deltaY))

      factor = factor > camera.extents.max.zoom ? camera.extents.max.zoom : factor
      const min = minZoom(camera)

      factor = factor < min ? min : factor

      zoom(camera, factor, mouse.clientX, mouse.clientY)
      enforceExtents(camera)

      mouse.preventDefault()
      mouse.stopPropagation()
    },
    pan: (mouse, camera) => {
      let lastX = mouse.clientX
      let lastY = mouse.clientY

      return (mouse) => {
        camera.transform[4] = camera.transform[4] + mouse.clientX - lastX
        camera.transform[5] = camera.transform[5] + mouse.clientY - lastY
        lastX = mouse.clientX
        lastY = mouse.clientY
        enforceExtents(camera)
      }
    }
  }

}
