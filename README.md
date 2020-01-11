# CSSMonster

CSSMonster helps developers manage [normalize.css](https://www.npmjs.com/package/normalize.css?activeTab=versions), [node-sass](https://www.npmjs.com/package/node-sass), and [purgeCSS](https://www.npmjs.com/package/purgecss) with ease. Minimum required Nodejs version [12.10.0](https://nodejs.org/en/download/).

## Installation

Install the package:

```bash
npm i --save cssmonster
```

Add the build script:

```json
"scripts": {
    "exmaple": "cssmonster"
}
```

Setup the config file:

#### cssmonster.config.js

```javascript
module.exports = {
    sources: "./src", // Also accepts an array
    purgeCSS: {
        content: ["./templates/**/*.html"],
    },
};
```

Run the command:

```bash
npm run exmaple
```

## Configuration

Out of the box CSSMonster does not require a config file. The exmample below will show the default values.

#### cssmonster.config.js

```javascript
module.exports = {
    env: "production", // Accepts 'production' or 'dev' or 'development', is overridden by the --env flag
    outDir: "cssmonster",
    sources: "./src", // Also accepts an array
    minify: true, // Forced to false when env is 'dev' or 'development', setting to false disables on production
    purge: true, // Forced to false when env is 'dev' or 'development', setting to false disables on produciton
    purgeCSS: {
        content: ["**/*.html"],
    },
    blacklist: [],
};
```

> Note: `purgeCSS` accepts the purgecss options object. See https://www.purgecss.com/configuration#options for additional information.

## CLI Flags

The `--env` flag will override the config `env` value.

```bash
    --env       # development | dev | production
    --config    # Path to config file
```
