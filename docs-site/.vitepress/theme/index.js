import DefaultTheme from "vitepress/theme";
import "./custom.css";

/**
 * Teldock docs theme.
 *
 * Extends the default VitePress theme and layers the Teldock brand tokens
 * (see `custom.css`) on top of it. Mermaid diagram support is wired up in
 * `.vitepress/config.mjs` through `withMermaid`.
 */
export default {
  extends: DefaultTheme,
};
