import measure from './measure'
import tracer from './tracer'

function generateHitChecker(context, path, transform) {
  return (x, y) => {
    context.save()
    context.setTransform(...transform)
    const inPath = context.isPointInPath(path, x, y)
    context.restore()
    return inPath
  }
}

function makeHull(context, course, id, boxes) {
  const subject = course.subjects[id]
  if (subject.handle) {
    context.save()
    const matrix = context.getTransform()
    const transform = [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]
    context.transform(...subject.transform)

    const shape = course.shapes[subject.path]
    const check = generateHitChecker(context, shape, transform)
    const box = !boxes[subject.path] ? measure.pathToBox(course.paths[subject.path]) : boxes[subject.path]

    context.restore()
    return {
      ...measure.transformBox(box, transform),
      value: id,
      check
    }
  }

}

function hulls(context, course, scene, boxes={}, hitChecker=tracer.tracer()) {
  context.save()

  context.transform(...scene.transform)

  scene.subjects.forEach(id => {
    const hull = makeHull(context, course, id, boxes)
    if (hull) {
      tracer.insert(hitChecker, hull)
    }
  })

  scene.layers.forEach(layer => {
    hulls(context, course, layer, boxes, hitChecker)
  })

  context.restore()

  return hitChecker
}

export default {
  hulls
}
