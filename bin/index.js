#!/usr/bin/env node

const yargs = require('yargs');
const fs = require('fs');
const path = require('path');

const {generateAnnotationsForFileContents} = require('../src');
const {logger} = require('../src/logger')

const cmdOptions = yargs
    .usage("Usage: scribble-generate")
    .option('t', {
      'alias': 'targets',
      'array': true,
      'demandOption': true,
      'description': 'targets to automatically annotate',
      'requiresArg': true,
    })
    .argv;

function readDirectory(dir){
  let all_files = [];
  try {
    const files = fs.readdirSync(dir);
    for (let file of files){
      const file_path = path.resolve(dir, file);
      if (file.endsWith('.sol')){
        all_files.push(file_path);
        continue;
      }
      try {
        const stat = fs.statSync(file_path);
        if (stat.isDirectory()){
          all_files = all_files.concat(readDirectory(file_path));
        }
      } catch (e) {
        logger.warn(`${e}. Skipping target`);
      }
    }
  } catch {
    logger.warn(`Unable to generate annotations for the directory ${targetPath}. Skipping target`)
  }
  return all_files;
}

function run(options){
  logger.info("Generating Scribble annotations for fuzz tests")
  const targets = options["targets"]
  for (let target of targets){
    const targetPath = path.resolve(target)
    try {
      const stat = fs.statSync(targetPath);
      let files = [];
      if (stat.isDirectory()){
        files = readDirectory(targetPath)
        if (files.length === 0) {
          continue;
        }
      } else {
        files = [targetPath];
      }
      logger.info(`Instrumenting ${files.length} solidity file(s) for target "${targetPath}"`);
      for (let file of files){
        logger.debug(`Generating annotations for "${file}"`);
        generateAnnotationsForFile(file);
      }
    } catch (e) {
      logger.warn(`${e}. Skipping target`);
    }
  }
}

function generateAnnotationsForFile(filename) {
    var modifiedContents = "";
    var totalAnnotationsAdded = 0;

    const data = fs.readFileSync(filename, 'utf8');

    // Perform initial parse
    result = generateAnnotationsForFileContents(data);
    modifiedContents = result[0];
    totalAnnotationsAdded = result[1];

    if (totalAnnotationsAdded) {
        let originalName = filename.split('.').slice(0, -1).join('.')
        fs.copyFileSync(filename, `${originalName}.sol.sg_original`)
        console.log(`Writing annotations for ${filename}`)
        fs.writeFile(filename, modifiedContents, (err) => {
            if (err) {console.error(err);}
        });
    }
    return totalAnnotationsAdded;
}

run(cmdOptions);
