'use strict'

const wcwidth = require('@stackline/wcwidth')

console.log(wcwidth('A字🤦🏼‍♂️e\u0301'))
console.log(wcwidth.config({ control: -1 })('line one\nline two'))
