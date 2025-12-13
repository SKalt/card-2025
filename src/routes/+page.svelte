<script lang="ts">
	import maplibre from 'maplibre-gl';
	import { Protocol } from 'pmtiles';
	import { layers, namedFlavor } from '@protomaps/basemaps';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	const PHILA_URL = 'https://yra7vsjs9nrw0ud7.public.blob.vercel-storage.com/philadelphia.pmtiles';
	const proto = new Protocol();
	maplibre.addProtocol('pmtiles', proto.tile);
	const darkTheme = writable(false);
	let _map = writable<maplibre.Map | null>(null);
	const style = (dark: boolean): maplibre.StyleSpecification => ({
		version: 8,
		sources: {
			protomaps: {
				type: 'vector',
				url: 'pmtiles://' + PHILA_URL
			}
		},
		sprite: 'https://protomaps.github.io/basemaps-assets/sprites/v4/white',
		glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
		layers: layers('protomaps', namedFlavor(dark ? 'black' : 'white'), { lang: 'en' })
	});
	onMount(() => {
		{
			// listen for system color preference changes
			// technique from https://robkendal.co.uk/blog/2024-11-21-detecting-os-level-dark-mode/
			const _darkMode = window.matchMedia('(prefers-color-scheme: dark)');
			darkTheme.set(_darkMode.matches);
			_darkMode.addEventListener('change', (e) => darkTheme.set(e.matches));
		}
		const config: maplibre.MapOptions = {
			container: 'map',
			center: { lat: 39.96373852937114, lng: -75.25713708454445 },
			zoom: 10.74,
			// hash: true,
			style: style($darkTheme)
		};
		const m = new maplibre.Map(config);
		_map.set(m);
		console.log();
	});
	darkTheme.subscribe((dark) => {
		let m = $_map;
		if (m?.style.setState(style(dark))) m.redraw();
	});
</script>

<h1>Happy Holidays from Philadelphia, PA!</h1>
<div id="map" style="height: 90vh; width: 100vw"></div>
