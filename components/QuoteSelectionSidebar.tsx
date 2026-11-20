"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useQuoteSelection } from "@/lib/quote-selection";

const QuoteDrawer = dynamic(() => import("./QuoteDrawer"), { ssr: false });

export default function QuoteSelectionSidebar() {
  const { isDrawerOpen } = useQuoteSelection();
  const [hasOpened, setHasOpened] = useState(false);

  if (isDrawerOpen && !hasOpened) {
    setHasOpened(true);
  }

  if (!hasOpened) {
    return null;
  }

  return <QuoteDrawer />;
}
