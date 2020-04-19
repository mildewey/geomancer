<svelte:options tag="geomancer-scene"/>

<script context="module">
import { writable } from 'svelte/store';

import style from './style'
import scene from './scene'
import measure from './measure'
import tracer from './tracer'
import events from './events'
import handles from './handles'
import view from './view'

export {
	style,
	scene,
	measure,
	tracer
}
</script>

<script>
import { onMount, afterUpdate, onDestroy } from 'svelte';

export let sceneID = "geomancer-viewport"
export let width;
export let height;
export let extents = {
	left: 0,
	right: 800,
	top: 0,
	bottom: 800
}

export let handlers = {
	mousedown: view.startPanning,
	mouseup: view.stopPanning,
	mouseout: view.stopPanning,
	mousemove: (event) => view.panning(event, width, height, extents, transform),
	wheel: (event) => view.zooming(event, width, height, extents, transform),
}

export let paths = {
	hexagon: [
    ['moveTo', 2.5, 43.3],
    ['lineTo', 26.25, 84.77],
    ['lineTo', 73.75, 84.77],
    ['lineTo', 97.5, 43.3],
    ['lineTo', 73.75, 2.165],
    ['lineTo', 26.25, 2.165],
    ['closePath'],
	],
	boundaries: [
		['rect', 10, 10, 780, 780]
	]
}; // a dictionary of step by step instructions for building shapes
export let pallettes = {
	black: {
    fillStyle: 'black',
    lineWidth: 3,
    lineJoin: 'round'
  },
	thinBlackLines: {
		lineWidth: 5,
		strokeStyle: 'black',
		lineJoin: 'round'
	}
}; // a dictionary of coloring and brush information
export let subjects = {
	hex: {
		path: 'hexagon',
		pallette: 'black',
		transform: [1, 0, 0, 1, 100, 100],
		handle: true,
	},
	boundaries: {
		path: 'boundaries',
		pallette: 'thinBlackLines',
		transform: [1, 0, 0, 1, 0, 0]
	}
};
export let transform = [1, 0, 0, 1, 0, 0];
// a dictionary containing keys to sub objects like this:
// {
// 	 path: "id into paths dictionary",
// 	 pallette: "id into pallettes dictionary",
// 	 transform: [1, 0, 0, 1, 0, 0] // if left null or undefined, don't apply a transform
// }
export let layers = [
	{
		transform: [1, 0, 0, 1, 0, 0],
		subjects: ["hex"],
		layers: []
	}
];
// a list of scene objects which look like this:
// {
//   transform: defaultTransform(),
//   subjects: [], // a list of subjects to draw, the subjects will be drawn in order, so the 0th subject will be behind the others
//   layers: [] // list of nested scene objects
// }
// the layers will be drawn in order, so the 0th layer is the bottom layer

events.contexts[sceneID] = writable(null)
events.hitCheckers[sceneID] = writable(null)
events.transforms[sceneID] = writable(transform)
events.transforms[sceneID].subscribe((newTransform) => {
	console.log("Changing transform to", newTransform)
	transform=newTransform
})

$: course = {
	paths,
	shapes: measure.pathsToShapes(paths),
	painters: style.pallettesToPainters(pallettes),
	subjects
};

$: viewport = {
	transform,
	layers,
	subjects: [],
};

let canvas;

function draw () {
	const context = canvas.getContext('2d');
	context.setTransform(1, 0, 0, 1, 0, 0)
	console.log("clear rect", width, height)
	context.clearRect(0, 0, width, height)
	scene.paint(context, course, viewport)
	events.contexts[sceneID].set(context)
	events.hitCheckers[sceneID].set(handles.hulls(context, course, viewport))
}

function eventHandlers (node, events) {
	for (const ev in events) {
		console.log(ev, events)
		node.addEventListener(ev, events[ev])
	}
	console.log(node)
	let prevEvents = events
	return {
		update (newEvents) {
			for (const ev in prevEvents) {
				node.removeEventListener(ev, prevEvents[ev])
			}
			for (const ev in newEvents) {
				node.addEventListener(ev, newEvents[ev])
			}
			prevEvents = newEvents
		},
		destroy () {
			for (const ev in prevEvents) {
				node.removeEventListener(ev, prevEvents[ev])
			}
		}
	}
}

onMount(() => {
	console.log("Mounting Geomancer canvas")
	view.enforceBoundaries(width, height, extents, transform)
	draw()
});

afterUpdate(() => {
	console.log("Updated Geomancer canvas")
	draw()
});

onDestroy(() => {
	delete events.contexts[sceneID]
	delete events.hitCheckers[sceneID]
	delete events.transforms[sceneID]
})
</script>

<canvas bind:this={canvas} id={sceneID} width="{width}px" height="{height}px" use:eventHandlers={handlers} on:panZoomRotate={change => transform=change}/>
