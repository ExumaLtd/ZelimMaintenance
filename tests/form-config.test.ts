import { describe, it, expect } from 'vitest';
import {
  annualConfig,
  unscheduledConfig,
  faultReportingConfig,
} from '@/components/maintenance-form/config';

// These strings are load-bearing far beyond the codebase: draft slugs name
// localStorage keys sitting on engineers' devices, upload slugs name both
// localStorage keys and Cloudinary folders, and type labels match Airtable
// records and draft queries. If one of these assertions fails, live drafts
// or stored uploads would be orphaned. Change them only with a migration.
describe('maintenance form persistence strings', () => {
  it('keeps the annual config stable', () => {
    expect(annualConfig.typeLabel).toBe('Annual');
    expect(annualConfig.draftSlug).toBe('annual');
    expect(annualConfig.uploadSlug).toBe('annual');
    expect(annualConfig.completeRoute).toBe('/portal/swift/annual-complete');
  });

  it('keeps the unscheduled config stable', () => {
    expect(unscheduledConfig.typeLabel).toBe('Unscheduled');
    expect(unscheduledConfig.draftSlug).toBe('unscheduled');
    expect(unscheduledConfig.uploadSlug).toBe('unscheduled');
    expect(unscheduledConfig.completeRoute).toBe('/portal/swift/unscheduled-complete');
  });

  it('keeps the fault reporting config stable', () => {
    expect(faultReportingConfig.typeLabel).toBe('Fault report');
    expect(faultReportingConfig.draftSlug).toBe('fault');
    expect(faultReportingConfig.uploadSlug).toBe('fault_reporting');
    expect(faultReportingConfig.completeRoute).toBe('/portal/swift/fault-reporting-complete');
  });

  it('keeps the annual sections covering questions 1 to 27 exactly once', () => {
    const ids = annualConfig.sections!.flatMap(s => s.questionIds);
    expect([...ids].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 27 }, (_, i) => i + 1),
    );
  });
});
