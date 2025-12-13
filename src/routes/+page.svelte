<script lang="ts">
	import maplibre from 'maplibre-gl';
	import { Protocol } from 'pmtiles';
	import { layers, namedFlavor } from '@protomaps/basemaps';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { onMount } from 'svelte';
	const PHILA_URL = 'https://yra7vsjs9nrw0ud7.public.blob.vercel-storage.com/philadelphia.pmtiles';
	const proto = new Protocol();
	// TODO: mutable store of map
	maplibre.addProtocol('pmtiles', proto.tile);

	onMount(() => {
		console.clear();
		const config: maplibre.MapOptions = {
			container: 'map',
			center: { lng: 39.96373852937114, lat: -75.25713708454445 },
			zoom: 10.74,
			hash: true,
			style: {
				version: 8,
				sources: {
					protomaps: {
						type: 'vector',
						url: 'pmtiles://' + PHILA_URL
					}
				},
				sprite: 'https://protomaps.github.io/basemaps-assets/sprites/v4/white',
				glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
				layers: layers('protomaps', namedFlavor('light'), { lang: 'en' })
			}
		};

		console.log(config);
		const m = new maplibre.Map(config);
		console.log(m);
	});
</script>

<h1>Happy Holidays from Philadelphia, PA!</h1>
<div id="map" style="height: 90vh; width: 100vw"></div>
