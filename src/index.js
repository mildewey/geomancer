const _ = require('lodash')

const style = require('./style')
const scene = require('./scene')
const measure = require('./measure')
const tracer = require('./tracer')

function update (plan) {
  plan.viewport.context.setTransform(1, 0, 0, 1, 0, 0)
  plan.viewport.context.clearRect(
    0, 0,
    plan.viewport.context.canvas.clientWidth,
    plan.viewport.context.canvas.clientHeight
  )
  let hitchecker = scene.paint(plan, plan.scene, tracer.tracer())
  return (x, y) => tracer.intersectPoint(hitchecker, {x, y})
}

function viewport (id) {
  let el = document.getElementById(id)
  return {
    context: el.getContext('2d'),
    hitbox: tracer.tracer([{
    min: {x: 0, y: 0},
    max: {x: el.clientWidth, y: el.clientHeight},
    value: 'visible'
    }])
  }
}

function defaultTransform () {
  return [1, 0, 0, 1, 0, 0]
}
  
function emptyScene () {
  return {
    transform: defaultTransform(),
    subjects: [], // list of ids into the subjects dict
    layers: [] // list of nested scene objects
  }
}
  
function emptyCourse () {
  return {
    paths: {}, // step by step instructions for how to build shapes (pathid)
    shapes: {}, // the fully realized shapes built from paths (pathid)
    boxes: {}, // bounding boxes for the shapes (pathid)
    pallettes: {}, // itemized descriptions of coloring, etc (palletteid)
    painters: {}, // functions built from pallettes that can take a shape and pallette and draw it (palletteid)
    subjects: {}, // a path, transform, painter, and flag for triggering events (subjectid)
    scene: emptyScene(), //nested lists of subjects to be drawn with corresponding transforms
    viewport: {} // the context and a hit box for what is visible
  }
}

function pathsToShapes (paths) {
  let shapes = {}
  for (let id in paths) {
    let shape = measure.pathToCanvas(paths[id])
    shapes[id] = shape
  }
  return shapes
}

function pathsToBoxes (paths) {
  let boxes = {}
  for (let id in paths) {
    let box = measure.pathToBox(paths[id])
    boxes[id] = box
  }
  return boxes
}

function pallettesToPainters (pallettes) {
  let painters = {}
  for (let id in pallettes) {
    let painter = style.palletteToPainter(pallettes[id])
    painters[id] = painter
  }
  return painters
}

exports.update = update
exports.viewport = viewport
exports.defaultTransform = defaultTransform
exports.emptyScene = emptyScene
exports.emptyCourse = emptyCourse
exports.pathsToShapes = pathsToShapes
exports.pathsToBoxes = pathsToBoxes
exports.pallettesToPainters = pallettesToPainters