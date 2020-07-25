<svelte:options tag="geomancer-scene"/>

<script context="module">
import { writable, derived, get } from 'svelte/store';
import { onMount } from 'svelte';

import style from './style'
import measure from './measure'
import tracer from './tracer'
import events from './events'
import view from './view'
import example from './example'
import { v4 as uuidv4 } from 'uuid';
import geomancer from './geomancer';
import elemental from './elemental';


export {
	style,
	measure,
	tracer
}
</script>

<script>
export let geo = geomancer()
export let mode = {
	name: "default",
	state: {}
}

let canvas;
let controls = writable(mode);
$: controls.set(mode)
let frame;

function drawingLoop (context) {
	(function loop() {
		frame = requestAnimationFrame(loop);
		geo.render(context)
	})()
	return () => {
		cancelAnimationFrame(frame);
	};
}

onMount(() => {
	geo.render(canvas.getContext('2d'))
	const elem = elemental(canvas)
	controls.subscribe(() => {
		elem.set(mode.name, {elem, geo, ...mode.state})
	})
	return drawingLoop(canvas.getContext('2d'))
});
</script>

<canvas bind:this={canvas} width="{geo.camera.area.width}px" height="{geo.camera.area.height}px"/>
