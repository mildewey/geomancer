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
  if (measure.boxesIntersect(viewport, finalBox)) {
    if (trace) {
      handles.insert(finalBox.min, finalBox.max, trace, measure.generateHitChecker(context, path, transform))
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
        mouse,
        geo,
        end: () => {elem.set("default", {geo, elem})}
      })
    },
    wheel: (mouse, {geo}) => {
      view.mouse.zoom(mouse, geo.camera)
    }
  },
  (state) => state
)

mode(
  "panning",
  {
  	mouseup: (mouse, { end }) => { end() },
  	mouseout: (mouse, { end }) => { end() },
  	mousemove: (mouse, { pan }) => { pan(mouse) },
  },
  ({mouse, geo, end}) => {
    return {
      pan: view.mouse.pan(mouse, geo.camera),
      end
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
