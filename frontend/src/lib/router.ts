import { useCallback, useEffect, useMemo, useState } from "react";

export function usePathname() {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return pathname;
}

export function useRouter() {
  const push = useCallback((to: string) => {
    if (window.location.pathname === to) return;
    window.history.pushState({}, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  return useMemo(() => ({ push }), [push]);
}
