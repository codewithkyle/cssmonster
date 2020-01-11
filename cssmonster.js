#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const semver = require("semver");
const sass = require('node-sass');
const yargs = require('yargs').argv;

const cwd = process.cwd();

/** Verify Nodejs version */
const packageJson = require(path.join(__dirname, 'package.json'));
const version = packageJson.engines.node;
if (!semver.satisfies(process.version, version)) {
    const rawVersion = version.replace(/[^\d\.]*/, "");
    console.log(`CSSMonster requires at least Node v${rawVersion} and you're using Node v${process.version}`);
    process.exit(1);
}

/** Get config file */
const configFile = yargs.c || yargs.config;
let configPath;
if (configFile) {
    configPath = path.resolve(cwd, configFile);
    if (!fs.existsSync(configPath)) {
        console.log(`Missing config file. Did you move the file without updating the --config flag?`);
        process.exit(1);
    }
} else {
    configPath = path.join(cwd, "cssmonster.js");
    if (!fs.existsSync(configPath)) {
        configPath = path.join(cwd, "cssmonster.config.js");
        if (!fs.existsSync(configPath)) {
            console.log("Missing cssmonster.config.js config file.");
            process.exit(1);
        }
    }
}
const config = require(configPath);