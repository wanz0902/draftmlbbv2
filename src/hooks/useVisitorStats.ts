import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "mlbb_visitor_id";
const HEARTBEAT_INTERVAL_MS = 25_000;

function getOrCreateVisitorId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (id && id.length > 0 && id.length <= 128) return id;
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export interface VisitorStats {
  online: number;
  totalUsers: number;
}

export function useVisitorStats(): VisitorStats {
  const [stats, setStats] = useState<VisitorStats>({ online: 0, totalUsers: 0 });
  const visitorIdRef = useRef<string>("");

  useEffect(() => {
    visitorIdRef.current = getOrCreateVisitorId();

    const sendHeartbeat = async () => {
      try {
        const res = await fetch("/api/analytics/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId: visitorIdRef.current }),
        });
        if (res.ok) {
          const data = await res.json();
          setStats({ online: data.online ?? 0, totalUsers: data.totalUsers ?? 0 });
        }
      } catch {
        // silently fail — visitor stats are non-critical
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return stats;
}
