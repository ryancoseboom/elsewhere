"use client";

import { useEffect } from "react";

export default function BackroomSessionKeepAlive() {
  useEffect(() => {
    const refreshSession = () => {
      fetch("/api/backroom/session", {
        method: "POST",
        keepalive: true,
      }).catch(() => {});
    };
    const timer = window.setInterval(refreshSession, 60 * 60 * 1000);

    refreshSession();

    return () => window.clearInterval(timer);
  }, []);

  return null;
}
