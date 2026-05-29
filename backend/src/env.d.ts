declare module "cloudflare:test" {
  export const env: any;
  export function createExecutionContext(): any;
  export function waitOnExecutionContext(ctx: any): Promise<void>;
}
