import { defineConfig } from "astro/config";
import shirones from "shirones";

// Site-level settings (site URL, base, title, theme colour, fonts, …) live in
// `shirones/config/` so they stay typed and version-controlled with your
// content. This file only wires the theme in.
export default defineConfig({
  integrations: [
    shirones({
      // Windows 上集成的 pagefind Node API 会因路径问题崩溃，
      // 搜索索引改由 package.json 的 build 脚本用 pagefind CLI 生成。
      pagefind: false,
    }),
  ],
});
