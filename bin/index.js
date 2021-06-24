#!/usr/bin/env node

const yargs = require("yargs");
const fs = require('fs');
const path = require('path');

const {generateAnnotationsForFileContents} = require("../src");

const options = yargs
 .usage("Usage: scribble-generate")
 .argv;

 console.log("Generating Scribble annotations for fuzz tests in current directory.")


fs.readdir(process.cwd(), (err, files) => {
    if (err) {
        console.log("Unable to generate annotations for this directory.")
    }
    solidityFiles = files
        .filter(file => file.endsWith(".sol"));

    console.log(`Instrumenting ${solidityFiles.length} solidity file(s)`)

    solidityFiles
        .forEach((file) => {
            console.log(`Generating annotations for: ${file}`);
            generateAnnotationsForFile(file);
        });
})

function generateAnnotationsForFile(filename) {
    var modifiedContents = "";
    var totalAnnotationsAdded = 0;
    
    const data = fs.readFileSync(filename, 'utf8');

    // Perform initial parse
    result = generateAnnotationsForFileContents(data);
    modifiedContents = result[0];
    totalAnnotationsAdded = result[1];

    if (totalAnnotationsAdded) {
        console.log(`Writing annotations for ${filename}`)
        fs.writeFile(filename, modifiedContents, (err) => {
            if (err) {console.error(err);}
        });
    }
    return totalAnnotationsAdded;
}