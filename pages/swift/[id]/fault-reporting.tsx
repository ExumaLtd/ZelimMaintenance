import SingleStepForm from '@/components/maintenance-form/single-step-form';
import type { FormPageProps } from '@/components/maintenance-form/types';
import { faultReportingConfig } from '@/components/maintenance-form/config';
import { makeFormServerSideProps } from '@/components/maintenance-form/server';

export default function FaultReporting(props: FormPageProps) {
  return <SingleStepForm {...props} config={faultReportingConfig} />;
}

export const getServerSideProps = makeFormServerSideProps('Fault report', 'fault report');
