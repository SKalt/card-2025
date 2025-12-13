#!/bin/sh
remote=https://build.protomaps.com/20251211.pmtiles
bbox=-75.254599,39.881498,-75.087695,40.043810
pmtiles extract $remote ./static/philadelphia.pmtiles --bbox=$bbox
