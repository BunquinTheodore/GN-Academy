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

type EmployerEnquiryEmailProps = {
  employerName: string;
  employerEmail: string;
  company: string | null;
  message: string;
  talent: string | null;
};

/**
 * Internal notification sent to the GN Academy inbox when an employer
 * enquiry comes in through /employers/enquire. Not sent to the employer —
 * a human replies from the shared inbox once they have read it.
 */
export function EmployerEnquiryEmail({
  employerName,
  employerEmail,
  company,
  message,
  talent,
}: EmployerEnquiryEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{`New employer enquiry: ${employerName}`}</Preview>
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
            New employer enquiry
          </Heading>
          <Section>
            <Text style={{ color: "#101B2E", fontSize: 15, margin: "4px 0" }}>
              <strong>From:</strong> {employerName}
            </Text>
            <Text style={{ color: "#101B2E", fontSize: 15, margin: "4px 0" }}>
              <strong>Email:</strong> {employerEmail}
            </Text>
            <Text style={{ color: "#101B2E", fontSize: 15, margin: "4px 0" }}>
              <strong>Company:</strong> {company || "Not specified"}
            </Text>
            <Text style={{ color: "#101B2E", fontSize: 15, margin: "4px 0" }}>
              <strong>Talent enquired about:</strong> {talent || "Not specified"}
            </Text>
            <Text style={{ color: "#5A6B82", fontSize: 14, marginTop: 16 }}>
              {message}
            </Text>
          </Section>
          <Text style={{ color: "#5A6B82", fontSize: 12, marginTop: 24 }}>
            Sent from the Employer Enquiry form at GN Academy.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
