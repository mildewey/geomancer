<svelte:options tag="geomancer-example"/>

<script>
import Geomancer from "./Geomancer.svelte"
import geomancer from "./geomancer"
import tome from "./tome"

tome.register.shape("hexagon", [
  ['moveTo', 2.5, 43.3],
  ['lineTo', 26.25, 84.77],
  ['lineTo', 73.75, 84.77],
  ['lineTo', 97.5, 43.3],
  ['lineTo', 73.75, 2.165],
  ['lineTo', 26.25, 2.165],
  ['closePath'],
])
tome.register.shape("boundary", [['rect', 10, 10, 780, 780]])

tome.register.style("black", {
  fillStyle: 'black',
  lineWidth: 3,
  lineJoin: 'round'
})
tome.register.style("thinBlackLines", {
  lineWidth: 5,
  strokeStyle: 'black',
  lineJoin: 'round'
})

tome.register.subject("lone hex", {
  details: {
    shape: "hexagon",
    style: "black",
    trace: "lone hex",
  },
  transform: [1, 0, 0, 1, 100, 100],
  visible: true,
  renderer: "simple",
})

tome.register.subject("boundaries", {
  details: {
    shape: "boundary",
    style: "thinBlackLines",
    trace: "boundaries",
  },
  transform: [1, 0, 0, 1, 0, 0],
  visible: true,
  renderer: "simple",
})

tome.register.subject("base layer", {
  details: {
    subjects: ["boundaries", "lone hex"]
  },
  transform: [1, 0, 0, 1, 0, 0],
  visible: true,
  renderer: "nested",
})

tome.register.mode("tracing",
  {
    mousedown: (mouse, {geo}) => {
      console.log(geo.handles.intersectPoint({x: mouse.offsetX, y: mouse.offsetY}))
    }
  },
  (state) => state
)


let geo = geomancer();
geo.camera.extents = {min: {x: 0, y: 0, zoom: null}, max: {x: 800, y: 800, zoom: 5}}
geo.scene = ["base layer"]

let mode = {
  name: "tracing",
  state: {}
}
</script>

<Geomancer bind:geo={geo} bind:mode={mode}/>
