<script lang="ts">
	import maplibre from 'maplibre-gl';
	import { Protocol } from 'pmtiles';
	import { layers, namedFlavor } from '@protomaps/basemaps';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import type { Feature, FeatureCollection, Point } from 'geojson';

	const PHILA_URL = 'https://card-2025.r2.kalt.cloud/philadelphia.pmtiles';
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
	import d from '$lib/assets/attractions.geo.json';
	type props = { description: string; tags: string[]; name: string };
	const data: FeatureCollection<Point, props> = d as any;
	const tags = JSON.stringify(
		data.features
			.flatMap((f) => f.properties.tags)
			.reduce(
				(acc, tag) => {
					if (acc[tag]) acc[tag] += 1;
					else acc[tag] = 1;
					return acc;
				},
				{} as Record<string, number>
			),
		null,
		2
	);
	const selectedTags = writable<string[]>([]);
	const selectedLocation = writable<Feature<Point, props> | null>(null);

	const forEvent = (m: maplibre.Map, event: string) =>
		new Promise((resolve) => {
			m.once(event, () => resolve(true));
		});
	onMount(async () => {
		console.clear();
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
		m.on('error', (e) => {
			console.error(e);
		});
		await forEvent(m, 'load');
		console.log(data);

		const src = 'attractions';
		m.addSource(src, {
			type: 'geojson',
			data: data as FeatureCollection
		});
		m.addLayer({
			id: 'attractions-layer',
			type: 'circle',
			source: src,
			paint: {
				'circle-radius': 6,
				'circle-color': '#FF5722',
				'circle-stroke-width': 2,
				'circle-stroke-color': '#FFFFFF'
			}
		});
		// TODO: filter map by tags
		// TODO: assign icons based on tags
		// TODO: cat, book, book-cat icons
		m.on('mouseenter', 'attractions-layer', (e) => {
			m.getCanvas().style.cursor = 'pointer';
		});
		m.on('mouseleave', 'attractions-layer', (e) => {
			m.getCanvas().style.cursor = '';
		});
		m.on('click', 'attractions-layer', (e) => {
			selectedLocation.set((e.features?.[0] as any) ?? null);
		});
		_map.set(m);
	});
	darkTheme.subscribe((dark) => {
		let m = $_map;
		if (m?.style.setState(style(dark))) {
			m.redraw(); // FIXME: doesn't work
			m.setZoom(m.getZoom() + 0.01); // yet this does
		}
	});
</script>

<div id="box">
	<h1>Happy Holidays from Philadelphia, PA!</h1>
	<div id="container">
		<div id="map"></div>
		<div id="info">
			<search>
				<!-- TODO: width 100% -->
				<!-- TODO: actually search -->
				<input placeholder="Search attractions..." />
			</search>
			<!-- infobar -->

			{#if $selectedLocation}
				<h2>{$selectedLocation.properties.name}</h2>
				<p>{$selectedLocation.properties.description}</p>
				<p>
					<strong>Tags:</strong>
					<!-- {#each $selectedLocation.properties.tags as tag, i (tag)}
						{tag}{i < $selectedLocation.properties.tags.length - 1 ? ', ' : ''}
					{/each} -->
				</p>
			{:else}
				<p>Select an attraction on the map to see details here.</p>
			{/if}
			<pre>{tags}</pre>
		</div>
	</div>
</div>

<style>
	#box {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}
	h1 {
		text-align: center;
		flex: 0 1 auto;
	}
	/* https://m2.material.io/design/layout/responsive-layout-grid.html#breakpoints */
	#container {
		flex: 1 1 auto;
		display: flex;
		height: 100%;
		/* --max-height:  */
	}
	#info {
		flex-basis: auto;
		flex-shrink: 1;
		min-width: max(400px, 33%);
		margin: 0 1rem;
		border: 1px solid #eee;
	}
	#map {
		width: 100%;
		flex: 1 1 auto;
	}
	#map,
	#info {
		height: 100%;
		/* height: 90vh; */
	}
	@media (max-width: 600px) {
		#container {
			display: block;
		}
		#info {
			min-width: 100%;
			margin: 1rem 0;
		}
		#map,
		#info {
			width: 100%;
			height: 50%;
		}
	}
</style>
