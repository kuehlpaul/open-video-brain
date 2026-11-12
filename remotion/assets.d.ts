// Webpack assets (Remotion bundles these file types as URLs)
declare module '*.svg' {
  const url: string;
  export default url;
}
declare module '*.png' {
  const url: string;
  export default url;
}
declare module '*.wav' {
  const url: string;
  export default url;
}
declare module '*.mp3' {
  const url: string;
  export default url;
}
declare module '*.woff2' {
  const url: string;
  export default url;
}
declare module '*.jpg' {
  const url: string;
  export default url;
}

// webpack's require.context (used in remotion/lib/brand-files.ts)
declare namespace NodeJS {
  interface Require {
    context(dir: string, recursive: boolean, regExp: RegExp): { keys(): string[]; (id: string): string | { default: string } };
  }
}
