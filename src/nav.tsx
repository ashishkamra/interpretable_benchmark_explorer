import { createContext, useContext } from "react";

export interface NavigateOptions {
  replace?: boolean;
}

export type Navigate = (to: string, options?: NavigateOptions) => void;

export const NavigateContext = createContext<Navigate>(() => {});

export function useNavigate(): Navigate {
  return useContext(NavigateContext);
}
