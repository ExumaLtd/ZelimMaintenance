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
  Row,
  Column,
} from '@react-email/components';
import * as React from 'react';

export const TechnicalAlertEmail = ({ 
  serialNumber = 'N/A',
  displayType = 'Maintenance',
  technicalData = {},
  answers = {},
  equipmentChecklist = null, // For depth maintenance (returned/condition format)
  maintenanceChecklist = null, // For monthly maintenance (grouped yes/no questions)
  brandColor = '#172F36',
  logoUrl = '/logo/zelim-logo-dark.png',
  previewUrl = null
}) => {
  // Format date and time
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

  // Airtable configuration
  const airtableBaseId = 'appOQXbopTwn0SdnL'; 
  const airtableTableId = 'tblo0gVrtd422UQgd';
  const airtableUrl = technicalData?.unit_record_id 
    ? `https://airtable.com/${airtableBaseId}/${airtableTableId}/${technicalData.unit_record_id}`
    : '#';

  // Ensure logo URL is absolute for email clients
  const absoluteLogoUrl = logoUrl?.startsWith('http') 
    ? logoUrl 
    : `https://maintenance.exuma.co.uk${logoUrl?.startsWith('/') ? logoUrl : `/${logoUrl}`}`;

  // Determine section heading based on maintenance type
  const getSectionHeading = () => {
    if (displayType === 'Monthly') return 'Additional Comments';
    if (displayType.toLowerCase().includes('fault')) return 'Fault Report';
    return `${displayType} Details`;
  };

  return (
    <Html>
      <Head />
      <Preview>{serialNumber} {displayType} Submitted</Preview>
      <Body style={main}>
        {/* View in browser link */}
        {previewUrl && (
          <Container style={previewLinkContainer}>
            <Text style={previewLinkText}>
              Having trouble viewing this email?{' '}
              <a href={previewUrl} style={previewLink}>View in browser</a>
            </Text>
          </Container>
        )}
        <Container style={container}>
          {/* Header with Brand Color Accent */}
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

            <Hr style={hr} />

            {/* Status Card - Submission Details */}
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

            <Section style={statusCard}>
              <Row>
                <Column>
                  <Text style={label}>Time</Text>
                  <Text style={value}>{formattedTime}</Text>
                </Column>
              </Row>
            </Section>

            {/* CTA Button */}
            {technicalData?.unit_record_id && (
              <>
                <Hr style={hr} />
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
              </>
            )}

            {/* Equipment Checklist Section (Depth Maintenance) */}
            {parsedEquipmentChecklist && parsedEquipmentChecklist.length > 0 && (
              <>
                <Hr style={hr} />
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
                      
                      {/* Display images if item has poor condition */}
                      {item.images && item.images.length > 0 && (
                        <Section style={imageGallery}>
                          {item.images.map((imageUrl, imgIndex) => (
                            <a 
                              key={imgIndex} 
                              href={imageUrl}
                              style={imageLink}
                            >
                              <Img
                                src={imageUrl}
                                alt={`${item.name} - Image ${imgIndex + 1}`}
                                width="150"
                                height="150"
                                style={imageThumbnail}
                              />
                            </a>
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
                <Hr style={hr} />
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

            {/* Maintenance Questions Section (Annual, Unscheduled, Fault Report, or Further Comments) */}
            {Object.keys(answers).length > 0 && (
              <>
                <Hr style={hr} />
                <Heading as="h2" style={h2}>
                  {getSectionHeading()}
                </Heading>
                
                <Section>
                  {Object.entries(answers).map(([question, answerData], i) => {
                    // Handle both old format (string) and new format (object with text/images)
                    const isObject = typeof answerData === 'object' && answerData !== null;
                    const answerTextValue = isObject ? answerData.text : answerData;
                    const images = isObject ? (answerData.images || []) : [];

                    return (
                      <div key={i} style={answerBlock}>
                        <Text style={questionText}>{question}</Text>
                        <Text style={answerText}>
                          {answerTextValue !== null && answerTextValue !== undefined && answerTextValue !== '' 
                            ? String(answerTextValue) 
                            : 'Not answered'}
                        </Text>
                        
                        {/* Display images if present */}
                        {images.length > 0 && (
                          <Section style={imageGallery}>
                            {images.map((imageUrl, imgIndex) => (
                              <a 
                                key={imgIndex} 
                                href={imageUrl}
                                style={imageLink}
                              >
                                <Img
                                  src={imageUrl}
                                  alt={`${question} - Image ${imgIndex + 1}`}
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

            <Hr style={hr} />
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

export default TechnicalAlertEmail;

// --- Styles: Professional Maritime Aesthetic (matching maintenance-report) ---
const previewLinkContainer = {
  maxWidth: '600px',
  margin: '0 auto 10px auto',
  textAlign: 'center',
};

const previewLinkText = {
  fontSize: '12px',
  color: '#64748B',
  margin: '0',
};

const previewLink = {
  color: '#172F36',
  textDecoration: 'underline',
};

const main = {
  backgroundColor: '#F8FAFC',
  padding: '40px 0',
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
  margin: '12px 0',
};

const statusCard = {
  backgroundColor: '#F1F5F9',
  borderRadius: '8px',
  padding: '24px',
  margin: '16px 0',
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
  color: '#0F172A',
  fontSize: '18px',
  fontWeight: '700',
  margin: '40px 0 24px 0',
};

const checklistItemBlock = {
  marginBottom: '24px',
  padding: '16px',
  backgroundColor: '#F8FAFC',
  borderRadius: '8px',
  border: '1px solid #E2E8F0',
};

const checklistItemName = {
  fontSize: '15px',
  fontWeight: '700',
  color: '#0F172A',
  margin: '0 0 12px 0',
};

const checklistLabel = {
  fontSize: '11px',
  color: '#64748B',
  textTransform: 'uppercase',
  fontWeight: '700',
  margin: '0',
  letterSpacing: '0.5px',
};

const checklistValue = {
  fontSize: '14px',
  color: '#0F172A',
  fontWeight: '600',
  margin: '4px 0 0 0',
};

// Monthly maintenance specific styles
const monthlyGroupBlock = {
  marginBottom: '24px',
  padding: '16px',
  backgroundColor: '#F8FAFC',
  borderRadius: '8px',
  border: '1px solid #E2E8F0',
};

const monthlyGroupTitle = {
  fontSize: '15px',
  fontWeight: '700',
  color: '#0F172A',
  margin: '0 0 12px 0',
  paddingBottom: '8px',
  borderBottom: '2px solid #E2E8F0',
};

const monthlyQuestionRow = {
  padding: '8px 0',
  borderBottom: '1px solid #F1F5F9',
};

const monthlyQuestionText = {
  fontSize: '14px',
  color: '#475569',
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
  paddingLeft: '12px',
  borderLeft: '2px solid #E2E8F0',
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
  marginRight: '8px',
  marginBottom: '8px',
};

const imageThumbnail = {
  width: '150px',
  height: '150px',
  objectFit: 'cover',
  borderRadius: '8px',
  border: '2px solid #E2E8F0',
};

const hr = {
  borderColor: '#F1F5F9',
  margin: '40px 0',
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
  color: '#CBD5E1',
  margin: '0',
};