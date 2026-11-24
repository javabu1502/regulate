"use client";

import Link from "next/link";
import LegalPage, { Section, SUPPORT_EMAIL } from "../legal/LegalPage";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms"
      intro="Regulate is free to use. These are the terms you are agreeing to by using it."
    >
      <Section heading="This is not medical care">
        <p>
          Regulate is a set of self-help tools. It is not a medical device, it does not
          diagnose or treat anything, and it is not a substitute for a doctor, a
          therapist, or a crisis service.
        </p>
        <p>
          If you are in danger or thinking about harming yourself, contact the{" "}
          <a href="tel:988" className="text-teal-soft underline underline-offset-2">
            988 Suicide &amp; Crisis Lifeline
          </a>{" "}
          or your local emergency number. More options are on the{" "}
          <Link href="/crisis" className="text-teal-soft underline underline-offset-2">
            crisis resources
          </Link>{" "}
          page.
        </p>
      </Section>

      <Section heading="Use your judgement">
        <p>
          Some of the exercises involve movement, breath holds, or pressure on the
          body. Stop if anything hurts or makes you feel worse. If you are pregnant,
          have a heart or respiratory condition, have epilepsy, have glaucoma or
          another eye condition, or are recovering from an injury, check with a
          clinician before using the exercises that apply to you.
        </p>
        <p>
          You are responsible for deciding whether an exercise is right for you on a
          given day.
        </p>
      </Section>

      <Section heading="Your information">
        <p>
          Everything you enter stays on your device. The{" "}
          <Link href="/privacy" className="text-teal-soft underline underline-offset-2">
            privacy page
          </Link>{" "}
          covers this in full. Because there is no copy anywhere else, losing your
          device or clearing the app&apos;s data loses what you had saved.
        </p>
      </Section>

      <Section heading="No warranty">
        <p>
          Regulate is provided as it is, without any warranty. It may contain errors,
          it may become unavailable, and it may not work the way you expect on every
          device.
        </p>
        <p>
          To the extent the law allows, we are not liable for any loss arising from
          your use of it.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          These terms may change. The date at the bottom of this page changes when they
          do. Continuing to use the app after a change means you accept it.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Questions can go to{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-teal-soft underline underline-offset-2"
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
