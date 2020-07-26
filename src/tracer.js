function tracer (init = []) { // init is filled with objects that have a min point, a max point, and a value
  const tracer = {
    x: [],
    y: [],
    checks: {},
    order: {}
  }
  let order = 0

  function orderSort(a, b) {
    console.log(a, b, tracer.order[a], tracer.order[b])
    if (tracer.order[a] < tracer.order[b]) return 1
    if (tracer.order[a] > tracer.order[b]) return -1
    return 0
  }

  function sorter (a, b) {
    if (a.index < b.index) return -1
    if (a.index > b.index) return 1
    return 0
  }

  return {
    insert: (min, max, value, check) => {
      tracer.checks[value] = check
      tracer.order[value] = order
      order = order + 1

      tracer.x.push({index: Math.floor(min.x), value})
      tracer.x.push({index: Math.floor(max.x), value})
      tracer.x.sort(sorter)

      tracer.y.push({index: Math.floor(min.y), value})
      tracer.y.push({index: Math.floor(max.y), value})
      tracer.y.sort(sorter)
    },
    intersectPoint: (point) => {
      let active = new Set()
      let x = Math.floor(point.x)
      let y = Math.floor(point.y)

      for (let i in tracer.x) {
        let box = tracer.x[i]
        if (box.index <= x) {
          if (active.has(box.value)) {
            active.delete(box.value)
          } else {
            active.add(box.value)
          }
        } else {
          break
        }
      }

      let xintersects = [...active]
      active = new Set()

      for (let i in tracer.y) {
        let box = tracer.y[i]
        if (box.index <= y) {
          if (active.has(box.value)) {
            active.delete(box.value)
          } else {
            active.add(box.value)
          }
        } else {
          break
        }
      }

      let possibles = [...xintersects].filter(val => active.has(val))
      return possibles.filter(val => tracer.checks[val](point.x, point.y)).sort(orderSort)
    },
    intersectBox: ({min, max}) => {
      let active = new Set()
      let xmin = Math.floor(min.x)
      let xmax = Math.floor(max.x)
      let ymin = Math.floor(min.y)
      let ymax = Math.floor(max.y)

      for (let i in tracer.x) {
        let box = tracer.x[i]
        if (box.index <= xmin) {
          if (active.has(box.value)) {
            active.delete(box.value)
          } else {
            active.add(box.value)
          }
        } else if (box.index <= xmax) {
          active.add(box.value)
        } else {
          break
        }
      }

      let xintersects = [...active]
      active = new Set()

      for (let i in tracer.y) {
        let box = tracer.y[i]
        if (box.index <= ymin) {
          if (active.has(box.value)) {
            active.delete(box.value)
          } else {
            active.add(box.value)
          }
        } else if (box.index <= ymax) {
          active.add(box.value)
        } else {
          break
        }
      }

      return [...xintersects].filter(val => active.has(val)).sort(orderSort)
    }
  }
}

function boxesIntersect(one, two) {
  if (one.max.x < two.min.x) return false
  if (two.max.x < one.min.x) return false
  if (one.max.y < two.min.y) return false
  if (two.max.y < two.max.y) return false
  return true
}

function boxBox(boxes) {
  return {
    max: {
      x: Math.max(...boxes.map(box => box.max.x)),
      y: Math.max(...boxes.map(box => box.max.y))
    },
    min: {
      x: Math.min(...boxes.map(box => box.min.x)),
      y: Math.min(...boxes.map(box => box.min.y))
    }
  }
}

function generateHitChecker(context, path, transform) {
  return (x, y) => {
    context.save()
    context.setTransform(...transform)
    const inPath = context.isPointInPath(path, x, y)
    context.restore()
    return inPath
  }
}

export default {
  tracer,
  boxesIntersect,
  boxBox,
  generateHitChecker,
}
