import measure from './measure'
import tracer from './tracer'

function generateHitChecker(context, path, transform) {
  return (x, y) => {
    context.save()
    context.setTransform(...transform)
    let inPath = context.isPointInPath(path, x, y)
    context.restore()
    return inPath
  }
}

function paintSubject (context, course, id, hulls) {
  let subject = course.subjects[id]
  let shape = course.shapes[subject.path]
  let painter = course.painters[subject.pallette]
  if (subject.transform) context.transform(...subject.transform)

  if (subject.receivesEvents) {
    let matrix = context.getTransform()
    let transform = [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]
    let box = {
      ...measure.transformBox(course.boxes[subject.path], transform),
      value: id,
      check: generateHitChecker(context, shape, transform)
    }
    tracer.insert(hulls, box)
  }

  painter(context, shape)
}

function paint (context, course, scene, hulls) {
  context.transform(...scene.transform)

  scene.subjects.forEach(id => {
    context.save()
    paintSubject(context, course, id, hulls)
    context.restore()
  })

  scene.layers.forEach(layer => {
    context.save()
    paint(context, course, layer, hulls)
    context.restore()
  })

  return hulls
}

export default {
  paint
}
