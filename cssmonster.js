#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const glob = require("glob");
const semver = require("semver");
const sass = require("node-sass");
const yargs = require("yargs").argv;
const minify = require("minify");
const Purgecss = require("purgecss");

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
            blacklist: [],
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
                    this.config.sources = [path.resolve(cwd, config.sources)];
                } else if (Array.isArray(config.sources)) {
                    this.config.sources = [];
                    for (let i = 0; i < config.sources; i++) {
                        const path = path.resolve(cwd, config.sources[i]);
                        this.config.sources.push(path);
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

            /** Update sources array */
            if (typeof config.blacklist !== "undefined") {
                if (typeof config.blacklist === "string") {
                    this.config.blacklist = [path.resolve(cwd, config.blacklist)];
                } else if (Array.isArray(config.blacklist)) {
                    this.config.blacklist = [];
                    for (let i = 0; i < config.blacklist; i++) {
                        const path = path.resolve(cwd, config.blacklist[i]);
                        this.config.blacklist.push(path);
                    }
                } else {
                    reject("Incorrect configuration: blacklist must be a string or an array of strings.");
                }
            }
        });
    }

    removeIgnored(files) {
        return new Promise(resolve => {
            if (!files.length || !this.config.blacklist.length) {
                resolve(files);
            }
            const cleanFiles = [];
            for (let i = 0; i < files.length; i++) {
                let clean = true;
                for (let k = 0; k < this.config.blacklist.length; k++) {
                    const pathname = path.normalize(`/${this.config.blacklist[k]}/`);
                    if (new RegExp(pathname, "gi").test(files[i])) {
                        clean = false;
                        break;
                    }
                }
                if (clean) {
                    cleanFiles.push(files[i]);
                }
            }
            resolve(cleanFiles);
        });
    }

    getCSSFiles() {
        return new Promise((resolve, reject) => {
            if (!this.config.sources.length) {
                reject("Missing source paths.");
            }
            let files = [];
            for (let i = 0; i < this.config.sources; i++) {
                const newFiles = glob.sync(`${this.config.sources[i]}/**/*.css`);
                files = [...files, ...newFiles];
            }
            resolve(files);
        });
    }

    copyCSS(files) {
        return new Promise((resolve, reject) => {
            if (!files.length) {
                resolve();
            }
            let moved = 0;
            for (let i = 0; i < files.length; i++) {
                const filename = files[i].replace(/(.*\/)|(.*\\)/);
                if (this.config.minify) {
                    minify(files[i])
                        .then(css => {
                            fs.writeFile(`${this.tempDir}/${filename}`, css, error => {
                                if (error) {
                                    reject(error);
                                }
                                moved++;
                                if (moved === files.length) {
                                    resolve();
                                }
                            });
                        })
                        .catch(error => {
                            reject(error);
                        });
                } else {
                    fs.copyFile(files[i], `${this.tempDir}/${filename}`, error => {
                        if (error) {
                            reject(error);
                        }
                        moved++;
                        if (moved === files.length) {
                            resolve();
                        }
                    });
                }
            }
        });
    }

    getSCSSFiles() {
        return new Promise((resolve, reject) => {
            if (!this.config.sources.length) {
                reject("Missing source paths.");
            }
            let files = [];
            for (let i = 0; i < this.config.sources; i++) {
                const newFiles = glob.sync(`${this.config.sources[i]}/**/*.scss`);
                files = [...files, ...newFiles];
            }
            resolve(files);
        });
    }

    compileSCSS(files) {
        return new Promise((resolve, reject) => {
            if (!files.length) {
                resolve();
            }
            let compiled = 0;
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                sass.render(
                    {
                        file: file,
                        outputStyle: this.config.minify ? "compressed" : "expanded",
                    },
                    (error, result) => {
                        if (error) {
                            reject(`SCSS Error: ${error.message} at line ${error.line} ${error.file}`);
                        } else {
                            let fileName = result.stats.entry.replace(/(.*\/)|(.*\\)/).replace(/(.scss)$/g, "");
                            if (fileName) {
                                const newFile = `${this.tempDir}/${fileName}.css`;
                                fs.writeFile(newFile, result.css.toString(), error => {
                                    if (error) {
                                        reject("Something went wrong saving the file" + error);
                                    }
                                    compiled++;
                                    if (compiled === files.length) {
                                        resolve();
                                    }
                                });
                            } else {
                                reject("Something went wrong with the file name of " + result.stats.entry);
                            }
                        }
                    }
                );
            }
        });
    }

    purgeCSS() {
        return new Promise((resolve, reject) => {
            const purgeCSSConfig = this.config.purgeCSS;
            purgeCSSConfig.css = [`${this.tempDir}/**/*.css`];
            const purgeCss = new Purgecss(purgeCSSConfig);
            const purgecssResult = purgeCss.purge();
            let purged = 0;
            purgecssResult.forEach(result => {
                const filename = result.file.replace(/(.*\/)|(.*\\)/, "");
                fs.unlink(result.file, error => {
                    if (error) {
                        reject(error);
                    }
                    fs.writeFile(result.file, result.css, error => {
                        if (error) {
                            reject(error);
                        }
                        purged++;
                        if (purged === purgecssResult.length) {
                            resolve();
                        }
                    });
                });
            });
        });
    }

    deliverCSS() {
        return new Promise((resolve, reject) => {
            if (fs.existsSync(this.config.outDir)) {
                fs.rmdirSync(this.config.outDir, { recursive: true });
            }
            fs.rename(this.tempDir, this.config.outDir, error => {
                if (error) {
                    reject(error);
                }
                resolve();
            });
        });
    }

    cleanup() {
        return new Promise(resolve => {
            if (fs.existsSync(this.tempDir)) {
                fs.rmdirSync(this.tempDir, { recursive: true });
            }
            resolve();
        });
    }

    async run() {
        try {
            /** Preflight */
            console.log("Running CSSMonster");
            await this.reset();
            await this.config();

            /** Handle CSS */
            let cssFiles = await this.getCSSFiles();
            cssFiles = await this.removeIgnored(cssFiles);
            await this.copyCSS(cssFiles);

            /** Handle SCSS */
            let scssFiles = await this.getSCSSFiles();
            scssFiles = await this.removeIgnored(scssFiles);
            await this.compileSCSS(scssFiles);

            /** PurgeCSS */
            await prugeCSS();

            /** Deliver CSS */
            await deliverCSS();

            /** Finalize */
            await this.cleanup();

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
