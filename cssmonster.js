#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const glob = require("glob");
const semver = require("semver");
const sass = require("node-sass");
const yargs = require("yargs").argv;

const cwd = process.cwd();

/** Verify Nodejs version */
const packageJson = require(path.join(__dirname, "package.json"));
const version = packageJson.engines.node;
if (!semver.satisfies(process.version, version)) {
    const rawVersion = version.replace(/[^\d\.]*/, "");
    console.log(`CSSMonster requires at least Node v${rawVersion} and you're using Node v${process.version}`);
    process.exit(1);
}

/** Get config file path */
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
            configPath = null;
        }
    }
}

const config = require(configPath) || null;
const normalizePath = path.resolve(cwd, "node_modules/normalize.css/normalize.css");
const preflightPath = path.join(__dirname, "preflight.css");
let mode = yargs.e || yargs.env || "production";

/** Output CSS */
class CSSMonster {
    constructor() {
        this.tempDir = path.join(__dirname, "temp");
        this.config = {
            env: mode,
            outDir: path.resolve(cwd, "cssmonster"),
            sources: [path.resolve(cwd, "src")],
            minify: true,
            purgeCSS: {
                content: [path.resolve(cwd, "**/*.html")],
            },
        };
        this.run();
    }

    reset() {
        return new Promise((resolve, reject) => {
            if (fs.existsSync(this.tempDir)) {
                fs.rmdirSync(this.tempDir, { recursive: true });
            }
            fs.mkdir(this.tempDir, error => {
                if (error) {
                    reject(error);
                }
                resolve();
            });
        });
    }

    config() {
        return new Promise((resolve, reject) => {
            if (!config) {
                resolve();
            }
            /** Update outDir */
            if (typeof config.outDir !== "undefined") {
                if (typeof config.outDir === "string") {
                    this.config.outDir = path.resolve(cwd, config.outDir);
                } else {
                    reject("Incorrect configuration: outDir must be a string.");
                }
            }

            /** Update sources array */
            if (typeof config.sources !== "undefined") {
                if (typeof config.sources === "string") {
                    this.config.outDir = path.resolve(cwd, config.outDir);
                } else if (Array.isArray(config.sources)) {
                    this.config.outDir = [];
                    for (let i = 0; i < config.sources; i++) {
                        const path = path.resolve(cwd, config.sources[i]);
                        this.config.outDir.push(path);
                    }
                } else {
                    reject("Incorrect configuration: sources must be a string or an array of strings.");
                }
            }

            /** Override CLI env value */
            if (typeof config.env !== "undefined") {
                if (typeof config.env === "string") {
                    if (config.env !== "production" || config.env !== "development" || config.env !== "dev") {
                        this.config.env = config.env;
                    } else {
                        reject(`Incorrect configuration: env must be 'production' or 'development' or 'dev'.`);
                    }
                } else {
                    reject("Incorrect configuration: env must be a boolean.");
                }
            }

            /** Set minify based on env */
            if (this.config.env === "dev" || this.config.env === "development") {
                this.config.minify = false;
            }

            /** Set purgeCSS options */
            if (typeof config.purgeCSS !== "undefined") {
                if (typeof config.purgeCSS === "object") {
                    this.config.purgeCSS = config.purgeCSS;
                } else {
                    reject("Incorrect configuration: purgeCSS must be a purgeCSS config object. See https://www.purgecss.com/configuration#options for additional information.");
                }
            }
        });
    }

    async run() {
        try {
            console.log("Running CSSMonster");
            await this.reset();
            await this.config();
            process.exit(0);
        } catch (error) {
            console.log("\n");
            console.log(error);
            console.log("\n");
            process.exit(1);
        }
    }
}
new CSSMonster();
