import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type DataRequestEmailProps = {
  email: string;
  kind: "access" | "correction" | "deletion";
  details: string | null;
  dueDate: string;
  reviewUrl: string;
};

const KIND_LABEL: Record<DataRequestEmailProps["kind"], string> = {
  access: "Access",
  correction: "Correction",
  deletion: "Deletion",
};

/**
 * Internal notification sent to the GN Academy inbox when a Data Privacy
 * Act request comes in through /data-request. This is the only alert that
 * pages the team about a legally-timed (15 working day) request — it is not
 * sent to the requester, who already sees a confirmation in the browser.
 */
export function DataRequestEmail({
  email,
  kind,
  details,
  dueDate,
  reviewUrl,
}: DataRequestEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{`Data Privacy Act request (${KIND_LABEL[kind]}): reply by ${dueDate}`}</Preview>
      <Body style={{ backgroundColor: "#F5F7FA", fontFamily: "Arial, sans-serif" }}>
        <Container
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 8,
            margin: "24px auto",
            maxWidth: 520,
            padding: 32,
          }}
        >
          <Heading as="h1" style={{ color: "#101B2E", fontSize: 20 }}>
            New Data Privacy Act request
          </Heading>
          <Text
            style={{
              color: "#8A1F11",
              fontSize: 14,
              fontWeight: "bold",
              margin: "4px 0 16px",
            }}
          >
            Due by {dueDate} (15 working days, RA 10173)
          </Text>
          <Section>
            <Text style={{ color: "#101B2E", fontSize: 15, margin: "4px 0" }}>
              <strong>Type:</strong> {KIND_LABEL[kind]}
            </Text>
            <Text style={{ color: "#101B2E", fontSize: 15, margin: "4px 0" }}>
              <strong>Requester email:</strong> {email}
            </Text>
            {details ? (
              <Text style={{ color: "#5A6B82", fontSize: 14, marginTop: 16 }}>
                {details}
              </Text>
            ) : null}
          </Section>
          <Text style={{ color: "#101B2E", fontSize: 14, marginTop: 20 }}>
            <a href={reviewUrl} style={{ color: "#101B2E" }}>
              Review and resolve this request
            </a>
          </Text>
          <Text style={{ color: "#5A6B82", fontSize: 12, marginTop: 24 }}>
            Sent from the Data Request form at GN Academy.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
