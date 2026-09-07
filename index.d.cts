declare function wcwidth(value?: unknown): number

declare namespace wcwidth {
  interface Options {
    nul?: number
    control?: number
  }

  interface ConfiguredWcwidth {
    (value?: unknown): number
  }

  function config(options?: Options | null): ConfiguredWcwidth
  const unicodeVersion: string
}

export = wcwidth
