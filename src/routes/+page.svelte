<script lang="ts">
	import maplibre from 'maplibre-gl';
	import { Protocol } from 'pmtiles';
	import { layers, namedFlavor } from '@protomaps/basemaps';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { onMount } from 'svelte';
	import type { Feature, FeatureCollection, Point } from 'geojson';
	import icons from '$lib/assets/icons/';
	// ... and then the rest of the icons
	const PHILA_URL = 'https://card-2025.r2.kalt.cloud/philadelphia.pmtiles';
	const proto = new Protocol();
	maplibre.addProtocol('pmtiles', proto.tile);
	let darkTheme = $state(false);
	let _map: maplibre.Map | null = $state(null);
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
	// TODO: add svg icons via process described in https://maplibre.org/maplibre-gl-js/docs/examples/display-a-remote-svg-symbol/
	const img = async (svgURI: string) => {
		const i = new Image();
		const p = new Promise((resolve) => (i.onload = resolve));
		i.src = svgURI;
		await p;
		return i;
		// return { data: i, width, height };
	};
	type Props = { description: string; tags: string[]; name: string; icon: string };
	const rawData: FeatureCollection<Point, Props> = d as any;
	const allTags = Object.entries(
		rawData.features
			.flatMap((f) => f.properties.tags)
			.reduce(
				(acc, tag) => {
					if (acc[tag]) acc[tag] += 1;
					else acc[tag] = 1;
					return acc;
				},
				{} as Record<string, number>
			)).sort(([,a], [,b]) => a > b ? -1 : b < a ? 1 : 0);
	let selectedTag: string | null = $state(null);
  $effect(() => {
    _map?.setGlobalStateProperty('tag', selectedTag)
    if (!_map) selectedTag = null;
  })
	let selectedLocation = $state<Feature<Point, Props> | null>(null);

	const forEvent = (m: maplibre.Map, event: string) =>
		new Promise((resolve) => {
			m.once(event, () => resolve(true));
		});
	onMount(async () => {
		// listen for system color preference changes
		// technique from https://robkendal.co.uk/blog/2024-11-21-detecting-os-level-dark-mode/
		const _darkMode = window.matchMedia('(prefers-color-scheme: dark)');
		darkTheme = _darkMode.matches;
		const config: maplibre.MapOptions = {
			container: 'map',
			center: { lat: 39.96373852937114, lng: -75.25713708454445 },
			zoom: 10.74,
			// hash: true,
			style: style(darkTheme)
		};
		const m = new maplibre.Map(config);
		Object.entries(icons).map(async ([name, marker]) =>
			m.addImage(name, await img(marker), { sdf: true })
		);
		_darkMode.addEventListener('change', (e) => {
			darkTheme = e.matches;
			if (m.loaded()) {
				m.style.setState(style(darkTheme));
				m.redraw(); // FIXME: doesn't work
				m.setZoom(m.getZoom() + 0.01); // yet this does
			}
		});
		m.on('error', (e) => console.error(e));
		await forEvent(m, 'load');
		console.log(rawData);
		const src = 'attractions';
		m.addSource(src, {
			type: 'geojson',
			data: rawData
		});
		m.addLayer({
			id: 'attractions-layer',
			type: 'symbol',
			source: src,
			// paint: {
			// 	'circle-radius': 6,
			// 	'circle-color': '#FF5722',
			// 	'circle-stroke-width': 2,
			// 	'circle-stroke-color': '#FFFFFF'
			// },
			layout: {
				'icon-image': ['get', 'icon'],
				// 'icon-image': 'marker',
				'icon-size': 1,
				'icon-overlap': 'always'
			},
			filter: [
				'case',
				['==', ['to-string', ['global-state', 'tag']], ''],
				true,
				['in', ['global-state', 'tag'], ['get', 'tags']]
			]
		});
		m.on('mouseenter', 'attractions-layer', (e) => {
			m.getCanvas().style.cursor = 'pointer';
		});
		m.on('mouseleave', 'attractions-layer', (e) => {
			m.getCanvas().style.cursor = '';
		});
		m.on('click', 'attractions-layer', (e) => {
			selectedLocation = (e.features?.[0] as any) ?? null;
			if (selectedLocation)
				selectedLocation.properties.tags = JSON.parse(selectedLocation.properties.tags as any);
		});
		_map = m;
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

			{#if selectedLocation}
				<h2>{selectedLocation.properties.name}</h2>
				<p>{selectedLocation.properties.description}</p>

				<span>icon: {selectedLocation.properties.icon}</span>
				<strong>Tags:</strong>

				{#each selectedLocation.properties.tags as tag, i (tag)}
					<span>{tag}</span>{i < selectedLocation.properties.tags.length - 1 ? ', ' : ''}
				{/each}
			{:else}
				<p>Select an attraction on the map to see details here.</p>
			{/if}
			<div>
        {#each allTags as [tag, count]}
          <button
            class={{tag: true, selected: tag == selectedTag}}
            onclick={() => {
              tag !== selectedTag ? (selectedTag = tag) : (selectedTag = null)}}><span>{tag}</span><span>{count}</span></button>
        {/each}
      </div>
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
		width: max(400px, 33%);
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
			margin: 1rem 0;
		}
		#map,
		#info {
			width: 100%;
			height: 50%;
		}
	}
  .tag > span:first-child {
    margin-right: 1ch;
  }
  .tag.selected {
    font-weight: bold;
  }
</style>
