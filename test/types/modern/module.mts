import wcwidth, {
  config,
  unicodeVersion,
  type ConfiguredWcwidth,
  type WcwidthOptions
} from '@stackline/wcwidth'
import wcwidthFromHistoricalPath, {
  config as configFromHistoricalPath,
  unicodeVersion as unicodeVersionFromHistoricalPath
} from '@stackline/wcwidth/index.js'

const options: WcwidthOptions = { control: -1 }
const configured: ConfiguredWcwidth = config(options)
const directWidth: number = wcwidth('🤦🏼‍♂️')
const configuredWidth: number = configured('\n')
const version: string = unicodeVersion
const historicalPathWidth: number = wcwidthFromHistoricalPath('字')
const historicalConfiguredWidth: number = configFromHistoricalPath({ nul: 3 })('\0')
const historicalVersion: string = unicodeVersionFromHistoricalPath

void [directWidth, configuredWidth, version, historicalPathWidth, historicalConfiguredWidth, historicalVersion]
