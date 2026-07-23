import { getSession } from '@/lib/session';
import type { GetServerSidePropsContext } from 'next';
import { fetchFormData } from '@/lib/data-fetching';

/**
 * Shared getServerSideProps for the maintenance form pages. Verifies the
 * session and that the URL token matches it, so one unit's session cannot
 * load another unit's data, then fetches the form data for the given type.
 */
export function makeFormServerSideProps(typeLabel: string, logLabel: string) {
  return async function getServerSideProps({ params, req }: GetServerSidePropsContext) {
    const token = String(params?.id ?? '');
    const session = getSession(req);
    if (!session || !session.pin || token !== session.token) {
      return { redirect: { destination: '/', permanent: false } };
    }
    const accessType = session.access;

    try {
      const data = await fetchFormData(token, typeLabel);

      if (data.notFound) {
        return { redirect: { destination: '/', permanent: false } };
      }

      return {
        props: {
          unit: data.unit,
          template: data.template,
          companies: data.companies,
          engineers: data.engineers,
          operators: data.operators,
          accessType,
        },
      };
    } catch (err) {
      console.error(`Error loading ${logLabel} form:`, err);
      return { redirect: { destination: '/', permanent: false } };
    }
  };
}
