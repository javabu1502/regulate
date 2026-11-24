"use client";

import Link from "next/link";
import LegalPage, { Section, SUPPORT_EMAIL } from "../legal/LegalPage";

export default function SupportPage() {
  return (
    <LegalPage
      title="Support"
      intro="If something is not working, or you want to tell us what would help, write to us."
    >
      <Section heading="Get in touch">
        <p>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Regulate`}
            className="text-teal-soft underline underline-offset-2"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p>
          It helps to say which device you are on and what you were doing when it went
          wrong.
        </p>
      </Section>

      <Section heading="I cannot hear the voice">
        <p>
          Check the voice is turned on. During any exercise, tap the screen to bring
          up the controls and look at the one marked Voice. It says Voice off when it
          is off.
        </p>
        <p>
          On an iPhone, the ring and silent switch on the side of the phone mutes some
          sounds. There is a Test the voice button in Settings that plays a single
          cue, which is the quickest way to tell which of the two it is.
        </p>
      </Section>

      <Section heading="I lost my panic kit">
        <p>
          Everything you save is stored on your device and nowhere else, so clearing
          the app&apos;s data or reinstalling it removes what you had. There is no copy
          for us to restore. The{" "}
          <Link href="/privacy" className="text-teal-soft underline underline-offset-2">
            privacy page
          </Link>{" "}
          explains why.
        </p>
      </Section>

      <Section heading="Does it work without a connection">
        <p>
          Yes. Once the app has loaded once, the exercises, the recordings and your
          own saved pages all work with no connection. The crisis phone numbers still
          need a phone signal to dial.
        </p>
      </Section>

      <Section heading="I am in crisis right now">
        <p>
          Call or text the{" "}
          <a href="tel:988" className="text-teal-soft underline underline-offset-2">
            988 Suicide &amp; Crisis Lifeline
          </a>
          , or go to the{" "}
          <Link href="/crisis" className="text-teal-soft underline underline-offset-2">
            crisis resources
          </Link>{" "}
          page. Email is not monitored and is not a way to reach anyone quickly.
        </p>
      </Section>
    </LegalPage>
  );
}
