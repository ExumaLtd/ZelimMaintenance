import SingleStepForm from '@/components/maintenance-form/single-step-form';
import type { FormPageProps } from '@/components/maintenance-form/types';
import { unscheduledConfig } from '@/components/maintenance-form/config';
import { makeFormServerSideProps } from '@/components/maintenance-form/server';

export default function Unscheduled(props: FormPageProps) {
  return <SingleStepForm {...props} config={unscheduledConfig} />;
}

export const getServerSideProps = makeFormServerSideProps('Unscheduled', 'unscheduled');
