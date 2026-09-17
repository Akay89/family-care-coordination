import { createFileRoute } from "@tanstack/react-router";

import {
  LegalPage,
  LegalSection,
  PlaceholderNote,
} from "@/components/legal-page";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use · CareCircle" },
      {
        name: "description",
        content:
          "The terms for using CareCircle to share the practical admin of caring for a relative.",
      },
      { property: "og:title", content: "Terms of Use · CareCircle" },
      {
        property: "og:description",
        content: "The terms for using CareCircle.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="[DATE TO BE ADDED]">
      <PlaceholderNote />

      <LegalSection heading="Using CareCircle">
        <p>
          [PLACEHOLDER — confirm and edit.] CareCircle helps families organise
          the practical side of caring for someone. You must be 18 or over and
          keep your login details to yourself.
        </p>
      </LegalSection>

      <LegalSection heading="No medical, legal or financial advice">
        <p>
          CareCircle is strictly non-clinical. Checklists and guidance are
          general information only — always check the official GOV.UK or NHS page
          linked. In an emergency call 999.
        </p>
      </LegalSection>

      <LegalSection heading="What you share">
        <p>
          [PLACEHOLDER — confirm and edit.] Only share information about the
          person being cared for if you have their agreement or the legal
          authority to do so. You are responsible for who you invite into a
          circle.
        </p>
      </LegalSection>

      <LegalSection heading="Availability and liability">
        <p>[PLACEHOLDER — add your service availability and liability terms.]</p>
      </LegalSection>

      <LegalSection heading="Ending your account">
        <p>
          [PLACEHOLDER — confirm and edit.] You can delete your account at any
          time from your Profile page. We may suspend accounts that misuse the
          service.
        </p>
      </LegalSection>

      <LegalSection heading="Contact and governing law">
        <p>
          [PLACEHOLDER — add contact details and confirm these terms are governed
          by the law of England and Wales.]
        </p>
      </LegalSection>
    </LegalPage>
  );
}
