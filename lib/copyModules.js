'use strict';
const path = require('path');
const childProcess = require('child_process');
const Promise = require('bluebird');
const { copy: copyDirCb } = require('fs-extra');

const exec = Promise.promisify(childProcess.execFile);
const copyDir = Promise.promisify(copyDirCb);

const cache = new Map();

module.exports = function copyModules(projectPath, moduleNames, dest) {
  // No dependencies, just return, so that npm install would not fail.
  if (moduleNames.length === 0) {
    return Promise.resolve();
  }

  const cacheId = moduleNames.sort().join(',');
  // Reuse already created and populated node_modules configurations
  if (cache.has(cacheId)) return cache.get(cacheId).then(srcDir => copyDir(srcDir, dest));

  const pkg = require(path.join(projectPath, 'package.json'));
  const modulesAndVersions = moduleNames.map(moduleName => {
    const moduleVersion = pkg.dependencies[moduleName];

    // If no module version was found, throw an error
    if (!moduleVersion) {
      throw new Error(`Error: Could not find module ${moduleName} in package.json!`);
    }

    return `${moduleName}@${moduleVersion}`;
  });
  const opts = { cwd: path.join(dest), env: process.env };
  const args = ['install', '--production'].concat(modulesAndVersions);

  // Run 'npm install' on each module to get a full set of dependencies,
  // not just the directly copied ones.
  // Windows support credit:
  // https://github.com/nodejs/node-v0.x-archive/issues/5841#issuecomment-249355832
  const instalPromise = exec(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', args, opts);
  cache.set(cacheId, instalPromise.then(() => dest));
  return instalPromise;
};
