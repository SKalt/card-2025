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
	let _zoom = $state(0);
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
	// see https://maplibre.org/maplibre-gl-js/docs/examples/display-a-remote-svg-symbol/
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
			)
	).sort((a, b) => (a[1] > b[1] ? -1 : b[1] > a[1] ? 1 : 0));
	let selectedTag: string | null = $state(null);
	$effect(() => {
		_map?.setGlobalStateProperty('tag', selectedTag);
		if (!_map) selectedTag = null;
	});
	let selectedLocation = $state<Feature<Point, Props> | null>(null);
	type Icon = keyof typeof icons;

	const iconColors: Record<Icon, string> = {
		restaurant: '#5e4fa2',
		cafe: '#3288bd',
		books: '#66c2a5',
		cat: 'black',
		bar: '#abdda4',
		music: '#e6f598',
		pizza: '#d53e4f', // 'red',
		fitness: 'black',
		park: '#66c2a5',
		art: '#e6f598',
		historic: '#fdae61',

		cinema: '#e6f598',
		cross: '#9e0142',
		asian: '#5e4fa2',
		bakery: '#fee08b',
		beer: 'brown', // note: not used.
		dog: 'brown',
		burger: 'tan', // not used
		hairdresser: 'silver',
		hospital: '#d53e4f',
		iceCream: 'aqua',
		marker: 'black',
		museum: 'gray',
		rail: 'gray',
		shop: 'tan',
		theatre: '#e6f598'
	};
	const tagColors = Object.entries(
		rawData.features
			.map((f) => [f.properties.tags, iconColors[f.properties.icon as Icon]] as [string[], string])
			.reduce(
				(a, [ts, c]) => {
					for (let t of ts) {
						if (!a[t]) a[t] = {};
						if (!a[t][c]) a[t][c] = 0;
						a[t][c]++;
					}
					return a;
				},
				{} as Record<string, Record<string, number>>
			)
	).reduce(
		(a, [t, cs]) => {
			let color = Object.entries(cs).sort(([, a], [, b]) => (b > a ? 1 : b < a ? -1 : 1))[0][0];
			const dark = ['black', '#5e4fa2', '#3288bd'];
			a[t] = [dark.includes(color) ? '#fff' : '#000', color];
			return a;
		},
		{} as Record<string, [string, string]>
	);
	const forEvent = (m: maplibre.Map, event: string) =>
		new Promise((resolve) => {
			m.once(event, () => resolve(true));
		});
	const handleSearchInput = (e: Event) => {
		if ((e as InputEvent).inputType == 'insertReplacementText') {
			// an option was selected
			const f = rawData.features.find((f) => f.properties.name === (e as InputEvent).data)!;
			_map?.easeTo({
				zoom: 20,
				center: {
					lng: f.geometry.coordinates[0],
					lat: f.geometry.coordinates[1]
				}
			});
		}
	};
	onMount(async () => {
		// listen for system color preference changes
		// technique from https://robkendal.co.uk/blog/2024-11-21-detecting-os-level-dark-mode/
		const _darkMode = window.matchMedia('(prefers-color-scheme: dark)');
		darkTheme = _darkMode.matches;
		const config: maplibre.MapOptions = {
			container: 'map',
			center: { lat: 39.96373852937114, lng: -75.25713708454445 },
			zoom: 10.74,
			hash: true,
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
				m.redraw(); // <- doesn't work; map stays in previous color scheme
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
			paint: {
				'icon-color': [
					'case',
					...((() => {
						type Icon = keyof typeof icons;
						const eq = (icon: Icon) => ['==', ['get', 'icon'], icon];
						const cx = (icon: Icon) => [eq(icon), iconColors[icon]];
						return Object.entries(iconColors).flatMap(([icon, color]) => [eq(icon as Icon), color]);
					})() as any),
					'black'
				] as maplibre.DataDrivenPropertyValueSpecification<string>
			},
			layout: {
				'icon-image': ['get', 'icon'],
				'icon-size': ['step', ['zoom'], 0.1, 12, 0.15, 14, 0.2],
				'icon-overlap': 'cooperative'
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
		<!-- TODO: seasons greetings, overview of concept -->
		<div id="map"></div>
		<div id="info">
			<!-- infobar -->
			<hr />
			{#if selectedLocation}
				<h2>{selectedLocation.properties.name}</h2>
				<p>{@html selectedLocation.properties.description}</p>

				<strong>Tags:</strong>

				{#each selectedLocation.properties.tags as tag, i (tag)}
					<span class={{ tag: true, selected: tag == selectedTag }}>{tag}</span>{i <
					selectedLocation.properties.tags.length - 1
						? ', '
						: ''}
				{/each}
			{:else}
				<p>Select an attraction on the map to see details here.</p>
			{/if}
			<hr />
			<search style="width: 100%">
				<input
					style="width: 100%"
					type="search"
					list="x"
					placeholder="Search attractions..."
					oninput={handleSearchInput}
				/>
				<datalist id="x">
					{#each rawData.features as f}
						<option>
							{f.properties.name}
						</option>
					{/each}
					<option></option>
				</datalist>
			</search>
			<div>
				<p>Click a button to filter to a specific tag</p>
				{#each allTags as [tag, count]}
					<button
						class={{ tag: true, selected: tag == selectedTag }}
						style={`background-color: ${tagColors[tag][1]}; color: ${tagColors[tag][0]};`}
						onclick={() => {
							tag !== selectedTag ? (selectedTag = tag) : (selectedTag = null);
						}}><span>{tag}</span><span>{count}</span></button
					>
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
	.tag {
		border: none;
		border-radius: 2px;
		margin: 2px;
	}
	.tag.selected {
		font-weight: bold;
		border: 1px solid black;
		margin: 1px;
	}
</style>
