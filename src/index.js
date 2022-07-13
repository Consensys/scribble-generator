const TreeSitterParser = require('tree-sitter')
const Solidity = require('tree-sitter-solidity')

const { Query } = TreeSitterParser

function generateAnnotationsForFileContents(fileContents) {
    const parser = new TreeSitterParser()
    parser.setLanguage(Solidity)

    let totalAnnotationsAdded = 0

    let tree = parser.parse(fileContents)
    let modifiedContents = fileContents

    // Add annotations
    let result = generateEchidnaAnnotations(modifiedContents, tree)
    modifiedContents = result[0]
    let nrAnnotations = result[1]
    totalAnnotationsAdded += nrAnnotations

    tree = parser.parse(modifiedContents)
    result = generateDSAnnotations(modifiedContents, tree)
    modifiedContents = result[0]
    nrAnnotations = result[1]
    totalAnnotationsAdded += nrAnnotations

    // Return annotated file
    return [modifiedContents, totalAnnotationsAdded]
}

function insertAnnotation(fileContents, index, insertedString) {
    return (
        fileContents.slice(0, index) +
        insertedString +
        fileContents.slice(index)
    )
}

function generateEchidnaAnnotations(fileContents, tree) {
    const query = new Query(Solidity, '(function_definition) @element')
    const originalLength = fileContents.length
    let charactersAdded = 0
    let annotationsAdded = 0
    let modifiedContents = fileContents
    query.matches(tree.rootNode).forEach((node) => {
        const functionNode = node.captures[0].node
        const functionName = functionNode.functionNameNode

        if (!functionName.text.startsWith('echidna')) {
            return
        }
        const lineprefix = fileContents.slice(
            functionNode.startIndex - functionNode.startPosition.column,
            functionNode.startIndex
        )
        let annotationPostfix = ''
        if (/\t*| */.test(lineprefix)) {
            annotationPostfix = lineprefix
        }
        const returnsBool =
            functionNode.returnTypeNode.namedChildren.length == 1 &&
            functionNode.returnTypeNode.namedChildren[0].typeNode.text == 'bool'
        if (modifiedContents.includes(`"Echidna: ${functionName.text}"`)) {
            // The property was already instrumented
            return
        }

        let annotation = ''
        if (functionName.text.startsWith('echidna_revert')) {
            annotation = `///#if_succeeds {:msg "Echidna: ${functionName.text}"} false;\n${annotationPostfix}`
        } else if (returnsBool) {
            annotation = `///#if_succeeds {:msg "Echidna: ${functionName.text}"} $result;\n${annotationPostfix}`
        } else {
            // In this case assertions are being used
            return
        }

        modifiedContents = insertAnnotation(
            modifiedContents,
            functionNode.startIndex + charactersAdded,
            annotation
        )
        charactersAdded = modifiedContents.length - originalLength
        annotationsAdded++
    })
    return [modifiedContents, annotationsAdded]
}

function generateDSAnnotations(fileContents, tree) {
    const contractQuery = new Query(Solidity, '(contract_declaration) @element')
    const functionQuery = new Query(Solidity, '(function_definition) @element')
    const originalLength = fileContents.length
    let modifiedContents = fileContents
    const functions = []
    let annotationsAdded = 0

    contractQuery.matches(tree.rootNode).forEach((result) => {
        const contractNode = result.captures[0].node
        if (!contractNode.ancestorNodes) {
            return
        }
        if (!contractNode.ancestorNodes.map((e) => e.text).includes('DSTest')) {
            return
        }
        functionQuery.matches(contractNode).forEach((result) => {
            functions.push(result.captures[0].node)
        })
    })

    functions.forEach((functionNode) => {
        const functionName = functionNode.functionNameNode

        if (!functionName.text.startsWith('test')) {
            return
        }
        if (
            modifiedContents.includes(`{:msg "DSTest: ${functionName.text}"}`)
        ) {
            // The property was already instrumented
            return
        }

        const lineprefix = fileContents.slice(
            functionNode.startIndex - functionNode.startPosition.column,
            functionNode.startIndex
        )
        let annotationPostfix = ''
        if (/\t*| */.test(lineprefix)) {
            annotationPostfix = lineprefix
        }

        const annotation = `///#if_succeeds {:msg "DSTest: ${functionName.text}"} !dstest.failed;\n${annotationPostfix}`

        const charactersAdded = modifiedContents.length - originalLength
        modifiedContents = insertAnnotation(
            modifiedContents,
            functionNode.startIndex + charactersAdded,
            annotation
        )
        annotationsAdded++
    })
    return [modifiedContents, annotationsAdded]
}

exports.generateAnnotationsForFileContents = generateAnnotationsForFileContents
