import tracer from './tracer'
import style from './style'
import measure from './measure'
import view from './view'

const shapes = {}
const styles = {}
const subjects = {}
const renderers = {}
const modes = {}

function renderer(id, func) {
  renderers[id] = (context, subject, assets) => {
    if (subject.visible) {
      context.save()
      context.transform(...(subject.transform))
      func(context, subject.details, assets)
      context.restore()
    }
  }
}

renderer("simple", (context, {shape, style, trace}, {viewport, handles, tome}) => {
  const t = context.getTransform()
  const transform = [t.a, t.b, t.c, t.d, t.e, t.f]
  const {box, path} = tome.shape(shape)
  const finalBox = measure.transformBox(box, transform)
  if (tracer.boxesIntersect(viewport, finalBox)) {
    if (trace) {
      tracer.insert(handles, {...finalBox, value: trace, check: tracer.generateHitChecker(context, path.shape, transform)})
    }
    tome.style(style).painter(context, path)
  }
})

renderer("nested", (context, {subjects}, assets) => {
  subjects.forEach(sub => {
    const subject = assets.tome.subject(sub)
    const render = assets.tome.renderer(subject.renderer)
    render(context, subject, assets)
  })
})

renderer("text", (context, {style, text, x, y, maxWidth}, {tome}) => {
  tome.style(style).painter(context, {text, x, y, maxWidth})
})

function mode(id, controls, init) {
  modes[id] = {
    controls,
    init
  }
}

mode(
  null,
  {},
  () => null
)

mode(
  "default",
  {
    mousedown: (mouse, {geo, elem}) => {
      elem.set("panning", {
        x: mouse.clientX,
        y: mouse.clientY,
        geo,
        elem,
        previousMode: "default",
        previousState: { geo, elem }
      })
    },
    wheel: (mouse, {geo}) => {
      view.mouseZoom(mouse, geo)
    }
  },
  (state) => state
)

mode(
  "panning",
  {
  	mouseup: (mouse, { elem, previousMode, previousState }) => { elem.set(previousMode, previousState) },
  	mouseout: (mouse, { elem, previousMode, previousState }) => { elem.set(previousMode, previousState) },
    mouseenter: (mouse, state) => {
      state.lastX = mouse.clientX
      state.lastY = mouse.clientY
    },
  	mousemove: (mouse, state) => {
      state.geo.camera.transform[4] = state.geo.camera.transform[4] + mouse.clientX - state.lastX
      state.geo.camera.transform[5] = state.geo.camera.transform[5] + mouse.clientY - state.lastY
      state.lastX = mouse.clientX
      state.lastY = mouse.clientY
      state.geo.enforceExtents()
    },
  },
  ({x, y, geo, elem, previousMode, previousState}) => {
    return {
      lastX: x,
      lastY: y,
      geo,
      elem,
      previousMode,
      previousState
    }
  }
)

export default {
  register: {
    shape: (id, instructions) => {
      shapes[id] = {
        instructions,
        path: measure.pathToCanvas(instructions),
        box: measure.pathToBox(instructions)
      }
    },
    style: (id, styling) => {
      styles[id] = {
        styling,
        painter: style.palletteToPainter(styling)
      }
    },
    subject: (id, {renderer, details, visible, transform}) => {
      subjects[id] = {
        renderer,
        details,
        visible,
        transform
      }
    },
    renderer,
    mode,
  },
  shape: (id) => shapes[id],
  style: (id) => styles[id],
  subject: (id) => subjects[id],
  renderer: (id) => renderers[id],
  mode: (id) => modes[id],
  export: () => JSON.stringify({subjects, shapes, styles}),
  import: (json) => {
    imports = JSON.parse(json)
    shapes = {
      ...shapes,
      ...(imports.shapes)
    }
    styles = {
      ...styles,
      ...(imports.styles)
    }
    subjects = {
      ...subjects,
      ...(imports.subjects)
    }
  }
}
