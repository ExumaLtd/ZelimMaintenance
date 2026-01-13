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

export const TechnicalAlertEmail = ({ 
  serialNumber = 'N/A',
  displayType = 'Maintenance',
  technicalData = {},
  answers = {},
  brandColor = '#172F36',
  logoUrl = '/logo/zelim-logo-dark.png'
}) => {
  // Airtable configuration
  const airtableBaseId = 'appOQXbopTwn0SdnL'; 
  const airtableTableId = 'tblo0gVrtd422UQgd';
  const airtableUrl = technicalData?.unit_record_id 
    ? `https://airtable.com/${airtableBaseId}/${airtableTableId}/${technicalData.unit_record_id}`
    : '#';

  // Ensure logo URL is absolute
  const absoluteLogoUrl = logoUrl?.startsWith('http') 
    ? logoUrl 
    : `https://maintenance.exuma.co.uk${logoUrl?.startsWith('/') ? '' : '/'}${logoUrl}`;

  return (
    <Html>
      <Head />
      {/* Updated Preview/Subject Line - No "TECHNICAL ALERT:" prefix */}
      <Preview>{serialNumber} - {displayType} Submitted</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo Section */}
          <Section style={logoSection}>
            {logoUrl && (
              <Img 
                src={absoluteLogoUrl}
                width="140"
                height="47"
                alt="Company Logo" 
                style={logo} 
              />
            )}
          </Section>

          <Heading style={{ ...h1, color: brandColor }}>
            Internal Maintenance Alert
          </Heading>
          
          <Text style={text}>
            A new <strong>{displayType}</strong> has been submitted for unit{' '}
            <strong>{serialNumber}</strong>.
          </Text>
          
          {/* CTA Button */}
          {technicalData?.unit_record_id && (
            <Section style={buttonContainer}>
              <Button 
                pX={28} 
                pY={14} 
                style={{ ...button, backgroundColor: brandColor }} 
                href={airtableUrl}
              >
                View Record in Airtable
              </Button>
            </Section>
          )}

          <Hr style={hr} />

          {/* Technical Metadata Section */}
          <Section>
            <Heading as="h2" style={{ ...h2, color: brandColor }}>
              Technical Metadata
            </Heading>
            <div style={metadata}>
              <Text style={metadataText}>
                <strong>Unit Record ID:</strong>{' '}
                {technicalData?.unit_record_id || 'N/A'}
              </Text>
              <Text style={metadataText}>
                <strong>Template ID:</strong>{' '}
                {technicalData?.checklist_template_id || 'N/A'}
              </Text>
              <Text style={metadataText}>
                <strong>Engineer Phone:</strong>{' '}
                {technicalData?.engineer_phone || 'N/A'}
              </Text>
              <Text style={metadataText}>
                <strong>Location:</strong>{' '}
                {technicalData?.location_country || 'N/A'}
              </Text>
            </div>
          </Section>

          <Hr style={hr} />

          {/* Checklist Responses */}
          {Object.keys(answers).length > 0 && (
            <Section>
              <Heading as="h2" style={{ ...h2, color: brandColor }}>
                Checklist Responses
              </Heading>
              {Object.entries(answers).map(([question, answer], i) => (
                <div key={i} style={answerBlock}>
                  <Text style={questionText}>
                    <strong>{question}</strong>
                  </Text>
                  <Text style={answerText}>
                    {answer !== null && answer !== undefined && answer !== '' 
                      ? String(answer) 
                      : 'Not answered'}
                  </Text>
                </div>
              ))}
            </Section>
          )}

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Zelim | Intelligent Maritime Safety
            </Text>
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
  borderRadius: '12px',
  maxWidth: '600px'
};

const logoSection = {
  textAlign: 'center',
  marginBottom: '32px'
};

const logo = {
  margin: '0 auto',
  display: 'block'
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
  textAlign: 'center',
  margin: '16px 0'
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
  lineHeight: '1.5',
  whiteSpace: 'pre-wrap'
};

const footerSection = {
  marginTop: '40px',
  textAlign: 'center'
};

const footerText = {
  fontSize: '12px',
  color: '#94a3b8',
  margin: '0'
};