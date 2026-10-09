"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button className="h-9 print:hidden" onClick={() => window.print()}>
      <Printer /> Print / save PDF
    </Button>
  );
}
