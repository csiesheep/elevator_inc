// Cloudflare Worker: path-prefix router in front of the static assets.
// `run_worker_first: true` (wrangler.jsonc) sends every request here before
// asset matching, so we can strip the `/elevator_inc` prefix and still serve from
// the bare *.workers.dev root while testing.
//
// The public path segment is independent of the repo / Worker name — change
// PREFIX alone to move the site to a different path.
const PREFIX = "/elevator_inc";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Two shapes reach us: the bare prefix and everything under it. The Route
    // patterns in wrangler.jsonc list both, because `/*` does not match the
    // bare prefix. Send the bare form to the canonical trailing slash so
    // relative asset hrefs (css/style.css) resolve against /elevator_inc/ and not
    // against the host root.
    if (url.pathname === "/" || url.pathname === PREFIX) {
      url.pathname = PREFIX + "/";
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname.startsWith(PREFIX + "/")) {
      url.pathname = url.pathname.slice(PREFIX.length) || "/";
      const response = await env.ASSETS.fetch(new Request(url, request));

      // The static-asset handler redirects .html requests to their
      // extensionless equivalent, but it builds Location from the url we just
      // stripped the prefix off — so /elevator_inc/game.html would point at a bare
      // /game, which escapes this Worker and 404s on the hub. Put the prefix
      // back on any same-origin redirect it hands us. (Same fix as
      // jiangshi_in_the_pocket / oops_inc, where this was found in production.)
      const location = response.headers.get("location");
      if (location) {
        const target = new URL(location, url);
        if (
          target.origin === url.origin &&
          target.pathname !== PREFIX &&
          !target.pathname.startsWith(PREFIX + "/")
        ) {
          target.pathname = PREFIX + target.pathname;
          const headers = new Headers(response.headers);
          headers.set("location", target.toString());
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
        }
      }

      return response;
    }

    return new Response("Not found", { status: 404 });
  },
};
