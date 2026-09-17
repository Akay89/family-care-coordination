import { createFileRoute } from "@tanstack/react-router";

import {
  LegalPage,
  LegalSection,
  PlaceholderNote,
} from "@/components/legal-page";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · CareCircle" },
      {
        name: "description",
        content:
          "How CareCircle stores the information families share when coordinating care admin, and who can see it.",
      },
      { property: "og:title", content: "Privacy Policy · CareCircle" },
      {
        property: "og:description",
        content: "How CareCircle handles your family's information.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="[DATE TO BE ADDED]">
      <PlaceholderNote />

      <LegalSection heading="Who we are">
        <p>
          [PLACEHOLDER — add your legal entity name, registered address, and a
          contact email for privacy questions. Add your ICO registration number
          if you have one.]
        </p>
      </LegalSection>

      <LegalSection heading="What we store">
        <p>
          [PLACEHOLDER — confirm and edit.] We store your name, email address and
          optional phone number; the care circles you belong to and your role in
          them; the dates, tasks, checklists, notes, messages and documents you
          or your circle add; and a record of who did what in a circle.
        </p>
      </LegalSection>

      <LegalSection heading="Who can see it">
        <p>
          [PLACEHOLDER — confirm and edit.] Anything added to a care circle is
          visible to the people in that circle. Organisers can also see the
          circle&apos;s activity record. Nobody outside a circle can see its
          information.
        </p>
      </LegalSection>

      <LegalSection heading="Emails we send">
        <p>
          [PLACEHOLDER — confirm and edit.] We send invitations, notes when
          something is given to you, and an optional daily summary. These emails
          never include file names, family messages or personal notes.
        </p>
      </LegalSection>

      <LegalSection heading="How long we keep it">
        <p>[PLACEHOLDER — state your retention periods.]</p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          [PLACEHOLDER — confirm and edit.] You can download a copy of your
          information or delete your account at any time from your Profile page.
          Under UK GDPR you also have rights to correction, restriction and
          complaint to the Information Commissioner&apos;s Office.
        </p>
      </LegalSection>

      <LegalSection heading="Not a medical service">
        <p>
          CareCircle is for practical admin only. It does not provide medical,
          legal or financial advice. In an emergency call 999.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
