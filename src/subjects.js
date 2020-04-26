import measure from './measure'

function order (layer, subjects = []) {
  layer.subjects.forEach(subject => {
		subjects.push(subject.id)
  })

  layer.layers.forEach(subLayer => {
    order(subLayer, subjects)
  })

  return subjects
}


function resolve (transform, layer, subjects = {}) {
  const layerTransform = measure.applyTransform(transform, layer.transform)

  layer.subjects.forEach(subject => {
		let subjectTransform = measure.applyTransform(layerTransform, subject.transform)
		subjects[subject.id] = {
      ...subject,
      transform: subjectTransform
    }
  })

  layer.layers.forEach(subLayer => {
    resolve(reference, layerTransform, subLayer, subjects)
  })

  return subjects
}


export default {
  order,
  resolve
}
