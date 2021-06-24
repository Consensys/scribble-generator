const TreeSitterParser = require('tree-sitter');
const Solidity = require('tree-sitter-solidity');
const {Query, QueryCursor} = TreeSitterParser;

const fs = require('fs');
const { boolean } = require('yargs');

function generateAnnotationsForFileContents(fileContents) {
    const parser = new TreeSitterParser();
    parser.setLanguage(Solidity);

    var totalAnnotationsAdded = 0;

    var tree = parser.parse(fileContents);
    var modifiedContents = fileContents;

    // Add annotations
    result = generateEchidnaAnnotations(modifiedContents, tree);
    modifiedContents = result[0];
    nrAnnotations = result[1];
    totalAnnotationsAdded += nrAnnotations;

    // Return annotated file
    return [modifiedContents, totalAnnotationsAdded];
}

function insertAnnotation(fileContents, index, insertedString) {
    return fileContents.slice(0, index) + insertedString + fileContents.slice(index)
}

function generateEchidnaAnnotations(fileContents, tree) {
    const query =  new Query(Solidity, '(function_definition) @element');
    const originalLength = fileContents.length;
    var charactersAdded = 0;
    var annotationsAdded = 0;
    var modifiedContents = fileContents;
    query.matches(tree.rootNode).forEach(function(node) {
        functionNode = node.captures[0].node;
        functionName = functionNode.functionNameNode;

        if (!functionName.text.startsWith("echidna")) {
            return
        }
        var lineprefix = fileContents.slice(functionNode.startIndex - functionNode.startPosition['column'], functionNode.startIndex);
        var annotationPostfix = "";
        if (/\t*| */.test(lineprefix)) {
            annotationPostfix = lineprefix;
        }
        const returnsBool = functionNode.returnTypeNode.namedChildren.length == 1 && functionNode.returnTypeNode.namedChildren[0].typeNode.text == "bool";
        if (modifiedContents.includes(`"Echidna Property: ${functionName.text}"`)) {
            // The property was already instrumented
            return;
        }    

        var annotation = "";    
        if (functionName.text.startsWith("echidna_revert")) {
            annotation = `///#if_succeeds {:msg "Echidna Property: ${functionName.text}"} false;\n` + annotationPostfix;
        } else if (returnsBool) {
            annotation = `///#if_succeeds {:msg "Echidna Property: ${functionName.text}"} $result;\n` + annotationPostfix;
        } else {
            // In this case assertions are being used
            return;
        }

        modifiedContents = insertAnnotation(modifiedContents, functionNode.startIndex + charactersAdded, annotation);
        charactersAdded = modifiedContents.length - originalLength;
        annotationsAdded++;
    })
    return [modifiedContents, annotationsAdded];
}

exports.generateAnnotationsForFileContents = generateAnnotationsForFileContents;