/// <reference types="vite/client" />

// Vite `?worker` import suffix (Monaco editor workers).
declare module '*?worker' {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}
