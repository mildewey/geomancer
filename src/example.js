import { get } from 'svelte/store';

import { path, pallette, pattern, subject, frame, camera } from './pipeline'
import view from './view'
import tracer from './tracer'


const hexPath = path([
  ['moveTo', 2.5, 43.3],
  ['lineTo', 26.25, 84.77],
  ['lineTo', 73.75, 84.77],
  ['lineTo', 97.5, 43.3],
  ['lineTo', 73.75, 2.165],
  ['lineTo', 26.25, 2.165],
  ['closePath'],
])
const boundingPath = path([['rect', 10, 10, 780, 780]])
const blackPallette = pallette({
  fillStyle: 'black',
  lineWidth: 3,
  lineJoin: 'round'
})
const thinBlackPallette = pallette({
  lineWidth: 5,
  strokeStyle: 'black',
  lineJoin: 'round'
})
const hexPattern = pattern(hexPath, blackPallette)
const boundaryPattern = pattern(boundingPath, thinBlackPallette)
const boundarySubject = subject(boundaryPattern, [1, 0, 0, 1, 0, 0], true, "boundaries")
const hexSubject = subject(hexPattern, [1, 0, 0, 1, 100, 100], true, "lone hexagon")
const baseLayer = frame([boundarySubject, hexSubject], [1, 0, 0, 1, 0, 0], true)
const geomancer = camera([baseLayer], [1, 0, 0, 1, 0, 0], 800, 800)

let extents = {left: 0, right: 800, top: 0, bottom: 800}
let maxZoom = 5
const handlers = {
	mousedown: (mouse, {camera, id}) => {
    view.startPanning(mouse.clientX, mouse.clientY, id)
  },
	mouseup: (mouse, {camera, id}) => { view.stopPanning(id) },
	mouseout: (mouse, {camera, id}) => { view.stopPanning(id) },
	mousemove: (mouse, {camera, id}) => {
    let state = get(camera)
    console.log(state.itemsAt(mouse.clientX, mouse.clientY))

    let target = view.panning(mouse.clientX, mouse.clientY, state.transform, id)
    view.enforceBoundaries(state.width, state.height, target, extents)
    camera.setTransform(target)
  },
	wheel: (mouse, {camera}) => {
    let state = get(camera)
    let target = view.mouseZoom(mouse, state.transform)
    view.enforceBoundaries(state.width, state.height, target, extents, maxZoom)

    camera.setTransform(target)
  },
}

export default {
  camera: geomancer,
  handlers
}
