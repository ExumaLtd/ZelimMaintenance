import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
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
  answers 
}) => {
  // Updated with your specific Airtable IDs for the maintenance_logs table
  const airtableBaseId = 'appOQXbopTwn0SdnL'; 
  const airtableTableId = 'tblo0gVrtd422UQgd';
  const airtableUrl = `https://airtable.com/${airtableBaseId}/${airtableTableId}/${technicalData?.unit_record_id}`;

  return (
    <Html>
      <Head />
      <Preview>Internal Alert: {serialNumber} - {displayType}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Internal Maintenance Alert</Heading>
          <Text style={text}>
            A new <strong>{displayType}</strong> has been submitted for unit <strong>{serialNumber}</strong>.
          </Text>
          
          <Section style={buttonContainer}>
            <Button pX={20} pY={12} style={button} href={airtableUrl}>
              View Record in Airtable
            </Button>
          </Section>

          <Hr style={hr} />

          <Section>
            <Heading as="h2" style={h2}>Technical Metadata</Heading>
            <div style={metadata}>
              <Text style={metadataText}><strong>Unit Record ID:</strong> {technicalData?.unit_record_id || 'N/A'}</Text>
              <Text style={metadataText}><strong>Template ID:</strong> {technicalData?.checklist_template_id || 'N/A'}</Text>
              <Text style={metadataText}><strong>Engineer Phone:</strong> {technicalData?.engineer_phone || 'N/A'}</Text>
              <Text style={metadataText}><strong>Location:</strong> {technicalData?.location_country || 'N/A'}</Text>
            </div>
          </Section>

          <Hr style={hr} />

          <Section>
            <Heading as="h2" style={h2}>Checklist Responses</Heading>
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
const main = { backgroundColor: '#f6f9fc', padding: '10px 0', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif' };
const container = { backgroundColor: '#ffffff', border: '1px solid #f0f0f0', padding: '45px', margin: '0 auto' };
const h1 = { color: '#1a1a1a', fontSize: '24px', fontWeight: 'bold', margin: '20px 0' };
const h2 = { color: '#1a1a1a', fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '20px 0' };
const text = { color: '#333', fontSize: '16px', lineHeight: '24px' };
const buttonContainer = { textAlign: 'left', margin: '30px 0' };
const button = { backgroundColor: '#000', borderRadius: '5px', color: '#fff', fontSize: '14px', fontWeight: 'bold', textDecoration: 'none', textAlign: 'center', display: 'inline-block' };
const hr = { borderColor: '#e6ebf1', margin: '30px 0' };
const metadata = { backgroundColor: '#f9f9f9', padding: '12px 16px', borderRadius: '4px' };
const metadataText = { fontSize: '13px', color: '#555', margin: '4px 0' };
const answerBlock = { marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #f0f0f0' };
const questionText = { margin: '0 0 5px 0', fontSize: '14px', color: '#1a1a1a' };
const answerText = { margin: '0', fontSize: '14px', color: '#666', lineHeight: '1.4' };