import { registerHostAdapters } from "./hostAdapters";
import { createIamRuntime } from "./iamRuntime";

export function bootstrap() {
  registerHostAdapters();
  createIamRuntime();
}
