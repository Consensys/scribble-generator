# Scribble Generator

Scribble generator is an add-on utility for the Scribble specification language. Scribble generator unifies testcase front-ends, and enables easier application of different tools. It does so by adding universal Scribble anotations to fuzz testcases that were written with a specific tool in mind. This allows people to use any tool compatible with Scribble on those types of test cases.

## Which types of testcases are supported

- [x] Echidna
- [x] Dapptools fuzz tests
- [ ] ~Hypothesis fuzz tests~

> Unfortunately Hypothesis testcases are written Python which makes it impossible to universify just through Scribble annotations.

## Installation
Run the following command to install scribble generator on your machine
```
npm install -g scribble-generator
```

## Usage
Run the following command in a directory with fuzz testcases. The command will look through all files and tries to find testcases that it can annotate.
```
scribble-generate
```

> You can run the command multiple times! scribble-generate will recognise when testcases are already annotated.
