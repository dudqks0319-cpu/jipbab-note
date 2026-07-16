import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Keep the first Cloudflare candidate free-tier friendly: no R2/KV cache binding
  // is required until ISR/tag revalidation is intentionally introduced.
  incrementalCache: "dummy",
  tagCache: "dummy",
  queue: "dummy",
  cachePurge: "dummy",
});
