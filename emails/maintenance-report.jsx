import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Heading,
  Row,
  Column,
} from '@react-email/components';
import * as React from 'react';

export const MaintenanceReportEmail = ({ 
  engineerName = 'Engineer', 
  serialNumber = 'N/A', 
  answers = {},
  brandColor = '#172F36',
  logoUrl = '/logo/zelim-logo-dark.png',
  previewUrl = null
}) => {
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Ensure logo URL is absolute for email clients
  const absoluteLogoUrl = logoUrl?.startsWith('http') 
    ? logoUrl 
    : `https://maintenance.exuma.co.uk${logoUrl?.startsWith('/') ? logoUrl : `/${logoUrl}`}`;

  return (
    <Html>
      <Head />
      <Preview>Maintenance Summary: {serialNumber}</Preview>
      <Body style={main}>
        {/* View in browser link */}
        {previewUrl && (
          <Container style={previewLinkContainer}>
            <Text style={previewLinkText}>
              Having trouble viewing this email?{' '}
              <a href={previewUrl} style={previewLink}>View in browser</a>
            </Text>
          </Container>
        )}
        <Container style={container}>
          {/* Header with Brand Color Accent */}
          <Section style={{ ...headerSection, borderTop: `6px solid ${brandColor}` }}>
            {logoUrl && (
              <Img
                src={absoluteLogoUrl}
                width="250"
                height="40"
                alt="Company Logo"
                style={logo}
              />
            )}
          </Section>

          <Section style={contentPadding}>
            <Heading style={h1}>{serialNumber}</Heading>
            <Text style={{ ...subTitle, color: brandColor }}>
              Maintenance Confirmation
            </Text>
            
            <Text style={text}>
              Hello <strong>{engineerName}</strong>,
            </Text>
            <Text style={text}>
              This is your official maintenance receipt for work completed on{' '}
              <strong>{today}</strong>. A copy of this report has been logged in our 
              central system.
            </Text>

            <Hr style={hr} />

            {/* Status Card - Visual Summary */}
            <Section style={statusCard}>
              <Row>
                <Column style={{ paddingRight: '20px' }}>
                  <Text style={label}>Unit Serial</Text>
                  <Text style={value}>{serialNumber}</Text>
                </Column>
                <Column style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: '20px' }}>
                  <Text style={label}>Completion Date</Text>
                  <Text style={value}>{today}</Text>
                </Column>
              </Row>
            </Section>

            {/* Only show checklist if there are answers */}
            {Object.keys(answers).length > 0 && (
              <>
                <Heading as="h2" style={h2}>Checklist Details</Heading>
                
                <Section>
                  {Object.entries(answers).map(([question, answer], i) => (
                    <div key={i} style={answerBlock}>
                      <Text style={questionText}>{question}</Text>
                      <Text style={answerText}>
                        {answer !== null && answer !== undefined && answer !== '' 
                          ? String(answer) 
                          : 'Not answered'}
                      </Text>
                    </div>
                  ))}
                </Section>

                <Hr style={hr} />
              </>
            )}

            <Text style={footerContactText}>
              Need technical assistance? Contact{' '}
              <a href="mailto:maintenance@zelim.com" style={emailLink}>
                maintenance@zelim.com
              </a>
            </Text>
          </Section>

          <Section style={footerSection}>
            <a href="https://www.zelim.com" style={footerLink}>
              <Img
                src="https://maintenance.exuma.co.uk/logo/zelim-logo-dark.png"
                width="120"
                height="40"
                alt="Zelim logo"
                style={footerLogo}
              />
            </a>
            <Text style={attribution}>
              © {new Date().getFullYear()} Zelim Limited | Find Recover Protect
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default MaintenanceReportEmail;

// --- Styles: Professional Maritime Aesthetic ---
const previewLinkContainer = {
  maxWidth: '600px',
  margin: '0 auto 10px auto',
  textAlign: 'center',
};

const previewLinkText = {
  fontSize: '12px',
  color: '#64748B',
  margin: '0',
};

const previewLink = {
  color: '#172F36',
  textDecoration: 'underline',
};

const main = {
  backgroundColor: '#F8FAFC',
  padding: '40px 0',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  maxWidth: '600px',
  borderRadius: '12px',
  border: '1px solid #E2E8F0',
  overflow: 'hidden',
};

const headerSection = {
  padding: '40px 0 20px 0',
  textAlign: 'center',
};

const logo = {
  margin: '0 auto',
  display: 'block',
  maxWidth: '250px',
  maxHeight: '40px',
  width: '100%',
  height: 'auto',
  objectFit: 'contain',
};

const contentPadding = {
  padding: '0 50px 50px 50px',
};

const h1 = {
  color: '#0F172A',
  fontSize: '36px',
  fontWeight: '800',
  margin: '0',
  textAlign: 'center',
  letterSpacing: '-1px',
};

const subTitle = {
  fontSize: '13px',
  fontWeight: '700',
  textTransform: 'uppercase',
  textAlign: 'center',
  letterSpacing: '1.5px',
  margin: '4px 0 40px 0',
};

const text = {
  color: '#475569',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '12px 0',
};

const statusCard = {
  backgroundColor: '#F1F5F9',
  borderRadius: '8px',
  padding: '24px',
  margin: '32px 0',
};

const label = {
  fontSize: '11px',
  color: '#64748B',
  textTransform: 'uppercase',
  fontWeight: '700',
  margin: '0',
  letterSpacing: '0.5px',
};

const value = {
  fontSize: '16px',
  color: '#0F172A',
  fontWeight: '600',
  margin: '4px 0 0 0',
};

const h2 = {
  color: '#0F172A',
  fontSize: '18px',
  fontWeight: '700',
  margin: '40px 0 24px 0',
};

const answerBlock = {
  marginBottom: '20px',
  paddingLeft: '12px',
  borderLeft: '2px solid #E2E8F0',
};

const questionText = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#1E293B',
  margin: '0 0 4px 0',
};

const answerText = {
  fontSize: '14px',
  color: '#475569',
  margin: '0',
  lineHeight: '1.5',
  whiteSpace: 'pre-wrap',
};

const hr = {
  borderColor: '#F1F5F9',
  margin: '40px 0',
};

const footerContactText = {
  fontSize: '13px',
  color: '#94A3B8',
  textAlign: 'center',
  margin: '0',
};

const emailLink = {
  color: '#172F36',
  textDecoration: 'underline',
  fontWeight: '600',
};

const footerSection = {
  paddingBottom: '40px',
  textAlign: 'center',
};

const footerLink = {
  textDecoration: 'none',
  display: 'inline-block',
  marginBottom: '12px',
};

const footerLogo = {
  margin: '0 auto',
  display: 'block',
};

const attribution = {
  fontSize: '12px',
  color: '#CBD5E1',
  margin: '0',
};