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
  Link,
} from '@react-email/components';
import * as React from 'react';

export const MaintenanceReportEmail = ({ 
  engineerName = 'Engineer', 
  serialNumber = 'N/A',
  reportType = 'Maintenance',
  maintenanceCompany = 'N/A',
  companyName = 'N/A',
  location = 'N/A',
  answers = {},
  equipmentChecklist = null,
  maintenanceChecklist = null,
  brandColor = '#172F36',
  logoUrl = '/logo/zelim-logo-dark.png',
  previewUrl = null,
  recordRef = null
}) => {
  const now = new Date();
  const today = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const submittedTime = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'GMT',
  });

  // Parse equipment checklist if it's a string (depth maintenance)
  let parsedEquipmentChecklist = null;
  if (equipmentChecklist) {
    try {
      parsedEquipmentChecklist = typeof equipmentChecklist === 'string' 
        ? JSON.parse(equipmentChecklist) 
        : equipmentChecklist;
    } catch (e) {
      console.error('Error parsing equipment checklist:', e);
    }
  }

  // Parse maintenance checklist if it's a string (monthly maintenance)
  let parsedMaintenanceChecklist = null;
  if (maintenanceChecklist) {
    try {
      parsedMaintenanceChecklist = typeof maintenanceChecklist === 'string' 
        ? JSON.parse(maintenanceChecklist) 
        : maintenanceChecklist;
    } catch (e) {
      console.error('Error parsing maintenance checklist:', e);
    }
  }

  // Ensure logo URL is absolute for email clients
  const absoluteLogoUrl = logoUrl?.startsWith('http') 
    ? logoUrl 
    : `https://maintenance.exuma.co.uk${logoUrl?.startsWith('/') ? logoUrl : `/${logoUrl}`}`;

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
      <Preview>{reportType} {
        reportType.toLowerCase().includes('depth') ? '🔧' : 
        reportType.toLowerCase().includes('unscheduled') ? '⚠️' : 
        reportType.toLowerCase().includes('fault') ? '🚨' : 
        '📋'
      } {serialNumber}</Preview>
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
              {reportType} Confirmation
            </Text>
            
            <Text style={text}>
              Hello <strong>{engineerName}</strong>,
            </Text>
            <Text style={text}>
              This is your official maintenance receipt for work completed on{' '}
              <strong>{today}</strong>. A copy of this report has been logged in our 
              central system.
            </Text>

            {/* Status Card - All Info */}
            <Section style={statusCard} className="status-card-section status-card-mobile">
              <Row style={{ marginBottom: '20px' }}>
                <Column style={{ paddingRight: '12px', width: '33.33%', verticalAlign: 'top' }} className="mobile-col">
                  <Text style={label}>Serial</Text>
                  <Text style={value} className="status-value">{serialNumber}</Text>
                </Column>
                <Column style={{ paddingLeft: '12px', paddingRight: '12px', width: '33.33%', verticalAlign: 'top' }} className="mobile-col">
                  <Text style={label}>Company</Text>
                  <Text style={value} className="status-value">{companyName}</Text>
                </Column>
                <Column style={{ paddingLeft: '12px', width: '33.33%', verticalAlign: 'top' }} className="mobile-col">
                  <Text style={label}>Date</Text>
                  <Text style={value} className="status-value">{today}</Text>
                </Column>
              </Row>
              <Row>
                <Column style={{ paddingRight: '12px', width: '33.33%', verticalAlign: 'top' }} className="mobile-col">
                  <Text style={label}>Maintained By</Text>
                  <Text style={value} className="status-value">{maintenanceCompany}</Text>
                </Column>
                <Column style={{ paddingLeft: '12px', paddingRight: '12px', width: '33.33%', verticalAlign: 'top' }} className="mobile-col">
                  <Text style={label}>Engineer</Text>
                  <Text style={value} className="status-value">{engineerName}</Text>
                </Column>
                <Column style={{ paddingLeft: '12px', width: '33.33%', verticalAlign: 'top' }} className="mobile-col">
                  <Text style={label}>Location</Text>
                  <Text style={value} className="status-value">{location && location.includes(',') ? location.split(',').pop().trim() : location}</Text>
                </Column>
              </Row>
            </Section>

            {/* Equipment Checklist Section (Depth Maintenance) */}
            {parsedEquipmentChecklist && parsedEquipmentChecklist.length > 0 && (
              <>
                <Heading as="h2" style={h2}>Pre-disassembly inspection</Heading>
                
                <Section>
                  {parsedEquipmentChecklist.map((item, i) => (
                    <div key={i} style={checklistItemBlock}>
                      <Text style={checklistItemName}>{item.name}</Text>
                      <Row style={{ marginBottom: '12px' }}>
                        <Column style={{ paddingRight: '10px' }}>
                          <Text style={checklistLabel}>Returned</Text>
                          <Text style={checklistValue}>
                            {item.returned === true ? '✓ Yes' : item.returned === false ? '✗ No' : 'Not answered'}
                          </Text>
                        </Column>
                        {item.returned === true && (
                          <Column style={{ paddingLeft: '10px' }}>
                            <Text style={checklistLabel}>Condition</Text>
                            <Text style={{
                              ...checklistValue,
                              color: item.condition === 'poor' ? '#EF4444' : item.condition === 'fair' ? '#F59E0B' : '#10B981'
                            }}>
                              {item.condition ? item.condition.charAt(0).toUpperCase() + item.condition.slice(1) : 'Not answered'}
                            </Text>
                          </Column>
                        )}
                      </Row>
                      
                      {item.images && item.images.length > 0 && (
                        <Section style={imageGallery} className="image-gallery-mobile">
                          {item.images.map((imageUrl, imgIndex) => (
                            <Link 
                              key={imgIndex} 
                              href={imageUrl}
                              target="_blank"
                              style={imageLink}
                              className="image-link"
                            >
                              <Img
                                src={imageUrl}
                                alt={`${item.name} - Image ${imgIndex + 1}`}
                                style={imageThumbnail}
                              />
                            </Link>
                          ))}
                        </Section>
                      )}
                    </div>
                  ))}
                </Section>
              </>
            )}

            {/* Maintenance Checklist Section (Monthly Maintenance) */}
            {parsedMaintenanceChecklist && parsedMaintenanceChecklist.length > 0 && (
              <>
                <Heading as="h2" style={h2}>Monthly inspection checklist</Heading>
                
                <Section>
                  {parsedMaintenanceChecklist.map((group, groupIndex) => (
                    <div key={groupIndex} style={monthlyGroupBlock}>
                      <Text style={monthlyGroupTitle}>{group.title}</Text>
                      
                      {group.questions && group.questions.map((question, qIndex) => (
                        <Row 
                          key={qIndex} 
                          style={{
                            ...monthlyQuestionRow,
                            marginBottom: qIndex === group.questions.length - 1 ? '0' : '8px'
                          }}
                        >
                          <Column style={{ width: '70%' }}>
                            <Text style={monthlyQuestionText}>{question.text}</Text>
                          </Column>
                          <Column style={{ width: '30%', textAlign: 'right' }}>
                            <Text style={{
                              ...monthlyAnswerText,
                              color: question.answer === 'Yes' ? '#10B981' : question.answer === 'No' ? '#EF4444' : '#94A3B8'
                            }}>
                              {question.answer === 'Yes' ? '✓ Yes' : question.answer === 'No' ? '✗ No' : 'Not answered'}
                            </Text>
                          </Column>
                        </Row>
                      ))}
                    </div>
                  ))}
                </Section>
              </>
            )}

            {/* Maintenance Questions Section */}
            {Object.keys(answers).length > 0 && (
              <>
                <Heading as="h2" style={h2}>
                  {reportType === 'Monthly' ? 'Additional comments' : `${reportType.charAt(0).toUpperCase() + reportType.slice(1).toLowerCase()} details`}
                </Heading>
                
                <Section>
                  {Object.entries(answers).map(([question, answerData], i) => {
                    const isObject = typeof answerData === 'object' && answerData !== null;
                    const answerText = isObject ? answerData.text : answerData;
                    const images = isObject ? (answerData.images || []) : [];

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
                        
                        {images.length > 0 && (
                          <Section style={{...imageGallery, marginTop: shouldSkipNotAnswered ? '8px' : '12px'}} className="image-gallery-mobile">
                            {images.map((item, imgIndex) => {
                              const imgUrl = typeof item === 'string' ? item : item.url;
                              const imgSrc = typeof item === 'string' ? item : (item.thumbnail || item.url);
                              return (
                                <Link
                                  key={imgIndex}
                                  href={imgUrl}
                                  target="_blank"
                                  style={imageLink}
                                  className="image-link"
                                >
                                  <Img
                                    src={imgSrc}
                                    alt={`${question} - Image ${imgIndex + 1}`}
                                    style={imageThumbnail}
                                  />
                                </Link>
                              );
                            })}
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
            {recordRef && (
              <Text style={recordRefText}>
                {recordRef} | {submittedTime} GMT, {today}
              </Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default MaintenanceReportEmail;

// --- Styles ---
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
  textAlign: 'center',
  letterSpacing: '1px',
  margin: '4px 0 36px 0',
};

const text = {
  color: '#152a31',
  fontSize: '15px',
  lineHeight: '21px',
  margin: '12px 0',
  textAlign: 'left',
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
  fontSize: '15px',
  lineHeight: '21px',
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
  textAlign: 'left',
};

const checklistItemBlock = {
  marginBottom: '12px',
  padding: '20px 24px',
  backgroundColor: '#f3f6f5',
  borderRadius: '8px',
};

const checklistItemName = {
  fontSize: '15px',
  fontWeight: '600',
  color: '#152a31',
  margin: '0 0 16px 0',
  lineHeight: '21px',
};

const checklistLabel = {
  fontSize: '11px',
  color: '#152a31',
  textTransform: 'uppercase',
  fontWeight: '600',
  margin: '0',
  letterSpacing: '0.5px',
};

const checklistValue = {
  fontSize: '15px',
  color: '#152a31',
  fontWeight: '600',
  margin: '4px 0 0 0',
  lineHeight: '21px',
};

const monthlyGroupBlock = {
  marginBottom: '12px',
  padding: '20px 24px',
  backgroundColor: '#f3f6f5',
  borderRadius: '8px',
};

const monthlyGroupTitle = {
  fontSize: '15px',
  fontWeight: '600',
  color: '#152a31',
  margin: '0 0 8px 0',
  lineHeight: '21px',
};

const monthlyQuestionRow = {
  padding: '0',
};

const monthlyQuestionText = {
  fontSize: '15px',
  color: '#152a31',
  margin: '0',
  fontWeight: '400',
  lineHeight: '21px',
};

const monthlyAnswerText = {
  fontSize: '15px',
  fontWeight: '600',
  margin: '0',
  lineHeight: '21px',
};

const answerBlock = {
  marginBottom: '12px',
  padding: '20px 24px',
  backgroundColor: '#f3f6f5',
  borderRadius: '8px',
};

const questionText = {
  fontSize: '15px',
  fontWeight: '600',
  color: '#152a31',
  margin: '0 0 4px 0',
  lineHeight: '21px',
};

const answerTextStyle = {
  fontSize: '15px',
  color: '#152a31',
  margin: '0',
  lineHeight: '21px',
  whiteSpace: 'pre-wrap',
};

const imageGallery = {
  display: 'flex',
  flexWrap: 'wrap',
  marginTop: '12px',
};

const imageLink = {
  display: 'inline-block',
  textDecoration: 'none',
  padding: '0 5px 10px 5px',
};

const imageThumbnail = {
  width: '100%',
  borderRadius: '8px',
  display: 'block',
};

const footerContactText = {
  fontSize: '15px',
  lineHeight: '21px',
  color: '#152a31',
  textAlign: 'left',
  margin: '24px 0 0 0',
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
  marginBottom: '20px',
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

const recordRefText = {
  fontSize: '12px',
  color: '#152a31',
  margin: '0',
};