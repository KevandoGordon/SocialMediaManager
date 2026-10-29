"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, ExternalLink, Link2, Loader2, Unlink } from "lucide-react";
import { NetworkIcon } from "@/components/network-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader, PermissionNote } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { useCan, useStore } from "@/lib/data/store";
import { NETWORKS } from "@/lib/networks";
import type { Account, NetworkId } from "@/lib/types";
import { compact } from "@/lib/utils";

type Setup = Awaited<ReturnType<ReturnType<typeof useStore>["actions"]["connectionSetup"]>>;
type Choice = NonNullable<Awaited<ReturnType<ReturnType<typeof useStore>["actions"]["getPendingConnection"]>>> & { id: string };

const ABILITIES: Record<NetworkId, string> = {
  facebook: "Publish posts to the Facebook Pages you choose and read their follower counts.",
  instagram: "Publish to your Instagram professional (Business or Creator) account and read its profile.",
  x: "Post to X as you and read your profile and follower count.",
  linkedin: "Post to LinkedIn as you and read your name and photo.",
  tiktok: "Upload videos to your TikTok account and read your profile and follower count.",
  youtube: "Upload videos to your YouTube channel and read its subscriber count.",
  pinterest: "Create Pins on your boards and read your profile.",
  threads: "Post to Threads as you and read your profile.",
};

