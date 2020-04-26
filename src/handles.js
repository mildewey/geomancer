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

function makeHull(context, course, id) {
  const subject = course.subjects[id]
  if (subject.handle) {
    context.save()
    context.transform(...subject.transform)

    const matrix = context.getTransform()
    const transform = [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]

    const shape = course.shapes[subject.path]
    const check = generateHitChecker(context, shape, transform)
    const box = course.boxes[subject.path]

    context.restore()
    return {
      ...measure.transformBox(box, transform),
      value: id,
      check
    }
  }

}

function hulls(context, course, scene, hitChecker=tracer.tracer()) {
  context.save()

  context.transform(...scene.transform)

  scene.subjects.forEach(id => {
    const hull = makeHull(context, course, id)
    if (hull) {
      tracer.insert(hitChecker, hull)
    }
  })

  scene.layers.forEach(layer => {
    hulls(context, course, layer, hitChecker)
  })

  context.restore()

  return hitChecker
}

export default {
  hulls
}
