type FormSection = {
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
  /** Submit button label; DeclarationCard defaults to 'Submit maintenance'. */
  submitLabel?: string;
  /** Multi-step forms only: the step definitions. */
  sections?: FormSection[];
  /** Multi-step forms only: step 1 requires a photo of the Swift (question id 1). */
  requireSwiftPhoto?: boolean;
};

export const annualConfig: MaintenanceFormConfig = {
  typeLabel: 'Annual',
  draftSlug: 'annual',
  uploadSlug: 'annual',
  headTitle: 'Annual Maintenance',
  heroLabel: 'annual maintenance',
  sectionTitle: 'Annual maintenance',
  sectionSubtitle: 'All annual maintenance must be completed in accordance with the approved Swift Rescue Conveyor Maintenance Manual.',
  completeRoute: '/portal/swift/annual-complete',
  requireSwiftPhoto: true,
  sections: [
    { step: 1, title: "Photograph Swift", subtitle: null, questionIds: [1] },
    { step: 2, title: "Records and visual checks", subtitle: null, questionIds: [2, 3] },
    { step: 3, title: "Lubrication and mechanical checks", subtitle: null, questionIds: [4, 5, 6] },
    { step: 4, title: "Conveyor belt checks", subtitle: null, questionIds: [7, 8, 9, 10] },
    { step: 5, title: "Functional and control tests", subtitle: null, questionIds: [11, 12, 13, 14, 15] },
    { step: 6, title: "Deployment and winch checks", subtitle: null, questionIds: [16, 17, 18, 19, 20, 21, 22, 23] },
    { step: 7, title: "Electrical checks", subtitle: null, questionIds: [24, 25] },
    { step: 8, title: "Verification trial and notes", subtitle: null, questionIds: [26, 27] }
  ],
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
  submitLabel: 'Submit fault',
};
