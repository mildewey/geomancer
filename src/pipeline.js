import { writable, derived, get } from 'svelte/store';
import style from './style'
import measure from './measure'
import tracer from './tracer'
import { v4 as uuidv4 } from 'uuid';


function path(instructions) {
  const pathStore = writable(instructions)
  let shapeStore = derived(pathStore, instructions =>({
    shape: measure.pathToCanvas(instructions),
    box: measure.pathToBox(instructions),
    instructions: instructions
  }))

  return {
    set: newInstructions => pathStore.set(newInstructions),
    subscribe: callback => shapeStore.subscribe(callback)
  }
}

function pallette(styling) {
  const palletteStore = writable(styling)
  let painterStore = derived(palletteStore, styling => ({
    draw: style.palletteToPainter(styling),
    styling
  }))

  return {
    set: newStyle => palletteStore.set(newStyle),
    subscribe: callback => painterStore.subscribe(callback)
  }
}

function resetStore(store, subscribers) {
  subscribers.forEach(sub => {
    sub.unsubscribe = store.subscribe(sub.callback)
  })
  return store
}

function subscription(store, subscribers, callback) {
  const index = uuidv4()
  const unsubscribe = store.subscribe(callback)
  subscribers[index] = {callback, unsubscribe}

  return () => {
    subscribers[index].unsubscribe()
    delete subscribers[index]
  }
}

function pattern(path, pallette) {
  function reaction([path, pallette]) {
    return {
      draw: context => pallette.draw(context, path.shape),
      path,
      pallette
    }
  }

  let store = derived([path, pallette], reaction)
  const subscribers = {}

  return {
    set: (newPath, newPallette) => {
      path = newPath
      pallette = newPallette
      store = resetStore(derived([path, pallette], reaction), subscribers)
    },
    setPath: (newPath) => {
      path = newPath
      store = resetStore(derived([path, pallette], reaction), subscribers)
    },
    setPallette: (newPallette) => {
      pallette = newPallette
      store = resetStore(derived([path, pallette], reaction), subscribers)
    },
    subscribe: (callback) => {
      return subscription(store, subscribers, callback)
    }
  }
}

function subject(pattern, transform, visible, trace=null) {
  const transformStore = writable(transform)
  const visibleStore = writable(visible)

  function reaction([pattern, transform, visible]) {
    return {
      draw: (context, viewport, hull) => {
        context.save()
        context.transform(...transform)
        const t = context.getTransform()
        const currentTransform = [t.a, t.b, t.c, t.d, t.e, t.f]
        const subjectBox = measure.transformBox(pattern.path.box, currentTransform)
        if (trace) {
          tracer.insert(hull, {...subjectBox, value: trace, check: tracer.generateHitChecker(context, pattern.path.shape, currentTransform)})
        }
        if (visible && tracer.boxesIntersect(viewport, subjectBox)) {
          pattern.draw(context)
          context.restore()
        }
      },
      pattern,
      transform,
      visible
    }
  }

  let store = derived([pattern, transformStore, visibleStore], reaction)
  const subscribers = {}

  return {
    set: (newPattern, newTransform, newVisible) => {
      subscribers.forEach(sub => {sub.unsubscribe()})
      const newStore = derived([newPattern, transformStore, visibleStore], reaction)
      transformStore.set(newTransform)
      visibleStore.set(newVisible)
      store = resetStore(newStore, subscribers)
    },
    setTransform: (newTransform) => {
      transformStore.set(newTransform)
    },
    setVisible: (newVisible) => {
      visibleStore.set(newVisible)
    },
    setPattern: (newPattern) => {
      subscribers.forEach(sub => {sub.unsubscribe()})
      store = resetStore(derived([newPattern, transformStore, visibleStore], reaction))
    },
    subscribe: (callback) => {
      return subscription(store, subscribers, callback)
    }
  }
}

function frame(subjects, transform, visible) {
  const transformStore = writable(transform)
  const visibleStore = writable(visible)

  function reaction([transform, visible, ...subjects]) {
    return {
      draw: (context, viewport, hull) => {
        if (visible) {
          context.save()
          context.transform(...transform)
          subjects.forEach(subject => subject.draw(context, viewport, hull))
          context.restore()
        }
      },
      transform,
      visible,
      subjects
    }
  }

  let store = derived([transformStore, visibleStore, ...subjects], reaction)
  const subscribers = {}

  return {
    set: (newSubjects, newTransform, newVisible) => {
      subscribers.forEach(sub => {sub.unsubscribe()})
      const newStore = derived([transformStore, visibleStore, ...newSubjects], reaction)
      transformStore.set(newTransform)
      visibleStore.set(newVisible)
      store = resetStore(newStore, subscribers)
    },
    setTransform: (newTransform) => {
      transformStore.set(newTransform)
    },
    setVisible: (newVisible) => {
      visibleStore.set(newVisible)
    },
    setSubjects: (newSubjects) => {
      subscribers.forEach(sub => {sub.unsubscribe()})
      const newStore = derived([transformStore, visibleStore, ...newSubjects], reaction)
      store = resetStore(newStore, subscribers)
    },
    subscribe: (callback) => {
      return subscription(store, subscribers, callback)
    }
  }
}

function camera(subjects, transform, width, height) {
  const transformStore = writable(transform)
  const widthStore = writable(width)
  const heightStore = writable(height)
  let hull = tracer.tracer()

  function reaction([transform, width, height, ...subjects]) {
    const viewport = measure.transformBox({min: {x: 0, y: 0}, max: {x: width, y: height}}, transform)
    return {
      draw: (context) => {
        context.setTransform(...transform)
        context.save()
        hull = tracer.tracer()
        subjects.forEach(subject => subject.draw(context, viewport, hull))
        context.restore()
        return hull
      },
      transform,
      width,
      height,
      subjects,
      itemsAt: (x, y) => {
        return tracer.intersectPoint(hull, {x, y})
      }
    }
  }

  let store = derived([transformStore, widthStore, heightStore, ...subjects], reaction)
  const subscribers = {}

  return {
    set: (newLayers, newTransform, newWidth, newHeight) => {
      subscribers.forEach(sub => {sub.unsubscribe()})
      const newStore = derived([transformStore, widthStore, heightStore, ...newSubjects], reaction)
      widthStore.set(newWidth)
      heightStore.set(newHeight)
      transformStore.set(newTransform)
      store = resetStore(newStore, subscribers)
    },
    setTransform: (newTransform) => {
      transformStore.set(newTransform)
    },
    setWidth: (newWidth) => {
      widthStore.set(newWidth)
    },
    setHeight: (newHeight) => {
      heightStore.set(newHeight)
    },
    setSubjects: (newSubjects) => {
      subscribers.forEach(sub => {sub.unsubscribe()})
      const newStore = derived([transformStore, widthStore, heightStore, ...newSubjects], reaction)
      store = resetStore(newStore, subscribers)
    },
    subscribe: (callback) => {
      return subscription(store, subscribers, callback)
    },
  }
}

export {
  path,
  pallette,
  pattern,
  subject,
  frame,
  camera
}
