import wcwidth = require('../../..')

const options: wcwidth.Options = { nul: 0, control: -1 }
const configured: wcwidth.ConfiguredWcwidth = wcwidth.config(options)
const directWidth: number = wcwidth('字')
const configuredWidth: number = configured('\n')
const unicodeVersion: string = wcwidth.unicodeVersion

void [directWidth, configuredWidth, unicodeVersion]
