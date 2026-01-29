import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Heading,
  Row,
  Column,
  Link,
} from '@react-email/components';
import * as React from 'react';

export const FaultReportEmail = ({ 
  engineerName = 'Engineer', 
  serialNumber = 'N/A',
  reportType = 'Fault Report',
  maintenanceCompany = 'N/A',
  companyName = 'N/A',
  location = 'N/A',
  answers = {},
  brandColor = '#152a31',
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
      <Preview>Fault Report 🚨 {serialNumber}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
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
              Fault Report Confirmation
            </Text>
            
            <Text style={text}>
              Hello <strong>{engineerName}</strong>,
            </Text>
            <Text style={text}>
              This is your official fault report receipt for the issue reported on{' '}
              <strong>{today}</strong>. A copy of this report has been logged in our 
              central system.
            </Text>

            {/* Status Card - All Info */}
            <Section style={statusCard}>
              <Row style={{ marginBottom: '20px' }}>
                <Column style={{ paddingRight: '12px', width: '33.33%' }}>
                  <Text style={label}>Unit Serial</Text>
                  <Text style={value}>{serialNumber}</Text>
                </Column>
                <Column style={{ paddingLeft: '12px', paddingRight: '12px', width: '33.33%' }}>
                  <Text style={label}>Report Date</Text>
                  <Text style={value}>{today}</Text>
                </Column>
                <Column style={{ paddingLeft: '12px', width: '33.33%' }}>
                  <Text style={label}>Location</Text>
                  <Text style={value}>{location}</Text>
                </Column>
              </Row>
              <Row>
                <Column style={{ paddingRight: '12px', width: '33.33%' }}>
                  <Text style={label}>Company Name</Text>
                  <Text style={value}>{companyName}</Text>
                </Column>
                <Column style={{ paddingLeft: '12px', paddingRight: '12px', width: '33.33%' }}>
                  <Text style={label}>Maintenance Company</Text>
                  <Text style={value}>{maintenanceCompany}</Text>
                </Column>
                <Column style={{ paddingLeft: '12px', width: '33.33%' }}>
                  <Text style={label}>Engineer Name</Text>
                  <Text style={value}>{engineerName}</Text>
                </Column>
              </Row>
            </Section>

            {/* Fault Report Details */}
            {Object.keys(answers).length > 0 && (
              <>
                <Heading as="h2" style={h2}>Fault Report Details</Heading>
                
                <Section>
                  {Object.entries(answers).map(([question, answerData], i) => {
                    // Handle both old format (string) and new format (object with text/images)
                    const isObject = typeof answerData === 'object' && answerData !== null;
                    const answerText = isObject ? answerData.text : answerData;
                    const images = isObject ? (answerData.images || []) : [];

                    return (
                      <div key={i} style={answerBlock}>
                        <Text style={questionText}>{question}</Text>
                        <Text style={answerTextStyle}>
                          {answerText !== null && answerText !== undefined && answerText !== '' 
                            ? String(answerText) 
                            : 'Not answered'}
                        </Text>
                        
                        {/* Display images if present */}
                        {images.length > 0 && (
                          <Section style={imageGallery}>
                            {images.map((imageUrl, imgIndex) => (
                              <Link 
                                key={imgIndex} 
                                href={imageUrl}
                                style={imageLink}
                              >
                                <Img
                                  src={imageUrl}
                                  alt={`${question} - Image ${imgIndex + 1}`}
                                  width="100%"
                                  height="134"
                                  style={imageThumbnail}
                                />
                              </Link>
                            ))}
                          </Section>
                        )}
                      </div>
                    );
                  })}
                </Section>
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

export default FaultReportEmail;

// --- Styles: Professional Maritime Aesthetic ---
const main = {
  backgroundColor: '#eaeeed',
  padding: '0',
  margin: '0',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  maxWidth: '620px',
  overflow: 'hidden',
};

const headerSection = {
  padding: '36px 0 30px 0',
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
  padding: '0 30px 50px 30px',
  '@media only screen and (max-width: 600px)': {
    padding: '0 20px 40px 20px',
  },
};

const h1 = {
  color: '#152a31',
  fontSize: '32px',
  fontWeight: '600',
  margin: '0',
  textAlign: 'center',
  letterSpacing: '1px',
};

const subTitle = {
  fontSize: '13px',
  lineHeight: '24px',
  fontWeight: '600',
  textTransform: 'uppercase',
  textAlign: 'left',
  letterSpacing: '1px',
  margin: '4px 0 36px 0',
};

const text = {
  color: '#152a31',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '12px 0',
  textAlign: 'center',
};

const statusCard = {
  backgroundColor: '#f3f6f5',
  borderRadius: '8px',
  padding: '20px 24px',
  margin: '32px 0',
};

const label = {
  fontSize: '11px',
  lineHeight: '16px',
  color: '#152a31',
  textTransform: 'uppercase',
  fontWeight: '600',
  margin: '0',
  letterSpacing: '0.5px',
  textAlign: 'left',
};

const value = {
  fontSize: '16px',
  color: '#152a31',
  fontWeight: '600',
  margin: '4px 0 0 0',
  textAlign: 'left',
};

const h2 = {
  color: '#152a31',
  fontSize: '18px',
  fontWeight: '600',
  margin: '40px 0 24px 0',
  textAlign: 'center',
};

const answerBlock = {
  marginBottom: '20px',
  paddingLeft: '0',
};

const questionText = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#152a31',
  margin: '0 0 4px 0',
};

const answerTextStyle = {
  fontSize: '14px',
  color: '#152a31',
  margin: '0',
  lineHeight: '1.5',
  whiteSpace: 'pre-wrap',
};

const imageGallery = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  marginTop: '12px',
};

const imageLink = {
  display: 'inline-block',
  flex: '0 0 calc(25% - 6px)',
  marginBottom: '0',
};

const imageThumbnail = {
  width: '100%',
  height: '134px',
  objectFit: 'cover',
  borderRadius: '8px',
  border: '1px solid #eaeeed',
  display: 'block',
};

const footerContactText = {
  fontSize: '13px',
  color: '#152a31',
  textAlign: 'left',
  margin: '40px 0 0 0',
};

const emailLink = {
  color: '#152a31',
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
  width: '120px',
  height: 'auto',
  objectFit: 'contain',
};

const attribution = {
  fontSize: '12px',
  color: '#152a31',
  margin: '0',
};