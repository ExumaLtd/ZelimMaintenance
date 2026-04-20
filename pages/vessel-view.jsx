import dynamic from 'next/dynamic';
import Image from 'next/image';

// ssr:false + loading:null ensures server and initial client render agree (no hydration mismatch)
const VesselScene = dynamic(
  () => import('../components/vessel-scene'),
  { ssr: false, loading: () => null }
);

export default function VesselView() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#172F36', overflow: 'hidden' }}>
      <VesselScene />
      <div style={{
        position: 'fixed',
        bottom: 50,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        pointerEvents: 'none',
      }}>
        <Image src="/logo/zelim-logo.svg" width={120} height={40} alt="Zelim logo" />
      </div>
    </div>
  );
}
