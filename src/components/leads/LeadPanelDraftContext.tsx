"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
} from "react";

type SaveFn = () => void | Promise<void>;
type CloseGuardFn = () => boolean;
type Unregister = () => void;

interface LeadPanelDraftContextValue {
  registerPendingSave: (fn: SaveFn) => Unregister;
  registerCloseGuard: (fn: CloseGuardFn) => Unregister;
  flushPendingSaves: () => Promise<void>;
  requestClose: () => Promise<boolean>;
}

const LeadPanelDraftContext =
  createContext<LeadPanelDraftContextValue | null>(null);

export function LeadPanelDraftProvider({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  const pending = useRef(new Set<SaveFn>());
  const guards = useRef(new Set<CloseGuardFn>());

  const registerPendingSave = useCallback((fn: SaveFn) => {
    pending.current.add(fn);
    return () => {
      pending.current.delete(fn);
    };
  }, []);

  const registerCloseGuard = useCallback((fn: CloseGuardFn) => {
    guards.current.add(fn);
    return () => {
      guards.current.delete(fn);
    };
  }, []);

  const flushPendingSaves = useCallback(async () => {
    const fns = Array.from(pending.current);
    await Promise.all(fns.map((fn) => Promise.resolve(fn())));
  }, []);

  const requestClose = useCallback(async () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    await flushPendingSaves();

    for (const guard of Array.from(guards.current)) {
      if (!guard()) return false;
    }

    onClose();
    return true;
  }, [flushPendingSaves, onClose]);

  return (
    <LeadPanelDraftContext.Provider
      value={{
        registerPendingSave,
        registerCloseGuard,
        flushPendingSaves,
        requestClose,
      }}
    >
      {children}
    </LeadPanelDraftContext.Provider>
  );
}

export function useLeadPanelDraft() {
  const ctx = useContext(LeadPanelDraftContext);
  if (!ctx) {
    throw new Error("useLeadPanelDraft requires LeadPanelDraftProvider");
  }
  return ctx;
}

export function useOptionalLeadPanelDraft() {
  return useContext(LeadPanelDraftContext);
}