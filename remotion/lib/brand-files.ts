/**
 * Picks up whatever is in brand/fonts/ and brand/sfx/ at bundle time. Both folders start empty –
 * drop your own files in and they are used, no code change needed.
 * (require.context needs literal arguments, hence one call per folder.)
 * Hidden files are left out: macOS writes "._Name.woff2" companions on exFAT drives, and one unreadable font cancels the render.
 */
type Ctx = { keys(): string[]; (id: string): string | { default: string } };

const contexts: Record<'fonts' | 'sfx', Ctx> = {
  fonts: require.context('../../brand/fonts', false, /^\.\/[^./][^/]*\.(woff2?|ttf|otf)$/i),
  sfx: require.context('../../brand/sfx', false, /^\.\/[^./][^/]*\.(mp3|wav)$/i),
};

export type BrandFile = { name: string; ext: string; url: string };

/** Files of a brand folder: name without extension, extension in lower case, bundled URL. */
export function brandFiles(folder: keyof typeof contexts): BrandFile[] {
  const ctx = contexts[folder];
  return ctx.keys().map((key) => {
    const mod = ctx(key);
    const file = key.replace(/^\.\//, '');
    const dot = file.lastIndexOf('.');
    return { name: file.slice(0, dot), ext: file.slice(dot + 1).toLowerCase(), url: typeof mod === 'string' ? mod : mod.default };
  });
}
