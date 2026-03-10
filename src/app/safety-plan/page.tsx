"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SafetyPlanIcon } from "@/components/Icons";

// ─── Types ──────────────────────────────────────────────────────────

type ContactLabel = "therapist" | "friend" | "family" | "other";

interface SafetyPlanPerson {
  name: string;
  phone: string;
  label: ContactLabel;
}

interface SafetyPlanData {
  warningSigns: string[];
  copingStrategies: string[];
  people: SafetyPlanPerson[];
  reasons: string[];
}

const LABEL_OPTIONS: { value: ContactLabel; display: string }[] = [
  { value: "therapist", display: "Therapist" },
  { value: "friend", display: "Friend" },
  { value: "family", display: "Family" },
  { value: "other", display: "Other" },
];

const MAX_PEOPLE = 3;

const PLAN_KEY = "regulate-safety-plan";
const PERSON_KEY = "my_person";
const ONBOARDING_DATA_KEY = "onboarding_data";

function migratePerson(p: { name: string; phone: string; label?: ContactLabel }): SafetyPlanPerson {
  return { name: p.name, phone: p.phone, label: p.label || "other" };
}

function loadPlan(): SafetyPlanData {
  if (typeof window === "undefined") {
    return { warningSigns: [""], copingStrategies: [""], people: [{ name: "", phone: "", label: "other" }], reasons: [""] };
  }
  try {
    const saved = localStorage.getItem(PLAN_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate people entries that lack a label
      if (parsed.people) {
        parsed.people = parsed.people.map(migratePerson);
      }
      return parsed;
    }
  } catch { /* */ }

  // Pre-populate from onboarding + my person
  const copingDefaults: string[] = [];
  try {
    const ob = JSON.parse(localStorage.getItem(ONBOARDING_DATA_KEY) || "{}");
    if (ob.helped) copingDefaults.push(...ob.helped.filter((h: string) => h !== "Nothing has worked yet" && h !== "I'm not sure"));
  } catch { /* */ }

  const peopleDefaults: SafetyPlanPerson[] = [];
  try {
    const raw = localStorage.getItem(PERSON_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // New array format
      if (Array.isArray(parsed)) {
        for (const p of parsed) {
          if (p.name && p.phone) peopleDefaults.push(migratePerson(p));
        }
      }
      // Old single-object format
      else if (parsed && parsed.name && parsed.phone) {
        peopleDefaults.push(migratePerson(parsed));
      }
    }
  } catch { /* */ }
  if (peopleDefaults.length === 0) peopleDefaults.push({ name: "", phone: "", label: "other" });

  return {
    warningSigns: [""],
    copingStrategies: copingDefaults.length > 0 ? copingDefaults : [""],
    people: peopleDefaults,
    reasons: [""],
  };
}

function savePlan(data: SafetyPlanData) {
  localStorage.setItem(PLAN_KEY, JSON.stringify(data));
}

interface CustomCrisisLine {
  name: string;
  number: string;
  textNumber?: string;
}

// ─── Component ──────────────────────────────────────────────────────

