const validate = {
  moveTo: params => params.length === 2 ? 'moveTo must have 2 parameters' : null,
  lineTo: params => params.length === 2 ? 'lineTo must have 2 parameters' : null,
  bezierCurveTo: params => params.length === 6 ? 'bezierCurveTo must have 6 parameters' : null,
  quadraticCurveTo: params => params.length === 4 ? 'quadraticCurveTo must have 4 parameters' : null,
  arc: params => (params.length === 5 || params.length === 6) ? 'arc must have 5 or 6 parameters' : null,
  arcTo: params => params.length === 5 ? 'arcTo must have 5 parameters' : null,
  ellipse: params => (params.length === 7 || params.length === 8) ? 'ellipse must have 7 or 8 parameters' : null,
  rect: params => params.length === 4 ? 'rect must have 4 parameters' : null,
  closePath: params => params.length === 0 ? 'closePath must have 0 parameters' : null
}

const subBox = {
  moveTo: (x, y) => ({
    xmin: x,
    ymin: y,
    xmax: x,
    ymax: y
  }),
  lineTo: (x, y) => ({
    xmin: x,
    ymin: y,
    xmax: x,
    ymax: y
  }),
  bezierCurveTo: (cp1x, cp1y, cp2x, cp2y, x, y) => ({
    xmin: Math.min(cp1x, cp2x, x),
    ymin: Math.min(cp1y, cp2y, y),
    xmax: Math.max(cp1x, cp2x, x),
    ymax: Math.max(cp1y, cp2y, y)
  }),
  quadraticCurveTo: (cpx, cpy, x, y) => ({
    xmin: Math.min(cpx, x),
    ymin: Math.min(cpy, y),
    xmax: Math.max(cpx, x),
    ymax: Math.max(cpy, y)
  }),
  arc: (x, y, radius) => ({
    xmin: x-radius,
    ymin: y-radius,
    xmax: x+radius,
    ymax: y+radius
  }),
  arcTo: (x1, y1, x2, y2) => ({
    xmin: Math.min(x1, x2),
    ymin: Math.min(y1, y2),
    xmax: Math.max(x1, x2),
    ymax: Math.max(y1, y2)
  }),
  ellipse: (x, y, radiusX, radiusY) => ({
    xmin: Math.min(x-radiusX, x-radiusY),
    ymin: Math.min(y-radiusY, y-radiusY),
    xmax: Math.max(x+radiusX, x+radiusX),
    ymax: Math.max(y+radiusY, y+radiusY)
  }),
  rect: (x, y, width, height) => ({
    xmin: x,
    ymin: y,
    xmax: x+width,
    ymax: y+height
  })
}

function pathToBox(path) {
  if (!path.length) return null

  let xmins = []
  let ymins = []
  let xmaxs = []
  let ymaxs = []
  path.forEach(subpath => {
    if (subpath[0] in subBox) {
      let box = subBox[subpath[0]](...subpath.slice(1))
      xmins.push(box.xmin)
      ymins.push(box.ymin)
      xmaxs.push(box.xmax)
      ymaxs.push(box.ymax)
    }
  })

  let box = {
    min: {
      x: Math.min(...xmins),
      y: Math.min(...ymins)
    },
    max: {
      x: Math.max(...xmaxs),
      y: Math.max(...ymaxs)
    }
  }

  return box
}

function transformBox({min, max}, transform) {
  let xmin = Math.min(
    transformX(min.x, min.y, transform),
    transformX(min.x, max.y, transform),
    transformX(max.x, min.y, transform),
    transformX(max.x, max.y, transform)
  )
  let xmax = Math.max(
    transformX(min.x, min.y, transform),
    transformX(min.x, max.y, transform),
    transformX(max.x, min.y, transform),
    transformX(max.x, max.y, transform)
  )
  let ymin = Math.min(
    transformY(min.x, min.y, transform),
    transformY(min.x, max.y, transform),
    transformY(max.x, min.y, transform),
    transformY(max.x, max.y, transform)
  )
  let ymax = Math.max(
    transformY(min.x, min.y, transform),
    transformY(min.x, max.y, transform),
    transformY(max.x, min.y, transform),
    transformY(max.x, max.y, transform)
  )

  return {
    min: {x: xmin, y: ymin},
    max: {x: xmax, y: ymax}
  }
}

function transformX(x, y, transform) {
  return x*transform[0]+y*transform[2]+transform[4]
}

function transformY(x, y, transform) {
  return y*transform[1]+x*transform[3]+transform[5]
}

function pathToCanvas(path) {
  if (path.text) return path
  if (!path.length) return null

  let p2d = new Path2D()
  path.forEach(subpath => {
    console.log(subpath)
    p2d[subpath[0]](...subpath.slice(1))
  })

  return p2d
}

function pathValidate(path) {
  if (!path.length) return 'Paths must have at least 1 instruction'

  let errors = []
  path.forEach(subpath => {
    let error = validate[subpath[0]](subpath.slice(1))
    if (error) errors.push(error)
  })

  return errors
}

function pathsToShapes (paths) {
  let shapes = {}
  for (let id in paths) {
    let shape = pathToCanvas(paths[id])
    shapes[id] = shape
  }
  return shapes
}

function pathsToBoxes (paths) {
  let boxes = {}
  for (let id in paths) {
    let box = pathToBox(paths[id])
    boxes[id] = box
  }
  return boxes
}

function applyTransform (base, apply) {
  return [
    base[0]*apply[0] + base[2]*apply[1],
    base[1]*apply[0] + base[3]*apply[1],
    base[0]*apply[2] + base[2]*apply[3],
    base[1]*apply[2] + base[3]*apply[3],
    base[0]*apply[4] + base[2]*apply[5] + base[4],
    base[1]*apply[4] + base[3]*apply[5] + base[5],
  ]
}

export default {
  pathsToShapes,
  pathToBox,
  transformBox,
  pathToCanvas,
  pathValidate,
  applyTransform
}
