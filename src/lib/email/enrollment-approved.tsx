import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type EnrollmentApprovedEmailProps = {
  studentName: string;
  title: string;
  courseUrl: string;
};

/**
 * Sent when an admin confirms a manual GCash/Maya payment. Someone who paid
 * a real ₱1,499 and then waited has earned a clear "you're in" — the
 * dashboard changing quietly is not enough.
 */
export function EnrollmentApprovedEmail({
  studentName,
  title,
  courseUrl,
}: EnrollmentApprovedEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{`Payment confirmed — ${title} is open`}</Preview>
      <Body
        style={{ backgroundColor: "#F5F7FA", fontFamily: "Arial, sans-serif" }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 8,
            margin: "24px auto",
            maxWidth: 480,
            padding: 32,
          }}
        >
          <Text style={{ color: "#C08A2E", fontSize: 12, letterSpacing: 3 }}>
            PAYMENT CONFIRMED
          </Text>
          <Heading
            as="h1"
            style={{ color: "#101B2E", fontSize: 22, marginTop: 4 }}
          >
            {title} is open
          </Heading>
          <Text style={{ color: "#101B2E", fontSize: 15 }}>
            Hi {studentName}, we matched your payment reference and your
            enrollment is active. Every lesson is unlocked.
          </Text>
          <Section style={{ marginTop: 16 }}>
            <Link
              href={courseUrl}
              style={{
                backgroundColor: "#2C5FF6",
                borderRadius: 6,
                color: "#ffffff",
                display: "inline-block",
                fontSize: 15,
                padding: "12px 20px",
                textDecoration: "none",
              }}
            >
              Start the first lesson
            </Link>
          </Section>
          <Text style={{ color: "#5A6B82", fontSize: 13, marginTop: 20 }}>
            Work through the lessons at your own pace, then take the exam. Pass
            it and your credential gets a public verification page any employer
            can check.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
