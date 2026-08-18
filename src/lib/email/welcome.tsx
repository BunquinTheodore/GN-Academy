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

type WelcomeEmailProps = {
  score: number;
  levelLabel: string;
  weakestLabel: string;
  resultsUrl: string;
};

export function WelcomeEmail({
  score,
  levelLabel,
  weakestLabel,
  resultsUrl,
}: WelcomeEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{`Your AI Readiness score: ${score}/100 (${levelLabel})`}</Preview>
      <Body style={{ backgroundColor: "#F5F7FA", fontFamily: "Arial, sans-serif" }}>
        <Container
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 8,
            margin: "24px auto",
            maxWidth: 480,
            padding: 32,
          }}
        >
          <Heading as="h1" style={{ color: "#101B2E", fontSize: 22 }}>
            Your AI Readiness result
          </Heading>
          <Text style={{ color: "#101B2E", fontSize: 40, fontWeight: 700, margin: "8px 0" }}>
            {score}
            <span style={{ color: "#5A6B82", fontSize: 20, fontWeight: 400 }}>/100</span>
          </Text>
          <Text style={{ color: "#101B2E", fontSize: 16 }}>
            Level: <strong>{levelLabel}</strong>
            <br />
            Weakest area: <strong>{weakestLabel}</strong>
          </Text>
          <Section>
            <Text style={{ color: "#5A6B82", fontSize: 14 }}>
              Your result page has the full breakdown and what to work on
              first. It&apos;s yours to share — but remember, this score is
              unverified. Employers can only see credentials.
            </Text>
            <Link
              href={resultsUrl}
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
              View my full result
            </Link>
          </Section>
          <Text style={{ color: "#5A6B82", fontSize: 12, marginTop: 24 }}>
            You got this email because you asked for your AI Readiness Test
            result at GN Academy. This is a one-time transactional email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
