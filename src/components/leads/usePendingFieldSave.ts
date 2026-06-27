"use client";

import { useCallback, useEffect, useRef } from "react";
import { useOptionalLeadPanelDraft } from "./LeadPanelDraftContext";

interface PendingFieldSaveOptions {
  debounceMs?: number;
}

export function usePendingFieldSave(
  draft: string,
  saved: string,
  onSave: (value: string | null) => void,
  options: PendingFieldSaveOptions = {}
) {
  const { debounceMs = 800 } = options;
  const draftRef = useRef(draft);
  const savedRef = useRef(saved);
  const onSaveRef = useRef(onSave);
  draftRef.current = draft;
  savedRef.current = saved;
  onSaveRef.current = onSave;

  const panelDraft = useOptionalLeadPanelDraft();

  const flush = useCallback(() => {
    if (draftRef.current !== savedRef.current) {
      return Promise.resolve(onSaveRef.current(draftRef.current || null));
    }
  }, []);

  useEffect(() => {
    if (!panelDraft) return;
    return panelDraft.registerPendingSave(flush);
  }, [panelDraft, flush]);

  useEffect(() => {
    if (draft === saved) return;
    const timer = window.setTimeout(() => {
      onSaveRef.current(draft || null);
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [draft, saved, debounceMs]);

  useEffect(() => {
    return () => {
      if (draftRef.current !== savedRef.current) {
        onSaveRef.current(draftRef.current || null);
      }
    };
  }, []);
}