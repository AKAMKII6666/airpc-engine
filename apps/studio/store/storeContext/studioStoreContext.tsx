/**
 * 模块名称：StudioStore React Context
 * 模块说明：Provider 内固定一份 StoreApi；子树用 selector 订阅。
 */
"use client";

import {
  createContext,
  useContext,
  useRef,
  type FC,
  type ReactNode,
} from "react";
import type { StoreApi } from "zustand/vanilla";
import { useStore } from "zustand/react";
import { useShallow } from "zustand/react/shallow";
import { createStudioStore, type StudioStore } from "@studio/store/studioStore";

const StudioStoreContext = createContext<StoreApi<StudioStore> | null>(null);

export interface IStudioStoreProviderProps {
  children: ReactNode;
}

export const StudioStoreProvider: FC<IStudioStoreProviderProps> = function (
  props,
) {
  const { children } = props;
  const storeRef = useRef<StoreApi<StudioStore> | null>(null);
  if (!storeRef.current) {
    storeRef.current = createStudioStore();
  }

  return (
    <StudioStoreContext.Provider value={storeRef.current}>
      {children}
    </StudioStoreContext.Provider>
  );
};

export function useStudioStoreContext(): StoreApi<StudioStore> | null {
  return useContext(StudioStoreContext);
}

export function useStudioStore<T>(selector: (state: StudioStore) => T): T {
  const store = useContext(StudioStoreContext);
  if (!store) {
    throw new Error("useStudioStore 必须在 StudioStoreProvider 子树内使用");
  }
  return useStore(store, selector);
}

export function useStudioStoreShallow<T>(selector: (state: StudioStore) => T): T {
  const store = useContext(StudioStoreContext);
  if (!store) {
    throw new Error("useStudioStoreShallow 必须在 StudioStoreProvider 子树内使用");
  }
  return useStore(store, useShallow(selector));
}
