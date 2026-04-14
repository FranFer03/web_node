import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { appSocket } from "../lib/appSocket";
import { getAuthState } from "../lib/auth";

const WsStatusContext = createContext({
  status: "disconnected",
  reconnect: () => {},
});

export function WsStatusProvider({ children }) {
  const [status, setStatus] = useState(appSocket.getStatus());

  useEffect(() => {
    const unsubscribeStatus = appSocket.onStatusChange(setStatus);

    const syncAuth = () => {
      const { isAuthenticated } = getAuthState();
      if (isAuthenticated) {
        appSocket.connect().catch(() => setStatus("disconnected"));
      } else {
        appSocket.disconnect();
      }
    };

    syncAuth();
    window.addEventListener("auth-changed", syncAuth);

    return () => {
      unsubscribeStatus();
      window.removeEventListener("auth-changed", syncAuth);
    };
  }, []);

  const value = useMemo(
    () => ({
      status,
      reconnect: () => appSocket.connect().catch(() => setStatus("disconnected")),
    }),
    [status],
  );

  return <WsStatusContext.Provider value={value}>{children}</WsStatusContext.Provider>;
}

export function useWsStatus() {
  return useContext(WsStatusContext);
}
