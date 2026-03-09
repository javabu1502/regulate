"use client";

import { useState, useEffect } from "react";

const PERSON_KEY = "my_person";

interface PersonData {
  name: string;
  phone: string;
}

function loadPerson(): PersonData | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(PERSON_KEY);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

function savePerson(person: PersonData) {
  localStorage.setItem(PERSON_KEY, JSON.stringify(person));
}

// ─── Setup Modal ────────────────────────────────────────────────────

function PersonModal({
  initial,
  onSave,
  onClose,
}: {
  initial: PersonData | null;
  onSave: (p: PersonData) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [phone, setPhone] = useState(initial?.phone || "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight/80 px-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-teal/20 bg-deep p-6">
        <h3 className="text-base font-medium text-cream">
          {initial ? "Edit your person" : "Who do you want to call when things get hard?"}
        </h3>
        <div className="mt-4 flex flex-col gap-3">
          <input
            type="text"
            placeholder="Their name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-blue/30 bg-midnight/60 p-3 text-sm text-cream placeholder:text-cream-dim/30 focus:border-teal/30 focus:outline-none"
          />
          <input
            type="tel"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-slate-blue/30 bg-midnight/60 p-3 text-sm text-cream placeholder:text-cream-dim/30 focus:border-teal/30 focus:outline-none"
          />
        </div>
        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-blue/30 py-3 text-sm text-cream-dim hover:text-cream"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (name.trim() && phone.trim()) {
                onSave({ name: name.trim(), phone: phone.trim() });
              }
            }}
            className="flex-1 rounded-xl bg-teal/20 py-3 text-sm font-medium text-teal-soft hover:bg-teal/30"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Home screen section ────────────────────────────────────────────

export default function MyPersonSection() {
  const [person, setPerson] = useState<PersonData | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setPerson(loadPerson());
  }, []);

  function handleSave(p: PersonData) {
    savePerson(p);
    setPerson(p);
    setShowModal(false);
  }

  if (!person) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="mb-1 w-full text-center text-xs text-cream-dim/40 transition-colors hover:text-cream-dim"
        >
          + Add your person
        </button>
        {showModal && (
          <PersonModal initial={null} onSave={handleSave} onClose={() => setShowModal(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <a
          href={`tel:${person.phone}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-teal/20 bg-deep/60 py-3 text-sm text-cream-dim transition-colors hover:border-teal/40 hover:text-cream"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 2.5C3 2.5 4.5 2 5.5 3.5L6.5 5.5C6.5 5.5 5.5 6.5 6.5 8C7.5 9.5 8.5 9 8.5 9L10.5 10C12 11 11.5 12.5 11.5 12.5C10.5 14 8 13.5 6 11.5C4 9.5 2.5 7 3 5C3 5 3 3.5 3 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          Call {person.name}
        </a>
        <button
          onClick={() => setShowModal(true)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-blue/30 text-cream-dim/40 hover:text-cream-dim"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M10 1.5L12.5 4L4.5 12H2V9.5L10 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {showModal && (
        <PersonModal initial={person} onSave={handleSave} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}

// ─── SOS Flow version (just the call button) ────────────────────────

export function CallPersonButton() {
  const [person, setPerson] = useState<PersonData | null>(null);

  useEffect(() => {
    setPerson(loadPerson());
  }, []);

  if (!person) return null;

  return (
    <a
      href={`tel:${person.phone}`}
      className="rounded-xl border border-teal/20 bg-deep/60 px-8 py-3 text-sm text-cream-dim transition-colors hover:border-teal/40 hover:text-cream"
    >
      Call {person.name}
    </a>
  );
}
