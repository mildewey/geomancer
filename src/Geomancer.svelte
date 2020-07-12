<svelte:options tag="geomancer-scene"/>

<script context="module">
import { writable, derived, get } from 'svelte/store';
import { onMount } from 'svelte';
import { path, pallette, pattern, subject, layer, camera } from './pipeline'

import style from './style'
import scene from './scene'
import measure from './measure'
import tracer from './tracer'
import events from './events'
import handles from './handles'
import view from './view'
import subjects from './subjects'

export {
	style,
	scene,
	measure,
	tracer
}
</script>

<script>
export let width = 800
export let height = 800

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
const boundarySubject = subject(boundaryPattern, [1, 0, 0, 1, 0, 0], true)
const hexSubject = subject(hexPattern, [1, 0, 0, 1, 100, 100], true)
const baseLayer = layer([boundarySubject, hexSubject], [1, 0, 0, 1, 0, 0], true)
const geomancer = camera([baseLayer], [1, 0, 0, 1, 0, 0], width, height)

let canvas;
const context = writable(null)
const paintStore = derived([context, geomancer], ([context, geomancer]) => {
	return () => {
		console.log("painting?")
		if (context) {
			console.log("painting!")
			context.clearRect(0, 0, width, height)
			geomancer.draw(context)
		}
	}
})

paintStore.subscribe((draw) => draw())

// export let handlers = {
// 	mousedown: view.startPanning,
// 	mouseup: view.stopPanning,
// 	mouseout: view.stopPanning,
// 	mousemove: view.panning,
// 	wheel: view.zooming,
// }

// function eventHandlers (node, events) {
// 	let context = {
// 		element: node,
// 		extents: extentsStore,
// 		width: widthStore,
// 		height: heightStore,
// 		transform: transformStore,
// 		paths: pathsStore,
// 		pallettes: pallettesStore,
// 		layers: layersStore,
// 	}
// 	let handlers = []
// 	for (const ev in events) {
// 		handlers.push([ev, (event) => events[ev](event, context)])
// 	}
// 	handlers.forEach(([ev, handler]) => node.addEventListener(ev, handler))
// 	return {
// 		update (newHandlers) {
// 			handlers.forEach(([ev, handler]) => node.removeEventListener(ev, handler))
// 			handlers = []
// 			for (const ev in newHandlers) {
// 				handlers.push([ev, (event) => events[ev](event, context)])
// 			}
// 			handlers.forEach(([ev, handler]) => node.addEventListener(ev, handler))
// 		},
// 		destroy () {
// 			handlers.forEach(([ev, handler]) => node.removeEventListener(ev, handler))
// 		}
// 	}
// }

onMount(() => {
	console.log(get(geomancer))
	context.set(canvas.getContext('2d'))
});
</script>

<canvas bind:this={canvas} width="{width}px" height="{height}px"/>
