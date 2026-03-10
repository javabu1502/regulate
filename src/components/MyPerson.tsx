"use client";

import { useState, useEffect } from "react";

const PERSON_KEY = "my_person";
const MAX_CONTACTS = 3;

type ContactLabel = "therapist" | "friend" | "family" | "other";

export interface ContactData {
  name: string;
  phone: string;
  label: ContactLabel;
}

const LABEL_DISPLAY: Record<ContactLabel, string> = {
  therapist: "Therapist",
  friend: "Friend",
  family: "Family",
  other: "Other",
};

// ─── Migration & persistence ──────────────────────────────────────────

function loadContacts(): ContactData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PERSON_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);

    // New format: array of contacts
    if (Array.isArray(parsed)) {
      return parsed as ContactData[];
    }

    // Old format: single { name, phone } - migrate
    if (parsed && typeof parsed === "object" && parsed.name && parsed.phone) {
      const migrated: ContactData[] = [
        { name: parsed.name, phone: parsed.phone, label: "other" },
      ];
      localStorage.setItem(PERSON_KEY, JSON.stringify(migrated));
      return migrated;
    }

    return [];
  } catch {
    return [];
  }
}

function saveContacts(contacts: ContactData[]) {
  localStorage.setItem(PERSON_KEY, JSON.stringify(contacts));
}

// ─── Edit/Add Modal ────────────────────────────────────────────────────

function ContactModal({
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  initial: ContactData | null;
  onSave: (c: ContactData) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [label, setLabel] = useState<ContactLabel>(initial?.label || "friend");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight/80 px-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-teal/20 bg-deep p-6">
        <h3 className="text-base font-medium text-cream">
          {initial ? "Edit contact" : "Add a contact"}
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
          <div className="flex flex-wrap gap-2">
            {(Object.keys(LABEL_DISPLAY) as ContactLabel[]).map((l) => (
              <button
                key={l}
                onClick={() => setLabel(l)}
                className={`rounded-lg px-3 py-1.5 text-xs transition-all ${
                  label === l
                    ? "bg-teal/20 text-teal-soft"
                    : "bg-slate-blue/15 text-cream-dim/50 hover:text-cream-dim"
                }`}
              >
                {LABEL_DISPLAY[l]}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          {initial && onDelete && (
            <button
              onClick={onDelete}
              className="rounded-xl border border-red-500/20 px-3 py-3 text-sm text-red-400/60 hover:text-red-400"
            >
              Remove
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-blue/30 py-3 text-sm text-cream-dim hover:text-cream"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (name.trim() && phone.trim()) {
                onSave({ name: name.trim(), phone: phone.trim(), label });
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
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    setContacts(loadContacts());
  }, []);

  function handleSave(c: ContactData, index?: number) {
    const next = [...contacts];
    if (index !== undefined && index !== null) {
      next[index] = c;
    } else {
      next.push(c);
    }
    saveContacts(next);
    setContacts(next);
    setEditIndex(null);
    setShowAdd(false);
  }

  function handleDelete(index: number) {
    const next = contacts.filter((_, i) => i !== index);
    saveContacts(next);
    setContacts(next);
    setEditIndex(null);
  }

  if (contacts.length === 0) {
    return (
      <>
        <button
          onClick={() => setShowAdd(true)}
          className="mb-1 w-full text-center text-xs text-cream-dim/40 transition-colors hover:text-cream-dim"
        >
          + Add your person
        </button>
        {showAdd && (
          <ContactModal
            initial={null}
            onSave={(c) => handleSave(c)}
            onClose={() => setShowAdd(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-2">
        {contacts.map((contact, i) => (
          <div key={i} className="flex items-center gap-2">
            <a
              href={`tel:${contact.phone}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-teal/20 bg-deep/60 py-3 text-sm text-cream-dim transition-colors hover:border-teal/40 hover:text-cream"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 2.5C3 2.5 4.5 2 5.5 3.5L6.5 5.5C6.5 5.5 5.5 6.5 6.5 8C7.5 9.5 8.5 9 8.5 9L10.5 10C12 11 11.5 12.5 11.5 12.5C10.5 14 8 13.5 6 11.5C4 9.5 2.5 7 3 5C3 5 3 3.5 3 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span>Call {contact.name}</span>
              <span className="text-[10px] text-cream-dim/30">{LABEL_DISPLAY[contact.label]}</span>
            </a>
            <button
              onClick={() => setEditIndex(i)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-blue/30 text-cream-dim/40 hover:text-cream-dim"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M10 1.5L12.5 4L4.5 12H2V9.5L10 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        ))}
        {contacts.length < MAX_CONTACTS && (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full text-center text-xs text-cream-dim/40 transition-colors hover:text-cream-dim"
          >
            + Add another person
          </button>
        )}
      </div>

      {editIndex !== null && (
        <ContactModal
          initial={contacts[editIndex]}
          onSave={(c) => handleSave(c, editIndex)}
          onDelete={() => handleDelete(editIndex)}
          onClose={() => setEditIndex(null)}
        />
      )}
      {showAdd && (
        <ContactModal
          initial={null}
          onSave={(c) => handleSave(c)}
          onClose={() => setShowAdd(false)}
        />
      )}
    </>
  );
}

// ─── SOS Flow version (shows all contacts) ────────────────────────────

export function CallPersonButton() {
  const [contacts, setContacts] = useState<ContactData[]>([]);

  useEffect(() => {
    setContacts(loadContacts());
  }, []);

  if (contacts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {contacts.map((contact, i) => (
        <a
          key={i}
          href={`tel:${contact.phone}`}
          className="rounded-xl border border-teal/20 bg-deep/60 px-8 py-3 text-center text-sm text-cream-dim transition-colors hover:border-teal/40 hover:text-cream"
        >
          Call {contact.name}
          <span className="ml-2 text-[10px] text-cream-dim/30">{LABEL_DISPLAY[contact.label]}</span>
        </a>
      ))}
    </div>
  );
}