export default function AccountsPage() {
  const { accounts, posts, actions, activeWorkspace, switchWorkspace } = useStore();
  const can = useCan();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const [setup, setSetup] = useState<Setup>();
  const [connecting, setConnecting] = useState<Account | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState<Account | null>(null);
  const [choice, setChoice] = useState<Choice | null>(null);
  const handled = useRef("");
  const manage = can("accounts.manage");

  useEffect(() => {
    if (manage) actions.connectionSetup().then(setSetup);
  }, [manage, actions]);

  // Results of the OAuth round trip arrive as query parameters on the way back.
  useEffect(() => {
    const query = params.toString();
    if (!query || handled.current === query) return;
    handled.current = query;
    const workspace = params.get("workspace");
    if (workspace && workspace !== activeWorkspace?.workspace.id) switchWorkspace(workspace);
    const connected = params.get("connected") as NetworkId | null;
    if (connected && connected in NETWORKS) toast(`${NETWORKS[connected].name} connected`);
    const error = params.get("error");
    if (error) toast(error, "error");
    const choose = params.get("choose");
    if (choose) actions.getPendingConnection(choose).then((c) => c && setChoice({ ...c, id: choose }));
    router.replace("/accounts");
  }, [params, actions, activeWorkspace, switchWorkspace, router, toast]);

  const scheduledFor = (a: Account) =>
    posts.filter((p) => (p.status === "scheduled" || p.status === "pending") && p.networks.includes(a.network)).length;

  const connectingSetup = connecting && setup?.[connecting.network];
  const callbackUrl = connecting && typeof window !== "undefined" ? `${window.location.origin}/api/connect/${connecting.network}/callback` : "";

  return (
    <div>
      <PageHeader
        title="Accounts"
        description={`${accounts.filter((a) => a.connected).length} of ${accounts.length} networks connected to ${activeWorkspace?.workspace.name ?? "this workspace"}.`}
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
              {a.connected && a.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- avatars come from each network's CDN
                <img src={a.avatarUrl} alt="" className="h-10 w-10 rounded-xl object-cover" referrerPolicy="no-referrer" />
              ) : (
                <NetworkIcon network={a.network} size={40} className="rounded-xl" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{a.connected ? a.name : NETWORKS[a.network].name}</p>
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
                <dd className="mt-0.5 font-medium tabular-nums">{a.connected && a.followers !== null ? compact(a.followers) : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Queued</dt>
                <dd className="mt-0.5 font-medium tabular-nums">{scheduledFor(a)}</dd>
              </div>
              <div>
                <dt className="text-muted">Connected</dt>
                <dd className="mt-0.5 font-medium">{a.lastSync ? formatDistanceToNow(new Date(a.lastSync), { addSuffix: true }) : "—"}</dd>
              </div>
            </dl>
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
              <span className="text-xs text-muted">{a.connected ? "" : NETWORKS[a.network].name}</span>
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
        onClose={() => !redirecting && setConnecting(null)}
        title={connecting ? `Connect ${NETWORKS[connecting.network].name}` : ""}
        footer={
          <>
            <Button variant="outline" onClick={() => setConnecting(null)} disabled={redirecting}>Cancel</Button>
            {connectingSetup?.configured && (
              <Button
                disabled={redirecting}
                onClick={() => {
                  if (!connecting || !activeWorkspace) return;
                  setRedirecting(true);
                  window.location.assign(`/api/connect/${connecting.network}?workspace=${encodeURIComponent(activeWorkspace.workspace.id)}`);
                }}
              >
                {redirecting && <Loader2 className="h-4 w-4 animate-spin" />}
                Continue to {NETWORKS[connecting!.network].name}
              </Button>
            )}
          </>
        }
      >
        {connecting && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <NetworkIcon network={connecting.network} size={36} className="rounded-lg" />
              <p>{ABILITIES[connecting.network]}</p>
            </div>
            {!setup ? (
              <p className="text-muted">Checking setup…</p>
            ) : connectingSetup?.configured ? (
              <p className="text-muted">
                You&apos;ll sign in on {NETWORKS[connecting.network].name} and choose what to share, then come back here. The access it grants is stored encrypted on this server and never sent to the browser.
              </p>
            ) : (
              <div className="space-y-2 rounded-lg bg-surface-2 p-3 text-xs">
                <p className="font-medium text-foreground">{NETWORKS[connecting.network].name} isn&apos;t set up on this server yet.</p>
                <ol className="list-decimal space-y-1.5 pl-4 text-muted">
                  <li>
                    Create an app in the{" "}
                    <a href={connectingSetup?.consoleUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-foreground underline underline-offset-2">
                      developer console <ExternalLink className="h-3 w-3" />
                    </a>
                    .
                  </li>
                  <li>
                    Add this redirect URL to it:
                    <code className="mt-1 block rounded bg-surface px-2 py-1 font-mono text-[11px] break-all text-foreground">{callbackUrl}</code>
                  </li>
                  <li>
                    Put its keys in <code className="font-mono">.env.local</code> as{" "}
                    <code className="font-mono text-foreground">{connectingSetup?.idEnv}</code> and{" "}
                    <code className="font-mono text-foreground">{connectingSetup?.secretEnv}</code>, then restart the app.
                  </li>
                </ol>
                <p className="text-muted">Step-by-step notes for every network are in docs/connecting-networks.md.</p>
              </div>
            )}
          </div>
        )}
      </Dialog>

      <Dialog open={!!choice} onClose={() => setChoice(null)} title={choice ? `Choose a ${NETWORKS[choice.network].name} ${choice.network === "facebook" ? "Page" : "account"}` : ""}>
        {choice && (
          <div className="space-y-2">
            <p className="text-sm text-muted">Each workspace connects one {choice.network === "facebook" ? "Page" : "account"} per network.</p>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {choice.options.map((o) => (
                <li key={o.externalId} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{o.name}</p>
                    <p className="truncate text-xs text-muted">
                      {o.handle}
                      {o.followers !== null && ` · ${compact(o.followers)} followers`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={async () => {
                      const account = await actions.completePendingConnection(choice.id, o.externalId);
                      if (account) toast(`${o.name} connected`);
                      setChoice(null);
                    }}
                  >
                    Connect
                  </Button>
                </li>
              ))}
            </ul>
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
                if (await actions.disconnectAccount(disconnecting.id)) toast(`${NETWORKS[disconnecting.network].name} disconnected`);
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
            Social Connect will delete its stored access to {disconnecting.handle}. To fully revoke it, also remove the app in your {NETWORKS[disconnecting.network].name} settings.{" "}
            {scheduledFor(disconnecting) > 0 && (
              <span className="text-warning">{scheduledFor(disconnecting)} queued post{scheduledFor(disconnecting) > 1 ? "s" : ""} won&apos;t publish to this network until you reconnect.</span>
            )}
          </p>
        )}
      </Dialog>
    </div>
  );
}
