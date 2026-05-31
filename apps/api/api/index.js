// Vercel serverless entrypoint for the NestJS API.
//
// Plain JavaScript that imports the COMPILED output (../dist), because Vercel
// bundles functions with esbuild, which does NOT emit the decorator metadata
// (emitDecoratorMetadata) NestJS DI relies on. `tsc` (the build step) emits that
// metadata into dist/, so we run the compiled app at runtime.
//
// An Express instance IS itself a (req, res) handler, so we hand Vercel the
// Express app directly — no serverless-http needed.
const express = require('express');
const { createApp } = require('../dist/app.factory');

let appPromise;

function getExpressApp() {
  if (!appPromise) {
    appPromise = (async () => {
      const expressApp = express();
      const nestApp = await createApp(expressApp);
      await nestApp.init();
      return expressApp;
    })();
  }
  return appPromise;
}

module.exports = async (req, res) => {
  const app = await getExpressApp();
  return app(req, res);
};
