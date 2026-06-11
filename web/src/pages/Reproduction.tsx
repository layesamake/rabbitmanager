import { useState } from "react";
import Saillies from "./Saillies";
import Portees from "./Portees";

export default function Reproduction() {
  const [activeTab, setActiveTab] = useState<"saillies" | "portees">("saillies");

  return (
    <div className="pb-8">
      <h1 className="sr-only">Reproduction</h1>

      <div className="flex gap-2 mb-6 bg-surface p-1 rounded-lg border border-surface-border">
        <button
          onClick={() => setActiveTab("saillies")}
          className={`flex-1 py-3 text-sm font-semibold rounded-md transition-colors ${
            activeTab === "saillies"
              ? "bg-primary text-on-primary"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Saillies
        </button>
        <button
          onClick={() => setActiveTab("portees")}
          className={`flex-1 py-3 text-sm font-semibold rounded-md transition-colors ${
            activeTab === "portees"
              ? "bg-primary text-on-primary"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Portées
        </button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === "saillies" && <Saillies hideTitle />}
        {activeTab === "portees" && <Portees hideTitle />}
      </div>
    </div>
  );
}
