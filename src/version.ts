import pkg from '../package.json';

/** Single source of truth for the shown app version (matches git tag `v{version}`). */
export const APP_VERSION: string = pkg.version;
