import {
  Body,
  Button,
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
  Font,
} from '@react-email/components';
import * as React from 'react';

export const TechnicalAlertEmail = ({ 
  serialNumber = 'N/A',
  displayType = 'Maintenance',
  technicalData = {},
  answers = {},
  brandColor = '#172F36',
  logoUrl = '/logo/zelim-logo-dark.png',
  previewUrl = null
}) => {
  const submissionDate = new Date();
  const formattedDate = submissionDate.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const formattedTime = submissionDate.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
  });

  const airtableBaseId = 'appOQXbopTwn0SdnL'; 
  const airtableTableId = 'tblo0gVrtd422UQgd';
  const airtableUrl = technicalData?.unit_record_id 
    ? `https://airtable.com/${airtableBaseId}/${airtableTableId}/${technicalData.unit_record_id}`
    : '#';

  const absoluteLogoUrl = logoUrl?.startsWith('http') 
    ? logoUrl 
    : `https://maintenance.exuma.co.uk${logoUrl?.startsWith('/') ? logoUrl : `/${logoUrl}`}`;

  return (
    <Html>
      <Head>
        <Font
          fontFamily="Montserrat"
          fallbackFontFamily="Arial"
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>{serialNumber} {displayType} Submitted</Preview>
      <Body style={main}>
        {previewUrl && (
          <Container style={previewLinkContainer}>
            <Text style={previewLinkText}>
              Having trouble viewing this email?{' '}
              <a href={previewUrl} style={previewLink}>View in browser</a>
            </Text>
          </Container>
        )}
        
        {/* Container: Border and 1px outline removed */}
        <Container style={container}>
          {/* Header Section */}
          <Section style={headerSection}>
            {logoUrl && (
              <Img
                src={absoluteLogoUrl}
                width="250"
                alt="Company Logo"
                style={logo}
              />
            )}
          </Section>

          {/* Adjusted Padding for Mobile responsiveness (20px gutters) */}
          <Section style={contentPadding}>
            <Heading style={h1}>{serialNumber}</Heading>
            <Text style={subTitle}>
              {displayType} Submitted
            </Text>
            
            <Text style={text}>
              A new <strong>{displayType}</strong> has been submitted for unit{' '}
              <strong>{serialNumber}</strong>.
            </Text>

            {/* Status Cards - Text colors updated to #152a31 */}
            <Section style={statusCard}>
              <Row>
                <Column style={{ paddingRight: '20px' }}>
                  <Text style={label}>Maintenance Company</Text>
                  <Text style={value}>{technicalData?.maintenance_company || 'N/A'}</Text>
                </Column>
                <Column style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: '20px' }}>
                  <Text style={label}>Engineer Name</Text>
                  <Text style={value}>{technicalData?.engineer_name || 'N/A'}</Text>
                </Column>
              </Row>
            </Section>

            <Section style={statusCard}>
              <Row>
                <Column style={{ paddingRight: '20px' }}>
                  <Text style={label}>Location</Text>
                  <Text style={value}>{technicalData?.location_display || 'N/A'}</Text>
                </Column>
                <Column style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: '20px' }}>
                  <Text style={label}>Date</Text>
                  <Text style={value}>{formattedDate}</Text>
                </Column>
              </Row>
            </Section>

            {/* Left Aligned Button Styled per requirements */}
            {technicalData?.unit_record_id && (
              <Section style={buttonAligner}>
                <Button 
                  style={submissionButton} 
                  href={airtableUrl}
                >
                  View submission online
                </Button>
              </Section>
            )}

            {Object.keys(answers).length > 0 && (
              <>
                <Heading as="h2" style={h2}>Checklist Details</Heading>
                <Section>
                  {Object.entries(answers).map(([question, answerData], i) => {
                    const isObject = typeof answerData === 'object' && answerData !== null;
                    const answerContent = isObject ? answerData.text : answerData;
                    const images = isObject ? (answerData.images || []) : [];

                    return (
                      <div key={i} style={answerBlock}>
                        <Text style={questionText}>{question}</Text>
                        <Text style={answerValueText}>
                          {answerContent !== null && answerContent !== undefined && answerContent !== '' 
                            ? String(answerContent) 
                            : 'Not answered'}
                        </Text>
                        
                        {images.length > 0 && (
                          <Section style={imageGallery}>
                            {images.map((imageUrl, imgIndex) => (
                              <a key={imgIndex} href={imageUrl} style={imageLink}>
                                <Img
                                  src={imageUrl}
                                  alt={`Image ${imgIndex + 1}`}
                                  width="150"
                                  height="150"
                                  style={imageThumbnail}
                                />
                              </a>
                            ))}
                          </Section>
                        )}
                      </div>
                    );
                  })}
                </Section>
              </>
            )}
          </Section>

          <Section style={footerSection}>
            <a href="https://www.zelim.com" style={footerLink}>
              <Img
                src="https://maintenance.exuma.co.uk/logo/zelim-logo-dark.png"
                width="120"
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

