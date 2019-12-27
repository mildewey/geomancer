const measure = require('./measure')
const tracer = require('./tracer')

function generateHitChecker(context, path, transform) {
  return (x, y) => {
    context.save()
    context.setTransform(...transform)
    let inPath = context.isPointInPath(path, x, y)
    context.restore()
    return inPath
  }
}

function paintSubject (course, id, hulls) {
  let subject = course.subjects[id]
  let shape = course.shapes[subject.path]
  let painter = course.painters[subject.pallette]
  if (subject.transform) course.viewport.context.transform(...subject.transform)

  if (subject.receivesEvents) {
    let matrix = course.viewport.context.getTransform()
    let transform = [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]
    let box = {
      ...measure.transformBox(course.boxes[subject.path], transform),
      value: id,
      check: generateHitChecker(course.viewport.context, shape, transform)
    }
    tracer.insert(hulls, box)
  }

  painter(course.viewport.context, shape)
}

function paint (course, scene, hulls) {
  course.viewport.context.transform(...scene.transform)

  scene.subjects.forEach(id => {
    course.viewport.context.save()
    paintSubject(course, id, hulls)
    course.viewport.context.restore()
  })

  scene.layers.forEach(layer => {
    course.viewport.context.save()
    paint(course, layer, hulls)
    course.viewport.context.restore()
  })

  return hulls
}

exports.paint = paint
