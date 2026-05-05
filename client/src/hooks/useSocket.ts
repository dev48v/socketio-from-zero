import { useEffect, useState } from "react";
import { socket } from "../socket";
import type { ConnState } from "../types";

// Hook that exposes the current connection state to any component
// that wants to render a status badge.
//
// We listen to four lifecycle events:
//   - `connect`     — handshake done, transport is "live"
//   - `disconnect`  — server hung up; Socket.io will start reconnecting
//   - `connect_error` / `reconnect_attempt` — actively retrying
//   - The transport itself can downgrade from websocket to polling;
//     we watch for that with `socket.io.engine.transport.name` and
//     report "polling" so the UI can warn the user.
export function useConnState(): ConnState {
  const [state, setState] = useState<ConnState>(
    socket.connected ? "live" : "connecting"
  );

  useEffect(() => {
    const onConnect = () => {
      const transport = socket.io.engine?.transport?.name;
      setState(transport === "polling" ? "polling" : "live");
    };
    const onDisconnect = () => setState("reconnecting");
    const onReconnectAttempt = () => setState("reconnecting");
    const onError = () => setState("reconnecting");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.io.on("reconnect_attempt", onReconnectAttempt);
    socket.io.on("error", onError);

    // If we're already connected at mount, sync state once.
    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.io.off("reconnect_attempt", onReconnectAttempt);
      socket.io.off("error", onError);
    };
  }, []);

  return state;
}
