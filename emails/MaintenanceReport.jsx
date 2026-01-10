import { Html, Body, Container, Text, Heading, Hr, Section, Preview, Tailwind } from '@react-email/components';
import * as React from 'react';

export const MaintenanceReportEmail = ({ engineerName, serialNumber, answers = {} }) => (
  <Html>
    <Preview>Zelim Maintenance Report: {serialNumber}</Preview>
    <Tailwind>
      <Body className="bg-slate-50 font-sans py-10">
        <Container className="bg-white border border-slate-200 rounded-lg p-8 mx-auto max-w-xl shadow-sm">
          <Heading className="text-2xl font-bold text-slate-900 mb-2">
            Maintenance Summary
          </Heading>
          <Text className="text-slate-500 mb-6">Unit Serial Number: {serialNumber}</Text>
          
          <Section className="bg-slate-100 p-4 rounded-md mb-6">
            <Text className="m-0 text-sm"><strong>Lead Engineer:</strong> {engineerName}</Text>
            <Text className="m-0 text-sm"><strong>Date:</strong> {new Date().toLocaleDateString('en-GB')}</Text>
          </Section>

          <Hr className="border-slate-200 my-6" />

          <Section>
            <Heading as="h3" className="text-lg font-semibold text-slate-800 mb-4">Checklist Results</Heading>
            {Object.entries(answers).map(([question, answer]) => (
              <div key={question} className="mb-3 p-2 border-b border-slate-50">
                <Text className="m-0 font-medium text-slate-700 text-sm">{question}</Text>
                <Text className="m-0 text-slate-600 text-sm">{String(answer)}</Text>
              </div>
            ))}
          </Section>

          <Text className="text-xs text-slate-400 mt-10 text-center italic">
            This is an automated report sent from the Zelim Maintenance Portal.
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default MaintenanceReportEmail;