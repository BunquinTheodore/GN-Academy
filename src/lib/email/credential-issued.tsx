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

type CredentialIssuedEmailProps = {
  holderName: string;
  title: string;
  credentialCode: string;
  verifyUrl: string;
};

export function CredentialIssuedEmail({
  holderName,
  title,
  credentialCode,
  verifyUrl,
}: CredentialIssuedEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{`${credentialCode} — your credential is verifiable now`}</Preview>
      <Body style={{ backgroundColor: "#F5F7FA", fontFamily: "Arial, sans-serif" }}>
        <Container
          style={{
            backgroundColor: "#101B2E",
            borderRadius: 8,
            color: "#ffffff",
            margin: "24px auto",
            maxWidth: 480,
            padding: 32,
          }}
        >
          <Text style={{ color: "#C08A2E", fontSize: 12, letterSpacing: 3 }}>
            VERIFIED CREDENTIAL
          </Text>
          <Heading as="h1" style={{ color: "#ffffff", fontSize: 22, marginTop: 4 }}>
            {title}
          </Heading>
          <Text style={{ color: "#B9C4D6", fontSize: 15 }}>{holderName}</Text>
          <Text
            style={{
              color: "#ffffff",
              fontFamily: "Courier New, monospace",
              fontSize: 18,
              letterSpacing: 2,
            }}
          >
            {credentialCode}
          </Text>
          <Section style={{ marginTop: 16 }}>
            <Link
              href={verifyUrl}
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
              View my public verification page
            </Link>
          </Section>
          <Text style={{ color: "#B9C4D6", fontSize: 13, marginTop: 20 }}>
            Put the code on your CV and profiles — anyone can check it at the
            link above, no account needed. Congratulations; this one&apos;s
            earned.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
