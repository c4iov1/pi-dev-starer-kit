import * as net from "node:net";

/** Best-effort emit a C4Mux hook event over a Unix socket. Never throws or blocks permission. */
export async function sendC4MuxPermissionEvent(payload: Record<string, unknown>) {
  const socketPath = process.env.C4MUX_HOOK_SOCKET;
  if (!socketPath) return;

  await new Promise<void>((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve();
    };

    const sock = net.createConnection(socketPath, () => {
      sock.end(`${JSON.stringify(payload)}\n`);
    });

    const timeout = setTimeout(() => {
      try {
        sock.destroy();
      } catch {
        // ignore double-destroy
      }

      finish();
    }, 1500);

    sock.once("close", finish);
    sock.once("error", finish);
  });
}
