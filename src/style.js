
const defaults = {
  fillStyle: null,
  strokeStyle: null,
  lineWidth: 1,
  lineCap: 'butt',
  lineJoin: 'miter',
  miterLimit: 10.0,
  lineDash: [],
  lineDashOffset: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowBlur: 0,
  shadowColor: 'transparent',
  fill: 'nonzero',
  font: 'sans-serif',
  textAlign: 'start',
  textBaseline: 'alphabetic',
  direction: 'inherit'
}

function palletteToPainter(options) {
  let pallette = {...defaults, ...options}
  function painter(context, path) {
    context.lineWidth = pallette.lineWidth
    context.lineCap = pallette.lineCap
    context.lineJoin = pallette.lineJoin
    context.miterLimit = pallette.miterLimit
    context.setLineDash(pallette.lineDash)
    context.lineDashOffset = pallette.lineDashOffset
    context.font = pallette.font
    context.textAlign = pallette.textAlign
    context.textBaseline = pallette.textBaseline
    context.direction = pallette.direction
    context.shadowOffsetX = pallette.shadowOffsetX
    context.shadowOffsetY = pallette.shadowOffsetY
    context.shadowBlur = pallette.shadowBlur
    context.shadowColor = pallette.shadowColor
    context.fillStyle = pallette.fillStyle
    context.strokeStyle = pallette.strokeStyle

    if (path.text) {
      if (pallette.fillStyle) context.fillText(path.text, path.x, path.y, path.maxWidth)
      if (pallette.strokeStyle) context.strokeText(path.text, path.x, path.y, path.maxWidth)
    } else {
      if (pallette.fillStyle) context.fill(path)
      if (pallette.strokeStyle) context.stroke(path)
    }
  }

  return painter
}

function linearGradient(context, start, end, stops) {
  let grad = context.createLinearGradient(start.x, start.y, end.x, end.y)
  stops.forEach(({loc, color}) => grad.addColorStop(loc, color))

  return grad
}

function radialGradient(context, start, end, stops) {
  let grad = context.createRadialGradient(start.x, start.y, start.radius, end.x, end.y, end.radius)
  stops.forEach(({loc, color}) => grad.addColorStop(loc, color))

  return grad
}

function pattern(context, url, type) {
  let img = new Image()
  img.src(url)
  let ptrn = context.createPattern(img, type)

  return ptrn
}

function pallettesToPainters (pallettes) {
  let painters = {}
  for (let id in pallettes) {
    let painter = palletteToPainter(pallettes[id])
    painters[id] = painter
  }
  return painters
}

export default {
  linearGradient,
  radialGradient,
  pattern,
  palletteToPainter,
  pallettesToPainters
}
