// 路徑前綴路由：讓同一份資產同時能在
//   games.csiesheep.com/elevator_inc/  與  <worker>.workers.dev/  之下運作
const PREFIX = "/elevator_inc";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === PREFIX || url.pathname.startsWith(PREFIX + "/")) {
      url.pathname = url.pathname.slice(PREFIX.length) || "/";
      request = new Request(url, request);
    }

    return env.ASSETS.fetch(request);
  },
};
