import wcwidth = require('@stackline/wcwidth')
import combining = require('@stackline/wcwidth/combining')

const options: wcwidth.Options = { nul: 1, control: 0 }
const configured: wcwidth.ConfiguredWcwidth = wcwidth.config(options)
const width: number = configured('\0')
const version: string = wcwidth.unicodeVersion
const firstRange: [number, number] | undefined = combining[0]

void [width, version, firstRange]
