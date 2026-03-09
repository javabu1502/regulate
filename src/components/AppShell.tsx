"use client";

import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import SOSFlow from "@/components/SOSFlow";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [showSOS, setShowSOS] = useState(false);

  return (
    <>
      {showSOS && <SOSFlow onClose={() => setShowSOS(false)} />}
      {children}
      <BottomNav onSOS={() => setShowSOS(true)} />
    </>
  );
}
