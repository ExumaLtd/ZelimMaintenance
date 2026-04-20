import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Heading,
  Row,
  Column,
} from 'react-email';
import * as React from 'react';

interface TechnicalAlertEmailProps {
  serialNumber?: string;
  displayType?: string;
  isOperator?: boolean;
  technicalData?: Record<string, any>;
  answers?: Record<string, any>;
  equipmentChecklist?: any;
  maintenanceChecklist?: any;
  brandColor?: string;
  logoUrl?: string;
  zelimLogoUrl?: string;
  previewUrl?: string | null;
  recordRef?: string | null;
}

export const TechnicalAlertEmail = ({
  serialNumber = 'N/A',
  displayType = 'Maintenance',
  isOperator = false,
  technicalData = {},
  answers = {},
  equipmentChecklist = null,
  maintenanceChecklist = null,
  brandColor = '#152a31',
  logoUrl = '/logo/zelim-logo-dark.png',
  zelimLogoUrl = '/logo/zelim-logo-dark.png',
  previewUrl = null,
  recordRef = null,
}: TechnicalAlertEmailProps) => {
  const submissionDate = new Date();
  const formattedDate = submissionDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedTime = submissionDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'GMT',
  });

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

  const airtableUrl = 'https://airtable.com/appOQXbopTwn0SdnL/tblAVxcIGNSWQTP9o/viweP5xYy6J5Nroal?blocks=hide';

  const getCountryFromLocation = (locationStr) => {
    if (!locationStr || locationStr === 'N/A') return 'N/A';
    if (locationStr.includes(',')) {
      const parts = locationStr.split(',');
      return parts[parts.length - 1].trim();
    }
    return locationStr;
  };

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
            
            .status-value {
              font-size: 16px !important;
              line-height: 24px !important;
            }
            
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
            
            .email-container {
              max-width: 100% !important;
              width: 100% !important;
              margin: 0 !important;
            }
            
            .content-padding {
              padding: 0 20px 50px 20px !important;
            }
            
            .status-card-mobile {
              padding: 20px 24px !important;
            }
            
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
      <Preview>{displayType.replace('Reporting', 'Report')} {
        displayType.toLowerCase().includes('depth') ? '🔧' : 
        displayType.toLowerCase().includes('unscheduled') ? '⚠️' : 
        displayType.toLowerCase().includes('fault') ? '🚨' : 
        '📋'
      } {serialNumber}</Preview>
      <Body style={main} className="email-body">
        <Container style={container} className="email-container">
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
              {displayType} Submitted
            </Text>
            
            <Text style={text}>
              A new <strong>{displayType.toLowerCase()}</strong> has been submitted for unit{' '}
              <strong>{serialNumber}</strong>.
            </Text>

            {/* Status Card */}
            <Section style={statusCard} className="status-card-section status-card-mobile">
              <Row style={{ marginBottom: '20px' }}>
                <Column style={{ paddingRight: '12px', width: '33.33%', verticalAlign: 'top' }} className="mobile-col">
                  <Text style={label}>Serial</Text>
                  <Text style={value} className="status-value">{serialNumber}</Text>
                </Column>
                <Column style={{ paddingLeft: '12px', paddingRight: '12px', width: '33.33%', verticalAlign: 'top' }} className="mobile-col">
                  <Text style={label}>{isOperator ? 'Operator' : 'Company'}</Text>
                  <Text style={value} className="status-value">{technicalData?.company_name || 'N/A'}</Text>
                </Column>
                <Column style={{ paddingLeft: '12px', width: '33.33%', verticalAlign: 'top' }} className="mobile-col">
                  <Text style={label}>Date</Text>
                  <Text style={value} className="status-value">{formattedDate}</Text>
                </Column>
              </Row>
              <Row>
                <Column style={{ paddingRight: '12px', width: '33.33%', verticalAlign: 'top' }} className="mobile-col">
                  <Text style={label}>Maintained By</Text>
                  <Text style={value} className="status-value">{technicalData?.maintenance_company || 'N/A'}</Text>
                </Column>
                <Column style={{ paddingLeft: '12px', paddingRight: '12px', width: '33.33%', verticalAlign: 'top' }} className="mobile-col">
                  <Text style={label}>{isOperator ? 'Operator name' : 'Engineer'}</Text>
                  <Text style={value} className="status-value">{technicalData?.engineer_name || 'N/A'}</Text>
                </Column>
                <Column style={{ paddingLeft: '12px', width: '33.33%', verticalAlign: 'top' }} className="mobile-col">
                  <Text style={label}>Location</Text>
                  <Text style={value} className="status-value">{getCountryFromLocation(technicalData?.location_display)}</Text>
                </Column>
              </Row>
            </Section>

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
                        <Section style={imageGallery}>
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

            {Object.keys(answers).length > 0 && (
              <>
                <Heading as="h2" style={h2}>
                  {displayType === 'Monthly' ? 'Additional comments' : `${displayType.charAt(0).toUpperCase() + displayType.slice(1).toLowerCase()} details`}
                </Heading>
                
                <Section>
                  {Object.entries(answers).map(([question, answerData], i) => {
                    const isObject = typeof answerData === 'object' && answerData !== null;
                    const answerTextValue = isObject ? answerData.text : answerData;
                    const images = isObject ? (answerData.images || []) : [];

                    const isPhotographQuestion = question.toLowerCase().includes('photograph');
                    const hasImages = images.length > 0;
                    const hasNoText = !answerTextValue || answerTextValue === '';
                    const shouldSkipNotAnswered = isPhotographQuestion && hasImages && hasNoText;

                    return (
                      <div key={i} style={answerBlock} className="answer-block-mobile">
                        <Text style={questionText}>{question}</Text>
                        {!shouldSkipNotAnswered && (
                          <Text style={answerTextStyle}>
                            {answerTextValue !== null && answerTextValue !== undefined && answerTextValue !== '' 
                              ? String(answerTextValue) 
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

            {technicalData?.unit_record_id && (
              <Section style={buttonContainerLeft}>
                <Link 
                  href={airtableUrl}
                  style={portalButton}
                >
                  View record online
                </Link>
              </Section>
            )}
          </Section>

          <Section style={footerSection}>
            <Link href="https://www.zelim.com" style={footerLink}>
              <Img
                src={absoluteZelimLogoUrl}
                width="120"
                height="40"
                alt="Zelim logo"
                style={footerLogo}
              />
            </Link>
            <Text style={attribution}>
              © {new Date().getFullYear()} Zelim Limited | Find Recover Protect
            </Text>
            {recordRef && (
              <Text style={recordRefText}>
                {recordRef} | {formattedTime} GMT, {formattedDate}
              </Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default TechnicalAlertEmail;

// --- Styles ---
const main : React.CSSProperties = {
  backgroundColor: '#eaeeed',
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

const checklistItemBlock : React.CSSProperties = {
  marginBottom: '12px',
  padding: '20px 24px',
  backgroundColor: '#f3f6f5',
  borderRadius: '8px',
};

const checklistItemName : React.CSSProperties = {
  fontSize: '15px',
  fontWeight: '600',
  color: '#152a31',
  margin: '0 0 16px 0',
  lineHeight: '21px',
};

const checklistLabel : React.CSSProperties = {
  fontSize: '11px',
  color: '#152a31',
  textTransform: 'uppercase',
  fontWeight: '600',
  margin: '0',
  letterSpacing: '0.5px',
};

const checklistValue : React.CSSProperties = {
  fontSize: '15px',
  color: '#152a31',
  fontWeight: '600',
  margin: '4px 0 0 0',
  lineHeight: '21px',
};

const monthlyGroupBlock : React.CSSProperties = {
  marginBottom: '12px',
  padding: '20px 24px',
  backgroundColor: '#f3f6f5',
  borderRadius: '8px',
};

const monthlyGroupTitle : React.CSSProperties = {
  fontSize: '15px',
  fontWeight: '600',
  color: '#152a31',
  margin: '0 0 8px 0',
  lineHeight: '21px',
};

const monthlyQuestionRow : React.CSSProperties = {
  padding: '0',
};

const monthlyQuestionText : React.CSSProperties = {
  fontSize: '15px',
  color: '#152a31',
  margin: '0',
  fontWeight: '400',
  lineHeight: '21px',
};

const monthlyAnswerText : React.CSSProperties = {
  fontSize: '15px',
  fontWeight: '600',
  margin: '0',
  lineHeight: '21px',
};

const answerBlock : React.CSSProperties = {
  marginBottom: '12px',
  padding: '20px 24px',
  backgroundColor: '#f3f6f5',
  borderRadius: '8px',
};

const questionText : React.CSSProperties = {
  fontSize: '15px',
  fontWeight: '600',
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

const buttonContainerLeft : React.CSSProperties = {
  textAlign: 'left',
  margin: '20px 0 0 0',
};

const portalButton : React.CSSProperties = {
  display: 'inline-block',
  padding: '10px 18px',
  borderRadius: '8px',
  backgroundColor: '#27454B',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
  border: 'none',
};

const footerSection : React.CSSProperties = {
  paddingBottom: '40px',
  textAlign: 'center',
};

const footerLink : React.CSSProperties = {
  textDecoration: 'none',
  display: 'inline-block',
  marginBottom: '20px',
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

const recordRefText : React.CSSProperties = {
  fontSize: '12px',
  color: '#152a31',
  margin: '0',
};