# CSSMonster

CSSMonster helps developers manage [normalize.css](https://www.npmjs.com/package/normalize.css?activeTab=versions), [sass](https://www.npmjs.com/package/sass), and [PurgeCSS](https://www.npmjs.com/package/purgecss) with ease.

Requries Nodejs version [16.0.0](https://nodejs.org/en/download/) or later.

## Installation

Install the NPM packages:

```bash
npm i -D cssmonster sass@1
```

Prepare the npm script:

```json
"scripts": {
    "build:css": "cssmonster"
}
```

Add the config file:

#### cssmonster.config.json

```json
{
    "sources": "./src", // Also accepts an array
}
```

Run the command:

```bash
npm run build:css
```

## Configuration

Out of the box CSSMonster does not require a config file. The exmample below will show the default values.

#### cssmonster.config.json

```json
{
    "env": "production", // Accepts 'production' or 'dev' or 'development', is overridden by the --env flag
    "outDir": "cssmonster",
    "sources": "./src", // Also accepts an array
    "minify": true, // Forced to false when env is 'dev' or 'development' -- setting to false disables on production
    "purge": false, // Forced to false when env is 'dev' or 'development' -- setting to false disables on produciton
    "purgeCSS": null,
    "blacklist": [],
    "include": [], // Paths that will be included while compiling the SCSS
    "autoresolve": false, // when true files with the same name are merged together
}
```

> Note: `purgeCSS` accepts the purgecss options object. See https://www.purgecss.com/configuration#options for additional information.

## CLI Flags

The `--env` flag will override the config `env` value.

```bash
    --env       # development | dev | production
    --config    # Path to config file
```

## Normalize CSS

This project uses [normalize.css](https://github.com/necolas/normalize.css) and a custom [preflight.css](https://github.com/codewithkyle/cssmonster/blob/master/preflight.css) to create a base for developers to work off of. The files are merged together and output as a single file named `normalize.css`

You can extend the file by creating your own `normalize.css` or `normalize.scss` file within one of the provided `sources` directories. The file will be appended to the output CSS file.
