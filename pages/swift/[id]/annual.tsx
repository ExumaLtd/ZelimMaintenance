import MultiStepForm from '@/components/maintenance-form/multi-step-form';
import { annualConfig } from '@/components/maintenance-form/config';
import { makeFormServerSideProps } from '@/components/maintenance-form/server';

export default function Annual(props) {
  return <MultiStepForm {...props} config={annualConfig} />;
}

export const getServerSideProps = makeFormServerSideProps('Annual', 'annual');
