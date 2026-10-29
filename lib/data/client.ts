import type { RpcMethod, RpcResult } from "../server/rpc";
import type * as Api from "./api";
import { ApiError } from "./errors";

type Remote = { [K in RpcMethod]: (typeof Api)[K] };

/** Same functions as lib/data/api.ts, run on the server; API errors are rethrown here as ApiError. */
export const api = new Proxy({} as Remote, {
  get: (_, method: string) =>
    async (...args: unknown[]) => {
      const res = await fetch("/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, args }),
      });
      const result: RpcResult = await res.json().catch(() => ({ ok: false, code: "internal", message: "The server didn't respond. Try again." }));
      if (!result.ok) throw new ApiError(result.code, result.message);
      return result.data;
    },
});
