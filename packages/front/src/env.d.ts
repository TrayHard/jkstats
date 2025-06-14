/// <reference types="vite/client" />

declare module '*.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface ImportMetaEnv {
  readonly VITE_APP_API_URL_LOCAL: string;
  readonly VITE_APP_API_URL_RUJKA: string;
  readonly VITE_APP_API_URL_JKHUB: string;
  // add more env variables here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
} 