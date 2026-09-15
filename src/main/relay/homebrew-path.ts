export function configureHomebrewPath(packaged: boolean): void {
  // Finder launches do not inherit Homebrew's shell PATH.
  if (packaged && process.platform === 'darwin') {
    process.env.PATH = [
      ...new Set([
        '/opt/homebrew/bin',
        '/usr/local/bin',
        ...(process.env.PATH || '/usr/bin:/bin:/usr/sbin:/sbin').split(':')
      ])
    ].join(':')
  }
}
