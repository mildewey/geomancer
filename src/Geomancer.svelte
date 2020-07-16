<svelte:options tag="geomancer-scene"/>

<script context="module">
import { writable, derived, get } from 'svelte/store';
import { onMount } from 'svelte';

import style from './style'
import scene from './scene'
import measure from './measure'
import tracer from './tracer'
import events from './events'
import handles from './handles'
import view from './view'
import subjects from './subjects'
import example from './example'
import { v4 as uuidv4 } from 'uuid';


export {
	style,
	scene,
	measure,
	tracer
}
</script>

<script>
export let id = uuidv4()
export let camera = example.camera
export let handlers = example.handlers

let width = 800
let height = 800
camera.subscribe(camera => {
	width = camera.width
	height = camera.height
})

let canvas;
const context = writable(null)
const paintStore = derived([context, camera], ([context, camera]) => {
	return () => {
		if (context) {
			context.clearRect(0, 0, width, height)
			camera.draw(context)
		}
	}
})

paintStore.subscribe((draw) => draw())


function eventHandlers (node, events) {
	let handlers = []
	let localContext = {camera, id}
	for (const ev in events) {
		handlers.push([ev, (event) => events[ev](event, localContext)])
	}
	handlers.forEach(([ev, handler]) => node.addEventListener(ev, handler))
	return {
		update (newHandlers) {
			handlers.forEach(([ev, handler]) => node.removeEventListener(ev, handler))
			handlers = []
			for (const ev in newHandlers) {
				handlers.push([ev, (event) => events[ev](event, localContext)])
			}
			handlers.forEach(([ev, handler]) => node.addEventListener(ev, handler))
		},
		destroy () {
			handlers.forEach(([ev, handler]) => node.removeEventListener(ev, handler))
		}
	}
}

onMount(() => {
	context.set(canvas.getContext('2d'))
});
</script>

<canvas bind:this={canvas} width="{width}px" height="{height}px" use:eventHandlers={handlers}/>
