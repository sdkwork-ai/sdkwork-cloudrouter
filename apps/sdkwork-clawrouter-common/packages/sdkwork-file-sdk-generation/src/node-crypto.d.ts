declare module "node:crypto" {
  export function createHash(algorithm: "sha256"): {
    update(content: string, encoding: "utf8"): {
      digest(encoding: "hex"): string;
    };
  };
}

declare module "node:fs" {
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options: { recursive: boolean }): string | undefined;
  export function readFileSync(path: string, encoding: "utf8"): string;
  export function writeFileSync(path: string, content: string, encoding: "utf8"): void;
}

declare module "node:path" {
  export function dirname(path: string): string;
  export function relative(from: string, to: string): string;
  export function resolve(...paths: string[]): string;
}
