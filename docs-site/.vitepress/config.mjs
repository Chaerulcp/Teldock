import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

const REPO_URL = "https://github.com/Chaerulcp/Teldock";
const ISSUES_URL = `${REPO_URL}/issues`;

/**
 * Build the sidebar for a locale. `prefix` is `''` for English (root locale)
 * and `'/id'` for the Indonesian locale.
 */
function buildSidebar(prefix) {
  return [
    {
      text: "Getting Started",
      items: [
        { text: "Introduction", link: `${prefix}/guide/introduction` },
        { text: "Features", link: `${prefix}/guide/features` },
        { text: "Architecture", link: `${prefix}/guide/architecture` },
      ],
    },
    {
      text: "Setup",
      items: [
        { text: "Installation", link: `${prefix}/guide/installation` },
        { text: "Connecting Telegram", link: `${prefix}/guide/telegram-setup` },
        { text: "Configuration", link: `${prefix}/guide/configuration` },
      ],
    },
    {
      text: "User Guide",
      items: [
        { text: "Using Teldock", link: `${prefix}/guide/usage` },
        { text: "Sharing Files", link: `${prefix}/guide/sharing` },
        { text: "Multi-Bot Pool", link: `${prefix}/guide/multibot` },
        { text: "WebDAV & Rclone", link: `${prefix}/guide/webdav` },
      ],
    },
    {
      text: "Operations",
      items: [
        { text: "Deployment", link: `${prefix}/guide/deployment` },
        { text: "Security", link: `${prefix}/guide/security` },
        { text: "Troubleshooting & FAQ", link: `${prefix}/guide/troubleshooting` },
      ],
    },
    {
      text: "Reference",
      items: [
        { text: "API Reference", link: `${prefix}/reference/api` },
        { text: "Environment Variables", link: `${prefix}/reference/configuration` },
        { text: "Database Schema", link: `${prefix}/reference/database-schema` },
        { text: "Project Structure", link: `${prefix}/reference/project-structure` },
      ],
    },
    {
      text: "Community",
      items: [
        { text: "Contributing", link: `${prefix}/contributing` },
        { text: "Changelog", link: `${prefix}/changelog` },
      ],
    },
  ];
}

function buildNav(prefix) {
  return [
    { text: "Guide", link: `${prefix}/guide/introduction`, activeMatch: `${prefix}/guide/` },
    {
      text: "Reference",
      link: `${prefix}/reference/api`,
      activeMatch: `${prefix}/reference/`,
    },
    { text: "Contributing", link: `${prefix}/contributing` },
    { text: "Changelog", link: `${prefix}/changelog` },
  ];
}

export default withMermaid(
  defineConfig({
    // GitHub Pages project site: https://chaerulcp.github.io/Teldock/
    base: "/Teldock/",
    title: "Teldock",
    description:
      "Self-hosted cloud storage that uses your own Telegram bot and private channel as the storage backend.",

    lastUpdated: true,
    cleanUrls: true,
    ignoreDeadLinks: false,

    head: [
      ["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
      ["meta", { name: "theme-color", content: "#229ED9" }],
      ["meta", { property: "og:type", content: "website" }],
      ["meta", { property: "og:title", content: "Teldock Documentation" }],
      [
        "meta",
        {
          property: "og:description",
          content:
            "Install, configure and use Teldock — self-hosted cloud storage backed by Telegram.",
        },
      ],
      ["meta", { name: "twitter:card", content: "summary_large_image" }],
    ],

    markdown: {
      lineNumbers: true,
      theme: { light: "github-light", dark: "github-dark" },
    },

    mermaid: {
      theme: "neutral",
    },

    themeConfig: {
      logo: "/logo.svg",
      outline: { level: [2, 3], label: "On this page" },
      socialLinks: [{ icon: "github", link: REPO_URL }],
      editLink: {
        pattern: `${REPO_URL}/edit/main/docs-site/:path`,
        text: "Edit this page on GitHub",
      },
      footer: {
        message: "Released under the MIT License.",
        copyright: "Teldock — self-hosted Telegram-backed cloud storage.",
      },
      search: {
        provider: "local",
        options: {
          translations: {
            button: {
              buttonText: "Search",
              buttonAriaLabel: "Search",
            },
            modal: {
              noResultsText: "No results found for",
              resetButtonTitle: "Clear",
              footer: {
                selectText: "Select",
                navigateText: "Navigate",
                closeText: "Close",
              },
            },
          },
        },
      },
    },

    locales: {
      root: {
        label: "English",
        lang: "en",
        themeConfig: {
          nav: buildNav(""),
          sidebar: buildSidebar(""),
          outline: { level: [2, 3], label: "On this page" },
          docFooter: { prev: "Previous page", next: "Next page" },
          lastUpdated: {
            text: "Last updated",
            formatOptions: { dateStyle: "short", timeStyle: "short" },
          },
          editLink: {
            pattern: `${REPO_URL}/edit/main/docs-site/:path`,
            text: "Edit this page on GitHub",
          },
        },
      },
      id: {
        label: "Bahasa Indonesia",
        lang: "id",
        themeConfig: {
          nav: buildNav("/id"),
          sidebar: buildSidebar("/id"),
          outline: { level: [2, 3], label: "Di halaman ini" },
          docFooter: { prev: "Sebelumnya", next: "Berikutnya" },
          lastUpdated: {
            text: "Terakhir diperbarui",
            formatOptions: { dateStyle: "short", timeStyle: "short" },
          },
          editLink: {
            pattern: `${REPO_URL}/edit/main/docs-site/:path`,
            text: "Edit halaman ini di GitHub",
          },
          search: {
            provider: "local",
            options: {
              translations: {
                button: {
                  buttonText: "Cari",
                  buttonAriaLabel: "Cari",
                },
                modal: {
                  noResultsText: "Tidak ada hasil untuk",
                  resetButtonTitle: "Bersihkan",
                  footer: {
                    selectText: "Pilih",
                    navigateText: "Navigasi",
                    closeText: "Tutup",
                  },
                },
              },
            },
          },
        },
      },
    },
  }),
);
