export interface WcwidthOptions {
  nul?: number
  control?: number
}

export interface ConfiguredWcwidth {
  (value?: unknown): number
}

export interface Wcwidth {
  (value?: unknown): number
  config(options?: WcwidthOptions | null): ConfiguredWcwidth
  readonly unicodeVersion: string
}

declare const wcwidth: Wcwidth
export declare const config: Wcwidth['config']
export declare const unicodeVersion: string
export default wcwidth
