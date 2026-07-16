declare module "turndown" {
  type Filter = string | string[] | ((node: HTMLElement, options: Record<string, unknown>) => boolean);

  type Rule = {
    filter: Filter;
    replacement: (content: string, node: HTMLElement, options: Record<string, unknown>) => string;
  };

  export default class TurndownService {
    constructor(options?: Record<string, unknown>);
    addRule(name: string, rule: Rule): this;
    turndown(input: string | HTMLElement): string;
    use(plugin: (service: TurndownService) => void): this;
  }
}

declare module "turndown-plugin-gfm" {
  import type TurndownService from "turndown";

  export function gfm(service: TurndownService): void;
}
