"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfirmProvider, type ConfirmLabels } from "@/components/ConfirmProvider";

export function Providers({ children, confirm }: { children: React.ReactNode; confirm: ConfirmLabels }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <ConfirmProvider labels={confirm}>{children}</ConfirmProvider>
    </QueryClientProvider>
  );
}
