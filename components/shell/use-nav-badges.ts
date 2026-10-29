"use client";

import { useStore } from "@/lib/data/store";

export function useNavBadges() {
  const { posts, inbox, myInvitations } = useStore();
  return {
    approvals: posts.filter((p) => p.status === "pending").length,
    inbox: inbox.filter((i) => !i.read && i.status === "open").length,
    invitations: myInvitations.length,
  };
}
