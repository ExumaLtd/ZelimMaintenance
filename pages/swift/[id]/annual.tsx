import MultiStepForm from '@/components/maintenance-form/multi-step-form';
import type { FormPageProps } from '@/components/maintenance-form/types';
import { annualConfig } from '@/components/maintenance-form/config';
import { makeFormServerSideProps } from '@/components/maintenance-form/server';

export default function Annual(props: FormPageProps) {
  return <MultiStepForm {...props} config={annualConfig} />;
}

export const getServerSideProps = makeFormServerSideProps('Annual', 'annual');
