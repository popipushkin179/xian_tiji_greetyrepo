// Base-aware URL helper: the site is served from a GitHub Pages project subpath, and Astro's
// `base` does not rewrite paths written by hand in markup or scripts.
const RAW: string = import.meta.env.BASE_URL;
const BASE: string = RAW.endsWith('/') ? RAW : `${RAW}/`;

/** Pass a path WITHOUT a leading slash: u('frames/road/f0001.avif'). */
export function u(path: string): string {
  return `${BASE}${path.replace(/^\/+/, '')}`;
}
