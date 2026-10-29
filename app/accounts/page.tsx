"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Link2, Loader2, Unlink } from "lucide-react";
import { NetworkIcon } from "@/components/network-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader, PermissionNote } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { useCan, useStore } from "@/lib/data/store";
import { NETWORKS } from "@/lib/networks";
import type { Account } from "@/lib/types";
import { compact } from "@/lib/utils";

export default function AccountsPage() {
  const { accounts, posts, actions } = useStore();
  const can = useCan();
  const toast = useToast();
  const [connecting, setConnecting] = useState<Account | null>(null);
  const [authorizing, setAuthorizing] = useState(false);
  const [disconnecting, setDisconnecting] = useState<Account | null>(null);
  const manage = can("accounts.manage");

  const scheduledFor = (a: Account) =>
    posts.filter((p) => (p.status === "scheduled" || p.status === "pending") && p.networks.includes(a.network)).length;

  async function authorize() {
    if (!connecting) return;
    setAuthorizing(true);
    await new Promise((r) => setTimeout(r, 900));
    const ok = await actions.setAccountConnected(connecting.id, true);
    setAuthorizing(false);
    if (ok) toast(`${NETWORKS[connecting.network].name} marked as connected (simulated)`);
    setConnecting(null);
  }

  return (
    <div>
      <PageHeader
        title="Accounts"
        description={`${accounts.filter((a) => a.connected).length} of ${accounts.length} networks connected. Connections are simulated; no data leaves this browser.`}
      />
      {!manage && (
        <div className="mb-4">
          <PermissionNote>Only Admins and Managers can connect or disconnect accounts.</PermissionNote>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.map((a) => (
          <Card key={a.id} className="flex flex-col p-4">
            <div className="flex items-start gap-3">
              <NetworkIcon network={a.network} size={40} className="rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{NETWORKS[a.network].name}</p>
                <p className="truncate text-sm text-muted">{a.connected ? a.handle : "Not connected"}</p>
              </div>
              {a.connected ? (
                <Badge tone="success"><CheckCircle2 className="h-3 w-3" />Connected</Badge>
              ) : (
                <Badge>Disconnected</Badge>
              )}
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-muted">Followers</dt>
                <dd className="mt-0.5 font-medium tabular-nums">{a.connected ? compact(a.followers) : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Queued</dt>
                <dd className="mt-0.5 font-medium tabular-nums">{scheduledFor(a)}</dd>
              </div>
              <div>
                <dt className="text-muted">Last sync</dt>
                <dd className="mt-0.5 font-medium">{a.lastSync ? formatDistanceToNow(new Date(a.lastSync), { addSuffix: true }) : "—"}</dd>
              </div>
            </dl>
            <div className="mt-4 flex justify-end border-t border-border pt-3">
              {a.connected ? (
                <Button variant="outline" size="sm" disabled={!manage} onClick={() => setDisconnecting(a)}>
                  <Unlink className="h-3.5 w-3.5" />
                  Disconnect
                </Button>
              ) : (
                <Button size="sm" disabled={!manage} onClick={() => setConnecting(a)}>
                  <Link2 className="h-3.5 w-3.5" />
                  Connect
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Dialog
        open={!!connecting}
        onClose={() => !authorizing && setConnecting(null)}
        title={connecting ? `Connect ${NETWORKS[connecting.network].name}` : ""}
        footer={
          <>
            <Button variant="outline" onClick={() => setConnecting(null)} disabled={authorizing}>Cancel</Button>
            <Button onClick={authorize} disabled={authorizing}>
              {authorizing && <Loader2 className="h-4 w-4 animate-spin" />}
              {authorizing ? "Authorizing…" : "Authorize"}
            </Button>
          </>
        }
      >
        {connecting && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <NetworkIcon network={connecting.network} size={36} className="rounded-lg" />
              <p>Social Connect will be able to:</p>
            </div>
            <ul className="list-disc space-y-1 pl-5 text-muted">
              <li>Publish and schedule posts to {connecting.handle}</li>
              <li>Read comments, messages and mentions</li>
              <li>Read page and post analytics</li>
            </ul>
            <p className="rounded-lg bg-surface-2 p-3 text-xs text-muted">Demo mode: no real sign-in happens. A real integration would redirect to the network&apos;s OAuth screen here.</p>
          </div>
        )}
      </Dialog>

      <Dialog
        open={!!disconnecting}
        onClose={() => setDisconnecting(null)}
        title="Disconnect account?"
        footer={
          <>
            <Button variant="outline" onClick={() => setDisconnecting(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!disconnecting) return;
                if (await actions.setAccountConnected(disconnecting.id, false)) toast(`${NETWORKS[disconnecting.network].name} disconnected`);
                setDisconnecting(null);
              }}
            >
              Disconnect
            </Button>
          </>
        }
      >
        {disconnecting && (
          <p className="text-sm text-muted">
            {NETWORKS[disconnecting.network].name} ({disconnecting.handle}) will stop syncing.{" "}
            {scheduledFor(disconnecting) > 0 && (
              <span className="text-warning">{scheduledFor(disconnecting)} queued post{scheduledFor(disconnecting) > 1 ? "s" : ""} won&apos;t publish to this network until you reconnect.</span>
            )}
          </p>
        )}
      </Dialog>
    </div>
  );
}
