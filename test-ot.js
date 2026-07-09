// test-ot.js
const { transform, applyOperation } = require('./ot');

let text = "Hello";
const opA = { type: 'insert', position: 5, char: 'X', userId: 1 };
const opB = { type: 'insert', position: 5, char: 'Y', userId: 2 };

text = applyOperation(text, opA);              // "HelloX"
const transformedB = transform(opA, opB);      // shifts B's position
text = applyOperation(text, transformedB);     // "HelloXY"

console.log(text); // should be "HelloXY", not corrupted