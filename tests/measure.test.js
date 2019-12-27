import test from 'ava'
import measure from '../src/measure'

test('pathToBox returns reasonable boxes.', t => {
  const path = [
    ['moveTo', 2.5, 43.3],
    ['lineTo', 26.25, 84.77],
    ['lineTo', 73.75, 84.77],
    ['lineTo', 97.5, 43.3],
    ['lineTo', 73.75, 2.165],
    ['lineTo', 26.25, 2.165],
    ['closePath'],
  ]
  t.deepEqual(measure.pathToBox(path), {
    min: {
      x: 2.5,
      y: 2.165,
    },
    max: {
      x: 97.5,
      y: 84.77
    }
  })
})