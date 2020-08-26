import measure from './measure'
import tracer from './tracer'
import tome from './tome'
import elemental from './elemental'


export default function (canvas) {
  const geomancer = {
    transform: [1, 0, 0, 1, 0, 0],
    scene: [],
    canvas,
    tracer: tracer()
  }

  geomancer.render = function () {
    const context = geomancer.canvas.getContext('2d')
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, geomancer.canvas.width, geomancer.canvas.height)
    context.setTransform(...geomancer.transform)
    const viewport = measure.transformBox(
      {
        min: {x: 0, y: 0},
        max: {x: geomancer.canvas.width, y: geomancer.canvas.height}
      },
      geomancer.transform
    )
    const handles = tracer()
    geomancer.scene.forEach(sub => {
      const subject = tome.subject(sub)
      const render = tome.renderer(subject.renderer)
      if (render) render(context, subject, {viewport, handles, tome})
    })
    geomancer.tracer = handles
  }

  geomancer.pan = function ({x, y}) {
    geomancer.transform[4] = geomancer.transform[4] + x
    geomancer.transform[5] = geomancer.transform[5] + y
  }


  geomancer.left = () => -geomancer.transform[4] / geomancer.transform[0]
  geomancer.right = () => geomancer.canvas.width / geomancer.transform[0] + geomancer.left()
  geomancer.top = () => -geomancer.transform[5] / geomancer.transform[3]
  geomancer.bottom = () => geomancer.canvas.height / geomancer.transform[3] + geomancer.top()
  geomancer.center = function () {
    return {
      x: (geomancer.right() + geomancer.left()) / 2,
      y: (geomancer.bottom() + geomancer.top()) / 2
    }
  }

  geomancer.centerOn = function ({x, y}) {
    geomancer.transform[4] = geomancer.canvas.width/2 - geomancer.transform[0] * x
    geomancer.transform[5] = geomancer.canvas.height/2 - geomancer.transform[3] * y
  }
  geomancer.justify = {
    left: (x) => {
      geomancer.transform[4] = -x * geomancer.transform[0]
    },
    right: (x) => {
      geomancer.transform[4] = geomancer.canvas.width - geomancer.transform[0] * x
    },
    top: (y) => {
      geomancer.transform[5] = -y * geomancer.transform[3]
    },
    bottom: (y) => {
      geomancer.transform[5] = geomancer.canvas.height - geomancer.transform[3] * y
    }
  }

  geomancer.zoom = function (zoom, focus=null) {
    if (focus === null) focus = geomancer.center()

    geomancer.transform[4] = focus.x - zoom * (focus.x-geomancer.transform[4]) / geomancer.transform[0]
    geomancer.transform[5] = focus.y - zoom * (focus.y-geomancer.transform[5]) / geomancer.transform[3]
    geomancer.transform[0] = zoom
    geomancer.transform[3] = zoom
  }

  return geomancer
}