export default function SafetyPlanPage() {
  const [plan, setPlan] = useState<SafetyPlanData>({
    warningSigns: [""],
    copingStrategies: [""],
    people: [{ name: "", phone: "", label: "other" }],
    reasons: [""],
  });
  const [saved, setSaved] = useState(false);
  const [customCrisis, setCustomCrisis] = useState<CustomCrisisLine | null>(null);

  useEffect(() => {
    setPlan(loadPlan());
    try {
      const stored = localStorage.getItem("regulate-custom-crisis");
      if (stored) setCustomCrisis(JSON.parse(stored));
    } catch { /* */ }
  }, []);

  function update(field: keyof SafetyPlanData, value: SafetyPlanData[typeof field]) {
    const next = { ...plan, [field]: value };
    setPlan(next);
    savePlan(next);
    setSaved(false);
  }

  function updateStringList(field: "warningSigns" | "copingStrategies" | "reasons", index: number, value: string) {
    const arr = [...plan[field]];
    arr[index] = value;
    update(field, arr);
  }

  function addStringItem(field: "warningSigns" | "copingStrategies" | "reasons") {
    update(field, [...plan[field], ""]);
  }

  function updatePerson(index: number, key: "name" | "phone" | "label", value: string) {
    const arr = [...plan.people];
    arr[index] = { ...arr[index], [key]: value };
    update("people", arr);
  }

  function removePerson(index: number) {
    const arr = plan.people.filter((_, i) => i !== index);
    if (arr.length === 0) arr.push({ name: "", phone: "", label: "other" });
    update("people", arr);
  }

  function addPerson() {
    if (plan.people.length >= MAX_PEOPLE) return;
    update("people", [...plan.people, { name: "", phone: "", label: "other" }]);
  }

  function handleSave() {
    savePlan(plan);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <>
      {/* Print stylesheet */}
      <style jsx global>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-section { border: 1px solid #ccc !important; background: white !important; color: black !important; margin-bottom: 16px; padding: 16px; border-radius: 8px; }
          .print-section h3 { color: black !important; font-weight: 600; margin-bottom: 8px; }
          .print-section p, .print-section li { color: #333 !important; }
          input, textarea { border: 1px solid #ccc !important; background: white !important; color: black !important; }
        }
      `}</style>

      <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
        <div className="w-full max-w-md">
          <div className="no-print">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Home
            </Link>
          </div>

          <header className="mb-6 mt-6 text-center">
            <div className="mb-3 flex justify-center no-print"><SafetyPlanIcon className="h-8 w-8 text-teal-soft" /></div>
            <h1 className="text-xl font-semibold tracking-tight text-cream">Safety Plan</h1>
            <p className="mt-2 text-sm leading-relaxed text-cream-dim no-print">
              A personal plan for when things feel overwhelming.
            </p>
          </header>

          <div className="flex flex-col gap-5">
            {/* Warning signs */}
            <div className="print-section rounded-2xl border border-teal/15 bg-deep/60 p-5 backdrop-blur-sm">
              <h3 className="mb-3 text-sm font-medium text-cream">My warning signs</h3>
              <p className="mb-3 text-xs text-cream-dim/50">How do I know I&apos;m starting to struggle?</p>
              {plan.warningSigns.map((sign, i) => (
                <input
                  key={i}
                  type="text"
                  value={sign}
                  onChange={(e) => updateStringList("warningSigns", i, e.target.value)}
                  placeholder={`Warning sign ${i + 1}`}
                  className="mb-2 w-full rounded-xl border border-slate-blue/30 bg-midnight/60 p-3 text-sm text-cream placeholder:text-cream-dim/30 focus:border-teal/30 focus:outline-none"
                />
              ))}
              <button onClick={() => addStringItem("warningSigns")} className="no-print text-xs text-teal-soft/60 hover:text-teal-soft">+ Add another</button>
            </div>

            {/* Coping strategies */}
            <div className="print-section rounded-2xl border border-teal/15 bg-deep/60 p-5 backdrop-blur-sm">
              <h3 className="mb-3 text-sm font-medium text-cream">Things that help me cope</h3>
              {plan.copingStrategies.map((strategy, i) => (
                <input
                  key={i}
                  type="text"
                  value={strategy}
                  onChange={(e) => updateStringList("copingStrategies", i, e.target.value)}
                  placeholder={`Strategy ${i + 1}`}
                  className="mb-2 w-full rounded-xl border border-slate-blue/30 bg-midnight/60 p-3 text-sm text-cream placeholder:text-cream-dim/30 focus:border-teal/30 focus:outline-none"
                />
              ))}
              <button onClick={() => addStringItem("copingStrategies")} className="no-print text-xs text-teal-soft/60 hover:text-teal-soft">+ Add another</button>
            </div>

            {/* People I can call */}
            <div className="print-section rounded-2xl border border-teal/15 bg-deep/60 p-5 backdrop-blur-sm">
              <h3 className="mb-3 text-sm font-medium text-cream">People I can call</h3>
              <p className="mb-3 text-xs text-cream-dim/50">Up to {MAX_PEOPLE} contacts</p>
              {plan.people.map((person, i) => (
                <div key={i} className="mb-3 rounded-xl border border-slate-blue/20 bg-midnight/30 p-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={person.name}
                      onChange={(e) => updatePerson(i, "name", e.target.value)}
                      placeholder="Name"
                      className="flex-1 rounded-xl border border-slate-blue/30 bg-midnight/60 p-3 text-sm text-cream placeholder:text-cream-dim/30 focus:border-teal/30 focus:outline-none"
                    />
                    <input
                      type="tel"
                      value={person.phone}
                      onChange={(e) => updatePerson(i, "phone", e.target.value)}
                      placeholder="Phone"
                      className="flex-1 rounded-xl border border-slate-blue/30 bg-midnight/60 p-3 text-sm text-cream placeholder:text-cream-dim/30 focus:border-teal/30 focus:outline-none"
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex flex-wrap gap-1.5">
                      {LABEL_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => updatePerson(i, "label", opt.value)}
                          className={`no-print rounded-lg px-2.5 py-1 text-[11px] transition-all ${
                            person.label === opt.value
                              ? "bg-teal/20 text-teal-soft"
                              : "bg-slate-blue/15 text-cream-dim/40 hover:text-cream-dim"
                          }`}
                        >
                          {opt.display}
                        </button>
                      ))}
                      {/* Print-only label */}
                      <span className="hidden text-xs text-cream-dim print:inline">
                        ({LABEL_OPTIONS.find((o) => o.value === person.label)?.display})
                      </span>
                    </div>
                    {plan.people.length > 1 && (
                      <button
                        onClick={() => removePerson(i)}
                        className="no-print ml-2 text-[10px] text-red-400/40 hover:text-red-400"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {plan.people.length < MAX_PEOPLE && (
                <button onClick={addPerson} className="no-print text-xs text-teal-soft/60 hover:text-teal-soft">+ Add person</button>
              )}
            </div>

            {/* Crisis resources */}
            <div className="print-section rounded-2xl border border-candle/15 bg-candle/5 p-5">
              <h3 className="mb-3 text-sm font-medium text-cream">Crisis resources</h3>
              <div className="space-y-2 text-sm">
                {customCrisis && (
                  <div className="flex items-center justify-between rounded-lg border border-candle/20 bg-candle/5 px-2 py-1.5">
                    <span className="font-medium text-cream">{customCrisis.name}</span>
                    <a href={`tel:${customCrisis.number.replace(/\s/g, "")}`} className="font-medium text-candle no-print">{customCrisis.number}</a>
                    <span className="hidden text-cream font-medium print:inline">{customCrisis.number}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-cream-dim">988 Suicide & Crisis Lifeline</span>
                  <a href="tel:988" className="font-medium text-candle no-print">Call 988</a>
                  <span className="hidden text-cream font-medium print:inline">988</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-cream-dim">Crisis Text Line</span>
                  <span className="font-medium text-candle-soft">Text HOME to 741741</span>
                </div>
              </div>
            </div>

            {/* Reasons to keep going */}
            <div className="print-section rounded-2xl border border-teal/15 bg-deep/60 p-5 backdrop-blur-sm">
              <h3 className="mb-3 text-sm font-medium text-cream">Reasons to keep going</h3>
              {plan.reasons.map((reason, i) => (
                <input
                  key={i}
                  type="text"
                  value={reason}
                  onChange={(e) => updateStringList("reasons", i, e.target.value)}
                  placeholder={`Reason ${i + 1}`}
                  className="mb-2 w-full rounded-xl border border-slate-blue/30 bg-midnight/60 p-3 text-sm text-cream placeholder:text-cream-dim/30 focus:border-teal/30 focus:outline-none"
                />
              ))}
              <button onClick={() => addStringItem("reasons")} className="no-print text-xs text-teal-soft/60 hover:text-teal-soft">+ Add another</button>
            </div>

            {/* Actions */}
            <div className="no-print flex gap-3">
              <button
                onClick={handleSave}
                className="flex-1 rounded-2xl bg-teal/20 py-4 text-sm font-medium text-teal-soft transition-all hover:bg-teal/30 active:scale-[0.98]"
              >
                {saved ? "Saved" : "Save plan"}
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 rounded-2xl border border-teal/20 py-4 text-sm font-medium text-cream-dim transition-all hover:text-cream active:scale-[0.98]"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
