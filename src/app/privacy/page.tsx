"use client";

import LegalPage, { Section, SUPPORT_EMAIL } from "../legal/LegalPage";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      intro="Regulate does not collect anything. There is no account, no sign-in, and no server that holds your information."
    >
      <Section heading="What is stored">
        <p>
          Everything you enter stays in storage on your own device. That covers your
          panic kit, your safety plan, your emergency contacts, your journal entries,
          your warning signs, your reasons to keep going, and the record of which
          exercises you have used.
        </p>
        <p>
          None of it is sent anywhere. It is not backed up to us, because there is
          nowhere for it to go.
        </p>
      </Section>

      <Section heading="What is not collected">
        <p>
          There is no analytics, no advertising, no tracking of any kind, and no
          third-party code running in the app. Nothing you do here is measured or
          reported.
        </p>
        <p>
          The app does not ask for your name, your email address, your location, your
          contacts, your microphone, or your camera.
        </p>
      </Section>

      <Section heading="Deleting your information">
        <p>
          Clearing the app&apos;s data, or deleting the app, removes everything. We hold
          no copy, so there is nothing for you to request from us and nothing for us
          to delete on your behalf.
        </p>
      </Section>

      <Section heading="Links to other places">
        <p>
          The crisis resources link out to services run by other organisations, and
          the 988 number dials your phone&apos;s dialler. Those services have their own
          privacy practices, which we do not control.
        </p>
        <p>
          If you save a music or video link in your panic kit, opening it hands you
          over to that service. The link itself is stored only on your device.
        </p>
      </Section>

      <Section heading="Children">
        <p>
          Regulate is not directed at children under 13 and collects nothing from
          anyone, including them.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          If this policy changes, the date at the bottom of this page changes with it.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Questions about privacy can go to{" "}
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