export default TechnicalAlertEmail;

const main = {
  backgroundColor: '#ffffff',
  padding: '10px 0',
  fontFamily: 'Montserrat, -apple-system, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  maxWidth: '600px',
  // Removed border and outline
};

const headerSection = {
  padding: '20px 0',
  textAlign: 'center',
};

const contentPadding = {
  // Mobile fix: Using 20px padding for the standard margin look
  padding: '0 20px 40px 20px',
};

const h1 = {
  color: '#152a31',
  fontSize: '32px',
  fontWeight: '800',
  margin: '0',
  textAlign: 'left',
};

const subTitle = {
  fontSize: '13px',
  fontWeight: '700',
  textTransform: 'uppercase',
  textAlign: 'left',
  letterSpacing: '1.5px',
  margin: '4px 0 24px 0',
  color: '#152a31',
};

const text = {
  color: '#152a31',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '12px 0',
};

const statusCard = {
  backgroundColor: '#F1F5F9',
  borderRadius: '8px',
  padding: '16px',
  margin: '12px 0',
};

const label = {
  fontSize: '11px',
  color: '#152a31',
  textTransform: 'uppercase',
  fontWeight: '700',
  margin: '0',
  opacity: 0.7,
};

const value = {
  fontSize: '15px',
  color: '#152a31',
  fontWeight: '600',
  margin: '4px 0 0 0',
};

const buttonAligner = {
  textAlign: 'left',
  margin: '30px 0',
};

const submissionButton = {
  backgroundColor: '#00fff6',
  color: '#0d3037',
  padding: '8px 16px',
  borderRadius: '8px',
  border: '2px solid hsla(0, 0%, 100%, .12)',
  fontWeight: '600',
  fontSize: '14px',
  lineHeight: '20px',
  textDecoration: 'none',
  display: 'inline-block',
  fontFamily: 'Montserrat, sans-serif',
};

const h2 = {
  color: '#152a31',
  fontSize: '18px',
  fontWeight: '700',
  margin: '40px 0 20px 0',
};

const answerBlock = {
  marginBottom: '24px',
};

const questionText = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#152a31',
  margin: '0 0 4px 0',
};

const answerValueText = {
  fontSize: '14px',
  color: '#152a31',
  margin: '0',
  lineHeight: '1.5',
};

// ... Remaining styles updated for text color
const logo = { margin: '0 auto', display: 'block', maxWidth: '250px' };
const imageGallery = { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' };
const imageLink = { display: 'inline-block', marginRight: '8px' };
const imageThumbnail = { width: '150px', height: '150px', objectFit: 'cover', borderRadius: '8px' };
const footerSection = { padding: '40px 20px', textAlign: 'center' };
const footerLogo = { margin: '0 auto', display: 'block', width: '100px' };
const attribution = { fontSize: '12px', color: '#152a31', opacity: 0.5, marginTop: '12px' };
const footerLink = { textDecoration: 'none' };
const previewLinkContainer = { maxWidth: '600px', margin: '0 auto 10px auto', textAlign: 'center' };
const previewLinkText = { fontSize: '12px', color: '#152a31', margin: '0' };
const previewLink = { color: '#152a31', textDecoration: 'underline' };