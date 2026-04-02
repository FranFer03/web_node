import { createContext, useContext, useState } from "react";

const WsStatusContext = createContext({
  status: "disconnected",
  setStatus: () => {},
});

export function WsStatusProvider({ children }) {
  const [status, setStatus] = useState("disconnected");
  return (
    <WsStatusContext.Provider value={{ status, setStatus }}>
      {children}
    </WsStatusContext.Provider>
  );
}

export function useWsStatus() {
  return useContext(WsStatusContext);
}
