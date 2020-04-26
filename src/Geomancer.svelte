<svelte:options tag="geomancer-scene"/>

<script context="module">
import { writable, derived, get } from 'svelte/store';

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
import { onMount, afterUpdate, tick } from 'svelte';

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
};
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
};
export let layers = [
	{
		subjects: [
			{
				id: "loneHex",
				path: "hexagon",
				pallette: "black",
				transform: [1, 0, 0, 1, 100, 100],
				visible: true,
			},
			{
				id: "boundary",
				path: "boundaries",
				pallette: "thinBlackLines",
				transform: [1, 0, 0, 1, 0, 0],
				visible: true,
			}
		],
		layers: [],
		transform: [1, 0, 0, 1, 0, 0]
	}
]
export let sceneID = "geomancer-viewport"
export let width = 800;
export let height = 800;
export let transform = [1, 0, 0, 1, 0, 0];
export let extents = {
	left: 0,
	right: 800,
	top: 0,
	bottom: 800
};

export let handlers = {
	mousedown: view.startPanning,
	mouseup: view.stopPanning,
	mouseout: view.stopPanning,
	mousemove: (event) => view.panning(event, width, height, extents, transform),
	wheel: (event) => view.zooming(event, width, height, extents, transform),
}


const pathsStore = writable(paths)
$: pathsStore.set(paths)
const pallettesStore = writable(pallettes)
$: pallettesStore.set(pallettes)
const transformStore = writable(transform)
$: transformStore.set(transform)
const boxStore = writable({width, height})
$: boxStore.set({width, height})
const viewportStore = derived(
	[transformStore, boxStore],
	([$transformStore, $boxStore]) => ({
		transform: $transformStore,
		box: measure.transformBox(measure.pathToBox(["rect", 0, 0, $boxStore.width, $boxStore.height]), $transformStore)
	})
)
const layerStore = writable(null)
$: layerStore.set(layers)
const orderedSubjects = derived(
	layerStore,
	($layerStore) => {
		const os = []
		if ($layerStore !== null)
			($layerStore).forEach(layer => subjects.order(layer, os))
		return os
	}
)

const pathStores = {}
const shapeStores = {}
const palletteStores = {}
const painterStores = {}
const patternStores = {}
const subjectStores = {}

pathsStore.subscribe(paths => {
	for (const p in paths) {
		if (pathStores[p] === undefined) {
			const pathStore = writable(paths[p])
			pathStores[p] = pathStore;
			shapeStores[p] = derived(pathStore, $pathStore => ({
				shape: measure.pathToCanvas($pathStore),
				box: measure.pathToBox($pathStore)
			}));
		} else {
			pathStores[p].set(paths[p]);
		}
	}
})

pallettesStore.subscribe(pallettes => {
	for (const p in pallettes) {
		if (palletteStores[p] === undefined) {
			const palletteStore = writable(pallettes[p]);
			palletteStores[p] = palletteStore;
			painterStores[p] = derived(palletteStore, $palletteStore => style.palletteToPainter($palletteStore));
		} else {
			palletteStores[p].set(pallettes[p]);
		}
	}
})

layerStore.subscribe(layers => {
	if (layers === null) return

	const patterns = {}
	layers.forEach(layer => subjects.resolve([1, 0, 0, 1, 0, 0], layer, patterns))

	for (const p in patterns) {
		if (patternStores[p] === undefined) {
			patternStores[p] = writable(patterns[p]);
		} else {
			patternStores[p].set(patterns[p])
		}
	}
	for (const p in patterns) {
		if (subjectStores[p] === undefined) {
			const pattern = patterns[p]
			const patternStore = patternStores[p]
			const shape = shapeStores[pattern.path]
			const painter = painterStores[pattern.pallette]
			subjectStores[p] = derived(
				[viewportStore, patternStore, shape, painter],
				([$viewportStore, $patternStore, $shape, $painter]) => ({
					id: ($patternStore).id,
					draw: $painter,
					shape: ($shape).shape,
					transform: ($patternStore).transform,
					visible: ($patternStore).visible // && tracer.boxesIntersect(($viewportStore).box, ($shape).box)
				})
			)
		}
	}
})

function draw (context) {
	console.time("draw")
	context.setTransform(1, 0, 0, 1, 0, 0)
	context.clearRect(0, 0, width, height)
	context.setTransform(...transform)
	$orderedSubjects
		.map(s => {
			return subjectStores[s]
		})
		.filter(s => s !== undefined)
		.map(s => get(s))
		.filter(s => s.visible)
		.forEach(subject => {
			context.save()
			context.transform(...subject.transform)
			subject.draw(context, subject.shape)
			context.restore()
		})
	console.timeEnd("draw")
}

function eventHandlers (node, events) {
	for (const ev in events) {
		node.addEventListener(ev, events[ev])
	}
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

let canvas;

onMount(() => {
	draw(canvas.getContext('2d'))
});

afterUpdate(() => {
	draw(canvas.getContext('2d'))
});
</script>

<canvas bind:this={canvas} id={sceneID} width="{width}px" height="{height}px" use:eventHandlers={handlers} on:panZoomRotate={change => transform=change}/>
