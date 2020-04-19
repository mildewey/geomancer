import measure from './measure'
import tracer from './tracer'

function paintSubject (context, course, subject) {
  context.save()
  context.transform(...subject.transform)

  let shape = course.shapes[subject.path]
  let painter = course.painters[subject.pallette]

  painter(context, shape)
  context.restore()
}

function paint (context, course, scene) {
  context.transform(...scene.transform)

  scene.subjects.forEach(id => {
    let subject = course.subjects[id]
    paintSubject(context, course, subject)
  })

  scene.layers.forEach(layer => {
    context.save()
    paint(context, course, layer)
    context.restore()
  })
}

export default {
  paint
}
