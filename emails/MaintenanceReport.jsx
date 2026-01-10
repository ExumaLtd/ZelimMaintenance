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

export const MaintenanceReportEmail = ({ engineerName, serialNumber, answers = {} }) => {
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Html>
      <Head />
      <Preview>Maintenance Summary: {serialNumber}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with Zelim Blue Accent */}
          <Section style={headerSection}>
            <Img
              src="https://www.zelim.com/wp-content/uploads/2022/05/Zelim-Logo-Blue.png" 
              width="120"
              height="40"
              alt="Zelim Logo"
              style={logo}
            />
          </Section>

          <Section style={contentPadding}>
            <Heading style={h1}>{serialNumber}</Heading>
            <Text style={subTitle}>Maintenance Confirmation</Text>
            
            <Text style={text}>
              Hello <strong>{engineerName}</strong>,
            </Text>
            <Text style={text}>
              This is your official maintenance receipt for work completed on <strong>{today}</strong>. A copy of this report has been logged in our central system.
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

            <Heading as="h2" style={h2}>Checklist Details</Heading>
            
            <Section>
              {Object.entries(answers).map(([question, answer], i) => (
                <div key={i} style={answerBlock}>
                  <Text style={questionText}>{question}</Text>
                  <Text style={answerText}>{String(answer) || 'Not specified'}</Text>
                </div>
              ))}
            </Section>

            <Hr style={hr} />

            <Text style={footerContactText}>
              Need technical assistance? Contact <strong>maintenance@exuma.co.uk</strong>
            </Text>
          </Section>

          <Section style={footerSection}>
            <Text style={attribution}>© 2026 Zelim | Intelligent Maritime Safety</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default MaintenanceReportEmail;

// --- Styles: Zelim Brand Aesthetic ---
const zelimBlue = '#0057FF'; 

const main = {
  backgroundColor: '#F8FAFC',
  padding: '20px 0',
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
  borderTop: `6px solid ${zelimBlue}`, 
};

const logo = {
  margin: '0 auto',
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
  color: zelimBlue,
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
  borderLeft: `2px solid #E2E8F0`,
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
};

const hr = {
  borderColor: '#F1F5F9',
  margin: '40px 0',
};

const footerContactText = {
  fontSize: '13px',
  color: '#94A3B8',
  textAlign: 'center',
};

const footerSection = {
  paddingBottom: '40px',
  textAlign: 'center',
};

const attribution = {
  fontSize: '12px',
  color: '#CBD5E1',
};