/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize(config: {
          client_id: string;
          callback: (response: { credential: string }) => void;
          auto_select?: boolean;
        }): void;
        renderButton(
          parent: HTMLElement,
          options: {
            theme?: "outline" | "filled_blue" | "filled_black";
            size?: "small" | "medium" | "large";
            width?: number | string;
            text?: "signin_with" | "signup_with" | "continue_with" | "signin";
            shape?: "rectangular" | "pill" | "circle" | "square";
            logo_alignment?: "left" | "center";
          }
        ): void;
      };
    };
  };
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
