import measure from './measure'
import tracer from './tracer'
import tome from './tome'
import elemental from './elemental'


export default function () {
  const geomancer = {
    camera: {
      transform: [1, 0, 0, 1, 0, 0],
      extents: {
        min: {x: null, y: null, zoom: null},
        max: {x: null, y: null, zoom: null},
      },
      area: {
        width: 800,
        height: 800
      }
    },
    scene: [],
    tome,
    handles: tracer.tracer()
  }

  geomancer.render = (context) => {
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, geomancer.camera.area.width, geomancer.camera.area.height)
    context.setTransform(...geomancer.camera.transform)
    const viewport = measure.transformBox(
      {
        min: {x: 0, y: 0},
        max: {x: geomancer.camera.area.width, y: geomancer.camera.area.height}
      },
      geomancer.camera.transform
    )
    geomancer.handles = tracer.tracer()
    geomancer.scene.forEach(sub => {
      const subject = tome.subject(sub)
      const render = tome.renderer(subject.renderer)
      if (render) render(context, subject, {viewport, handles: geomancer.handles, tome})
    })
  }

  return geomancer
}
