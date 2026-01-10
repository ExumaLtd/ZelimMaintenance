import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Heading,
} from '@react-email/components';
import * as React from 'react';

export const TechnicalAlertEmail = ({ 
  serialNumber, 
  displayType, 
  technicalData, 
  answers,
  brandColor,
  logoUrl
}) => {
  // Updated with your specific Airtable IDs for the maintenance_logs table
  const airtableBaseId = 'appOQXbopTwn0SdnL'; 
  const airtableTableId = 'tblo0gVrtd422UQgd';
  const airtableUrl = `https://airtable.com/${airtableBaseId}/${airtableTableId}/${technicalData?.unit_record_id}`;

  const ZELIM_GREEN = brandColor || '#172F36';

  return (
    <Html>
      <Head />
      <Preview>Internal Alert: {serialNumber} - {displayType}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img 
              src={logoUrl} 
              width="140" 
              alt="Zelim Logo" 
              style={logo} 
            />
          </Section>

          <Heading style={{ ...h1, color: ZELIM_GREEN }}>Internal Maintenance Alert</Heading>
          
          <Text style={text}>
            A new <strong>{displayType}</strong> has been submitted for unit <strong>{serialNumber}</strong>.
          </Text>
          
          <Section style={buttonContainer}>
            <Button 
              pX={28} 
              pY={14} 
              style={{ ...button, backgroundColor: ZELIM_GREEN }} 
              href={airtableUrl}
            >
              View Record in Airtable
            </Button>
          </Section>

          <Hr style={hr} />

          <Section>
            <Heading as="h2" style={{ ...h2, color: ZELIM_GREEN }}>Technical Metadata</Heading>
            <div style={metadata}>
              <Text style={metadataText}><strong>Unit Record ID:</strong> {technicalData?.unit_record_id || 'N/A'}</Text>
              <Text style={metadataText}><strong>Template ID:</strong> {technicalData?.checklist_template_id || 'N/A'}</Text>
              <Text style={metadataText}><strong>Engineer Phone:</strong> {technicalData?.engineer_phone || 'N/A'}</Text>
              <Text style={metadataText}><strong>Location:</strong> {technicalData?.location_country || 'N/A'}</Text>
            </div>
          </Section>

          <Hr style={hr} />

          <Section>
            <Heading as="h2" style={{ ...h2, color: ZELIM_GREEN }}>Checklist Responses</Heading>
            {Object.entries(answers).map(([question, answer], i) => (
              <div key={i} style={answerBlock}>
                <Text style={questionText}><strong>{question}</strong></Text>
                <Text style={answerText}>{answer}</Text>
              </div>
            ))}
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default TechnicalAlertEmail;

// --- Styles ---
const main = { 
  backgroundColor: '#f6f9fc', 
  padding: '40px 0', 
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif' 
};

const container = { 
  backgroundColor: '#ffffff', 
  border: '1px solid #e5e7eb', 
  padding: '45px', 
  margin: '0 auto', 
  borderRadius: '12px' 
};

const logoSection = {
  textAlign: 'center',
  marginBottom: '32px'
};

const logo = {
  margin: '0 auto',
};

const h1 = { 
  fontSize: '24px', 
  fontWeight: 'bold', 
  margin: '20px 0',
  textAlign: 'center'
};

const h2 = { 
  fontSize: '14px', 
  fontWeight: 'bold', 
  textTransform: 'uppercase', 
  letterSpacing: '1px', 
  margin: '20px 0' 
};

const text = { 
  color: '#333', 
  fontSize: '16px', 
  lineHeight: '24px',
  textAlign: 'center'
};

const buttonContainer = { 
  textAlign: 'center', 
  margin: '32px 0' 
};

const button = { 
  borderRadius: '8px', 
  color: '#ffffff', 
  fontSize: '16px', 
  fontWeight: '600', 
  textDecoration: 'none', 
  textAlign: 'center', 
  display: 'inline-block' 
};

const hr = { 
  borderColor: '#e5e7eb', 
  margin: '40px 0' 
};

const metadata = { 
  backgroundColor: '#f9fafb', 
  padding: '16px', 
  borderRadius: '8px',
  border: '1px solid #f3f4f6'
};

const metadataText = { 
  fontSize: '13px', 
  color: '#4b5563', 
  margin: '6px 0' 
};

const answerBlock = { 
  marginBottom: '20px', 
  paddingBottom: '12px', 
  borderBottom: '1px solid #f3f4f6' 
};

const questionText = { 
  margin: '0 0 4px 0', 
  fontSize: '14px', 
  color: '#111827' 
};

const answerText = { 
  margin: '0', 
  fontSize: '14px', 
  color: '#4b5563', 
  lineHeight: '1.5' 
};