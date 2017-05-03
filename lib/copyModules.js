'use strict';
const path = require('path');
const childProcess = require('child_process');

module.exports = function copyModules(projectPath, moduleNames, dest, SCli) {

  // No dependencies, just return, so that npm install would not fail.
  if (moduleNames.length === 0) {
    return Promise.resolve();
  }

  const pkg = require(path.join(projectPath, 'package.json'));
  const modulesAndVersions = moduleNames.map(moduleName => {
    const moduleVersion = pkg.dependencies[moduleName];

    // If no module version was found, throw an error
    if (!moduleVersion) {
      throw new Error(`Error: Could not find module ${moduleName} in package.json!`);
    }

    return `${moduleName}@${moduleVersion}`;
  });

  // FIXME For some reason, yarn must be executed one level upper than npm
  const opts = { cwd: path.join(dest, '..'), env: process.env };
  const args = ['add', '--exact'].concat(modulesAndVersions);
  const yarnPath = path.join(projectPath, 'node_modules/.bin/yarn');

  // Run 'npm install' on each module to get a full set of dependencies,
  // not just the directly copied ones.
  return new Promise((resolve, reject) => {
    childProcess.execFile(yarnPath, args, opts, (error, stdout, stderr) => {
      SCli.log(stdout);

      if (error) {
        SCli.log(`Error : ${stderr}`);
        reject(error);
      }
      resolve();
    });
  });
};
