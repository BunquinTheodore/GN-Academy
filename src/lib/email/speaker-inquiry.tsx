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

type SpeakerInquiryEmailProps = {
  name: string;
  organization: string;
  eventType: string;
  date: string;
  audienceSize: string;
  message: string;
};

/**
 * Internal notification sent to the GN Academy inbox when a speaker booking
 * inquiry comes in through /speaker-booking. Not sent to the inquirer —
 * a human replies from the shared inbox once they have read it.
 */
export function SpeakerInquiryEmail({
  name,
  organization,
  eventType,
  date,
  audienceSize,
  message,
}: SpeakerInquiryEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{`New speaker inquiry: ${organization}`}</Preview>
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
            New speaker booking inquiry
          </Heading>
          <Section>
            <Text style={{ color: "#101B2E", fontSize: 15, margin: "4px 0" }}>
              <strong>From:</strong> {name}
            </Text>
            <Text style={{ color: "#101B2E", fontSize: 15, margin: "4px 0" }}>
              <strong>Organization:</strong> {organization}
            </Text>
            <Text style={{ color: "#101B2E", fontSize: 15, margin: "4px 0" }}>
              <strong>Event type:</strong> {eventType}
            </Text>
            <Text style={{ color: "#101B2E", fontSize: 15, margin: "4px 0" }}>
              <strong>Preferred date:</strong> {date || "Not specified"}
            </Text>
            <Text style={{ color: "#101B2E", fontSize: 15, margin: "4px 0" }}>
              <strong>Audience size:</strong> {audienceSize || "Not specified"}
            </Text>
            <Text style={{ color: "#5A6B82", fontSize: 14, marginTop: 16 }}>
              {message}
            </Text>
          </Section>
          <Text style={{ color: "#5A6B82", fontSize: 12, marginTop: 24 }}>
            Sent from the Speaker Booking form at GN Academy.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
