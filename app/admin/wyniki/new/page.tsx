import { Suspense } from "react";
import WynikiNewClient from "./WynikiNewClient";

// aby Next nie próbował prerenderować tej strony statycznie
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-sm">Ładowanie…</div>}>
      <WynikiNewClient />
    </Suspense>
  );
}
