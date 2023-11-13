import { useEffect, useRef } from "react";

export function useRefWithErrorFocus<
  TElement extends HTMLElement | HTMLTextAreaElement | HTMLButtonElement,
>(error: unknown) {
  const ref = useRef<TElement>(null);

  useEffect(() => {
    if (ref.current && error) {
      ref.current.focus();
    }
  }, [error]);

  return ref;
}
