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
} from 'react-email';
import * as React from 'react';

interface FaultReportEmailProps {
  engineerName?: string;
  serialNumber?: string;
  reportType?: string;
  maintenanceCompany?: string;
  companyName?: string;
  location?: string;
  answers?: Record<string, any>;
  brandColor?: string;
  logoUrl?: string;
  zelimLogoUrl?: string;
  previewUrl?: string | null;
}

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
  zelimLogoUrl = '/logo/zelim-logo-dark.png',
  previewUrl = null,
}: FaultReportEmailProps) => {
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Ensure logo URL is absolute for email clients
  const absoluteLogoUrl = logoUrl?.startsWith('http')
    ? logoUrl
    : `https://maintenance.exuma.co.uk${logoUrl?.startsWith('/') ? logoUrl : `/${logoUrl}`}`;
  const absoluteZelimLogoUrl = zelimLogoUrl?.startsWith('http')
    ? zelimLogoUrl
    : `https://maintenance.exuma.co.uk${zelimLogoUrl?.startsWith('/') ? zelimLogoUrl : `/${zelimLogoUrl}`}`;

  return (
    <Html>
      <Head>
        <style>{`
          /* Desktop styles */
          @media only screen and (min-width: 601px) {
            body, .email-body {
              background-color: #eaeeed !important;
            }
            
            /* Desktop info values - larger text */
            .status-value {
              font-size: 16px !important;
              line-height: 24px !important;
            }
            
            /* Image gallery - 4 per row on desktop with square aspect ratio */
            .image-link {
              width: calc(25% - 10px) !important;
            }
            
            .image-link img {
              width: 100% !important;
              height: auto !important;
              aspect-ratio: 1 / 1 !important;
              object-fit: cover !important;
              border: none !important;
            }
          }
          
          /* Mobile styles */
          @media only screen and (max-width: 600px) {
            body, .email-body {
              background-color: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            
            /* Make container full width on mobile */
            .email-container {
              max-width: 100% !important;
              width: 100% !important;
              margin: 0 !important;
            }
            
            /* Reduce content padding to 20px on mobile */
            .content-padding {
              padding: 0 20px 50px 20px !important;
            }
            
            /* Status card padding on mobile - match checklist boxes */
            .status-card-mobile {
              padding: 20px 24px !important;
            }
            
            /* Image gallery - 2 per row on mobile, fill width inside grey box with 10px gap */
            .image-gallery-mobile {
              margin-left: 0 !important;
              margin-right: 0 !important;
              margin-top: 12px !important;
              display: flex !important;
              flex-wrap: wrap !important;
            }
            
            .image-link {
              box-sizing: border-box !important;
              margin: 0 0 10px 0 !important;
              padding: 0 !important;
            }
            
            .image-link:nth-child(2n+1) {
              width: calc(50% - 5px) !important;
              margin-right: 10px !important;
            }
            
            .image-link:nth-child(2n) {
              width: calc(50% - 5px) !important;
              margin-left: 0 !important;
            }
            
            .image-link img {
              width: 100% !important;
              height: auto !important;
              aspect-ratio: 1 / 1 !important;
              object-fit: cover !important;
              border: none !important;
            }
          }
        `}</style>
      </Head>
      <Preview>Fault Report 🚨 {serialNumber}</Preview>
      <Body style={main} className="email-body">
        <Container style={container} className="email-container">
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

          <Section style={contentPadding} className="content-padding">
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
            <Section style={statusCard} className="status-card-section status-card-mobile">
              <Row style={{ marginBottom: '20px' }}>
                <Column style={{ paddingRight: '12px', width: '33.33%', verticalAlign: 'top' }} className="mobile-col">
                  <Text style={label}>Unit Serial</Text>
                  <Text style={value} className="status-value">{serialNumber}</Text>
                </Column>
                <Column style={{ paddingLeft: '12px', paddingRight: '12px', width: '33.33%', verticalAlign: 'top' }} className="mobile-col">
                  <Text style={label}>Report Date</Text>
                  <Text style={value} className="status-value">{today}</Text>
                </Column>
                <Column style={{ paddingLeft: '12px', width: '33.33%', verticalAlign: 'top' }} className="mobile-col">
                  <Text style={label}>Location</Text>
                  <Text style={value} className="status-value">{location && location.includes(',') ? location.split(',').pop().trim() : location}</Text>
                </Column>
              </Row>
              <Row>
                <Column style={{ paddingRight: '12px', width: '33.33%', verticalAlign: 'top' }} className="mobile-col">
                  <Text style={label}>Company Name</Text>
                  <Text style={value} className="status-value">{companyName}</Text>
                </Column>
                <Column style={{ paddingLeft: '12px', paddingRight: '12px', width: '33.33%', verticalAlign: 'top' }} className="mobile-col">
                  <Text style={label}>Maintenance Company</Text>
                  <Text style={value} className="status-value">{maintenanceCompany}</Text>
                </Column>
                <Column style={{ paddingLeft: '12px', width: '33.33%', verticalAlign: 'top' }} className="mobile-col">
                  <Text style={label}>Engineer Name</Text>
                  <Text style={value} className="status-value">{engineerName}</Text>
                </Column>
              </Row>
            </Section>

            {/* Fault Report Details */}
            {Object.keys(answers).length > 0 && (
              <>
                <Heading as="h2" style={h2}>Fault report details</Heading>
                
                <Section>
                  {Object.entries(answers).map(([question, answerData], i) => {
                    // Handle both old format (string) and new format (object with text/images)
                    const isObject = typeof answerData === 'object' && answerData !== null;
                    const answerText = isObject ? answerData.text : answerData;
                    const images = isObject ? (answerData.images || []) : [];

                    // ✅ Skip showing "Not answered" for Photograph SWIFT if there are images
                    const isPhotographQuestion = question.toLowerCase().includes('photograph');
                    const hasImages = images.length > 0;
                    const hasNoText = !answerText || answerText === '';
                    const shouldSkipNotAnswered = isPhotographQuestion && hasImages && hasNoText;

                    return (
                      <div key={i} style={answerBlock}>
                        <Text style={questionText}>{question}</Text>
                        {!shouldSkipNotAnswered && (
                          <Text style={answerTextStyle}>
                            {answerText !== null && answerText !== undefined && answerText !== '' 
                              ? String(answerText) 
                              : 'Not answered'}
                          </Text>
                        )}
                        
                        {/* Display images if present */}
                        {images.length > 0 && (
                          <Section style={{...imageGallery, marginTop: shouldSkipNotAnswered ? '8px' : '12px'}} className="image-gallery-mobile">
                            {images.map((imageUrl, imgIndex) => (
                              <Link 
                                key={imgIndex} 
                                href={imageUrl}
                                target="_blank"
                                style={imageLink}
                                className="image-link"
                              >
                                <Img
                                  src={imageUrl}
                                  alt={`${question} - Image ${imgIndex + 1}`}
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
              <a href={`mailto:maintenance@zelim.com?subject=${encodeURIComponent(`${serialNumber} Technical Assistance Request`)}`} style={emailLink}>
                maintenance@zelim.com
              </a>
            </Text>
          </Section>

          <Section style={footerSection}>
            <a href="https://www.zelim.com" style={footerLink}>
              <Img
                src={absoluteZelimLogoUrl}
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
const main: React.CSSProperties = {
  backgroundColor: '#eaeeed', // Grey on desktop, white on mobile
  padding: '0',
  margin: '0',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
};

const container : React.CSSProperties = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  maxWidth: '620px',
  overflow: 'hidden',
};

const headerSection : React.CSSProperties = {
  padding: '36px 0 30px 0',
  textAlign: 'center',
};

const logo : React.CSSProperties = {
  margin: '0 auto',
  display: 'block',
  maxWidth: '250px',
  maxHeight: '40px',
  width: '100%',
  height: 'auto',
  objectFit: 'contain',
};

const contentPadding : React.CSSProperties = {
  padding: '0 30px 50px 30px',
};

const h1 : React.CSSProperties = {
  color: '#152a31',
  fontSize: '32px',
  fontWeight: '600',
  margin: '0',
  textAlign: 'center',
  letterSpacing: '1px',
};

const subTitle : React.CSSProperties = {
  fontSize: '13px',
  lineHeight: '24px',
  fontWeight: '600',
  textTransform: 'uppercase',
  textAlign: 'center',
  letterSpacing: '1px',
  margin: '4px 0 36px 0',
};

const text : React.CSSProperties = {
  color: '#152a31',
  fontSize: '15px',
  lineHeight: '21px',
  margin: '12px 0',
  textAlign: 'left',
};

const statusCard : React.CSSProperties = {
  backgroundColor: '#f3f6f5',
  borderRadius: '8px',
  padding: '20px 24px',
  margin: '32px 0',
};

const label : React.CSSProperties = {
  fontSize: '11px',
  lineHeight: '16px',
  color: '#152a31',
  textTransform: 'uppercase',
  fontWeight: '600',
  margin: '0',
  letterSpacing: '0.5px',
  textAlign: 'left',
};

const value : React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '21px',
  color: '#152a31',
  fontWeight: '600',
  margin: '4px 0 0 0',
  textAlign: 'left',
};

const h2 : React.CSSProperties = {
  color: '#152a31',
  fontSize: '18px',
  fontWeight: '600',
  margin: '40px 0 24px 0',
  textAlign: 'left',
};

const answerBlock : React.CSSProperties = {
  marginBottom: '12px',
  padding: '20px 24px',
  backgroundColor: '#f3f6f5',
  borderRadius: '8px',
};

const questionText : React.CSSProperties = {
  fontSize: '15px',
  fontWeight: '400',
  color: '#152a31',
  margin: '0 0 4px 0',
  lineHeight: '21px',
};

const answerTextStyle : React.CSSProperties = {
  fontSize: '15px',
  color: '#152a31',
  margin: '0',
  lineHeight: '21px',
  whiteSpace: 'pre-wrap',
};

const imageGallery : React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  marginTop: '12px',
};

const imageLink : React.CSSProperties = {
  display: 'inline-block',
  textDecoration: 'none',
  padding: '0 5px 10px 5px',
};

const imageThumbnail : React.CSSProperties = {
  width: '100%',
  borderRadius: '8px',
  display: 'block',
};

const footerContactText : React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '21px',
  color: '#152a31',
  textAlign: 'left',
  margin: '24px 0 0 0',
};

const emailLink : React.CSSProperties = {
  color: '#152a31',
  textDecoration: 'underline',
  fontWeight: '600',
};

const footerSection : React.CSSProperties = {
  paddingBottom: '40px',
  textAlign: 'center',
};

const footerLink : React.CSSProperties = {
  textDecoration: 'none',
  display: 'inline-block',
  marginBottom: '12px',
};

const footerLogo : React.CSSProperties = {
  margin: '0 auto',
  display: 'block',
  width: '120px',
  height: 'auto',
  objectFit: 'contain',
};

const attribution : React.CSSProperties = {
  fontSize: '12px',
  color: '#152a31',
  margin: '0',
};