#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const semver = require("semver");
const sass = require('node-sass');

const cwd = process.cwd();
const packageJson = require(path.join(__dirname, 'package.json'));
const version = packageJson.engines.node;

if (!semver.satisfies(process.version, version)) {
    const rawVersion = version.replace(/[^\d\.]*/, "");
    console.log(`CSSMonster requires at least Node v${rawVersion} and you're using Node v${process.version}`);
    process.exit(1);
}