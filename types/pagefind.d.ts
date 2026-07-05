import type { DetailedHTMLProps, HTMLAttributes } from "react";

/**
 * Ambient types for Pagefind 1.5.x Component UI custom elements.
 * These elements are registered globally by /pagefind/pagefind-component-ui.js
 * at runtime and render no children server-side.
 * See https://pagefind.app/docs/ui-component
 *
 * React 19 moved the JSX namespace from global `JSX` to `React.JSX`,
 * so we augment `React.JSX.IntrinsicElements` here.
 */

interface PagefindInputElement extends DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> {
  placeholder?: string;
  instance?: string;
}

interface PagefindSummaryElement extends DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> {
  instance?: string;
}

interface PagefindResultsElement extends DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> {
  instance?: string;
  "page-size"?: number;
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "pagefind-input": PagefindInputElement;
      "pagefind-summary": PagefindSummaryElement;
      "pagefind-results": PagefindResultsElement;
    }
  }
}
