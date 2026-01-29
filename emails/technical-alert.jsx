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
} from '@react-email/components';
import * as React from 'react';

export const TechnicalAlertEmail = ({ 
  serialNumber = 'N/A',
  displayType = 'Maintenance',
  technicalData = {},
  answers = {},
  equipmentChecklist = null,
  maintenanceChecklist = null,
  brandColor = '#152a31',
  logoUrl = '/logo/zelim-logo-dark.png',
  previewUrl = null
}) => {
  const submissionDate = new Date();
  const formattedDate = submissionDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = submissionDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
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
      <Head />
      <Preview>{displayType} {
        displayType.toLowerCase().includes('depth') ? '🔧' : 
        displayType.toLowerCase().includes('unscheduled') ? '⚠️' : 
        displayType.toLowerCase().includes('fault') ? '🚨' : 
        '📋'
      } {serialNumber}</Preview>
      <Body style={main}>
        <Container style={container}>
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
              {displayType} Submitted
            </Text>
            
            <Text style={text}>
              A new <strong>{displayType}</strong> has been submitted for unit{' '}
              <strong>{serialNumber}</strong>.
            </Text>

            <Section style={statusCard}>
              <Row>
                <Column style={{ paddingRight: '20px' }}>
                  <Text style={label}>Maintenance Company</Text>
                  <Text style={value}>{technicalData?.maintenance_company || 'N/A'}</Text>
                </Column>
                <Column style={{ paddingLeft: '20px' }}>
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
                <Column style={{ paddingLeft: '20px' }}>
                  <Text style={label}>Date</Text>
                  <Text style={value}>{formattedDate}</Text>
                </Column>
              </Row>
            </Section>

            <Section style={statusCard}>
              <Row>
                <Column>
                  <Text style={label}>Time</Text>
                  <Text style={value}>{formattedTime}</Text>
                </Column>
              </Row>
            </Section>

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

            {parsedEquipmentChecklist && parsedEquipmentChecklist.length > 0 && (
              <>
                <Heading as="h2" style={h2}>Pre-disassembly Inspection</Heading>
                
                <Section>
                  {parsedEquipmentChecklist.map((item, i) => (
                    <div key={i} style={checklistItemBlock}>
                      <Text style={checklistItemName}>{item.name}</Text>
                      <Row>
                        <Column style={{ paddingRight: '10px' }}>
                          <Text style={checklistLabel}>Returned:</Text>
                          <Text style={checklistValue}>
                            {item.returned === true ? '✓ Yes' : item.returned === false ? '✗ No' : 'Not answered'}
                          </Text>
                        </Column>
                        {item.returned === true && (
                          <Column style={{ paddingLeft: '10px' }}>
                            <Text style={checklistLabel}>Condition:</Text>
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
                              style={imageLink}
                            >
                              <Img
                                src={imageUrl}
                                alt={`${item.name} - Image ${imgIndex + 1}`}
                                width="100%"
                                height="134"
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
                <Heading as="h2" style={h2}>Monthly Inspection Checklist</Heading>
                
                <Section>
                  {parsedMaintenanceChecklist.map((group, groupIndex) => (
                    <div key={groupIndex} style={monthlyGroupBlock}>
                      <Text style={monthlyGroupTitle}>{group.title}</Text>
                      
                      {group.questions && group.questions.map((question, qIndex) => (
                        <Row key={qIndex} style={monthlyQuestionRow}>
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
                  {displayType === 'Monthly' ? 'Additional Comments' : `${displayType} Details`}
                </Heading>
                
                <Section>
                  {Object.entries(answers).map(([question, answerData], i) => {
                    const isObject = typeof answerData === 'object' && answerData !== null;
                    const answerTextValue = isObject ? answerData.text : answerData;
                    const images = isObject ? (answerData.images || []) : [];

                    return (
                      <div key={i} style={answerBlock}>
                        <Text style={questionText}>{question}</Text>
                        <Text style={answerTextStyle}>
                          {answerTextValue !== null && answerTextValue !== undefined && answerTextValue !== '' 
                            ? String(answerTextValue) 
                            : 'Not answered'}
                        </Text>
                        
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
            <Link href="https://www.zelim.com" style={footerLink}>
              <Img
                src="https://maintenance.exuma.co.uk/logo/zelim-logo-dark.png"
                width="120"
                height="40"
                alt="Zelim logo"
                style={footerLogo}
              />
            </Link>
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

// Styles matching maintenance-report.jsx
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
  fontSize: '36px',
  fontWeight: '600',
  margin: '0',
  textAlign: 'left',
  letterSpacing: '-1px',
};

const subTitle = {
  fontSize: '13px',
  fontWeight: '600',
  textTransform: 'uppercase',
  textAlign: 'left',
  letterSpacing: '1.5px',
  margin: '4px 0 40px 0',
};

const text = {
  color: '#152a31',
  fontSize: '15px',
  lineHeight: '24px',
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
  fontSize: '16px',
  color: '#152a31',
  fontWeight: '600',
  margin: '4px 0 0 0',
  textAlign: 'left',
};

const buttonContainer = {
  textAlign: 'center',
  margin: '32px 0',
};

const button = {
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center',
  display: 'inline-block',
  padding: '14px 28px',
};

const h2 = {
  color: '#152a31',
  fontSize: '18px',
  fontWeight: '600',
  margin: '40px 0 24px 0',
  textAlign: 'left',
};

const checklistItemBlock = {
  marginBottom: '24px',
  padding: '16px',
  backgroundColor: '#f3f6f5',
  borderRadius: '8px',
};

const checklistItemName = {
  fontSize: '15px',
  fontWeight: '600',
  color: '#152a31',
  margin: '0 0 12px 0',
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
  fontSize: '14px',
  color: '#152a31',
  fontWeight: '600',
  margin: '4px 0 0 0',
};

const monthlyGroupBlock = {
  marginBottom: '24px',
  padding: '16px',
  backgroundColor: '#f3f6f5',
  borderRadius: '8px',
};

const monthlyGroupTitle = {
  fontSize: '15px',
  fontWeight: '600',
  color: '#152a31',
  margin: '0 0 12px 0',
  paddingBottom: '8px',
  borderBottom: '2px solid #eaeeed',
};

const monthlyQuestionRow = {
  padding: '8px 0',
  borderBottom: '1px solid #f3f6f5',
};

const monthlyQuestionText = {
  fontSize: '14px',
  color: '#152a31',
  margin: '0',
  fontWeight: '500',
};

const monthlyAnswerText = {
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
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
  fontSize: '14px',
  color: '#152a31',
  textAlign: 'center',
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