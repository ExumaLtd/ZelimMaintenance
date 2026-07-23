export type FormSection = {
  step: number;
  title: string;
  subtitle: string | null;
  questionIds: number[];
};

export type MaintenanceFormConfig = {
  /** Airtable-facing name: draft records, submit payload, report email,
      last_maintenance_type. Must match existing Airtable values. */
  typeLabel: string;
  /** Slug in the draft localStorage key (draft_<slug>_<serial>_unknown).
      Live drafts sit on engineers' devices under these keys; never change. */
  draftSlug: string;
  /** Slug passed to ImageUploader; drives both its localStorage keys
      (images_<slug>_...) and the Cloudinary folder path. Never change. */
  uploadSlug: string;
  /** Browser tab title suffix, e.g. "Unscheduled Maintenance". */
  headTitle: string;
  /** Lowercase label under the serial number in the hero title. */
  heroLabel: string;
  /** Heading of the questions card. */
  sectionTitle: string;
  /** Intro copy under the questions card heading. */
  sectionSubtitle: string;
  /** Confirmation page route pushed after a successful submit. */
  completeRoute: string;
  /** Multi-step forms only: the step definitions. */
  sections?: FormSection[];
};

export const unscheduledConfig: MaintenanceFormConfig = {
  typeLabel: 'Unscheduled',
  draftSlug: 'unscheduled',
  uploadSlug: 'unscheduled',
  headTitle: 'Unscheduled Maintenance',
  heroLabel: 'unscheduled maintenance',
  sectionTitle: 'Unscheduled maintenance',
  sectionSubtitle: 'All unscheduled maintenance must be completed in accordance with the approved Swift Rescue Conveyor Maintenance Manual.',
  completeRoute: '/portal/swift/unscheduled-complete',
};

export const faultReportingConfig: MaintenanceFormConfig = {
  typeLabel: 'Fault report',
  draftSlug: 'fault',
  uploadSlug: 'fault_reporting',
  headTitle: 'Fault Reporting',
  heroLabel: 'fault reporting',
  sectionTitle: 'Fault report',
  sectionSubtitle: 'Report damage, defects, or wear on the Swift. Describe what is affected and when it was noticed, then attach clear photos where possible.',
  completeRoute: '/portal/swift/fault-reporting-complete',
};
