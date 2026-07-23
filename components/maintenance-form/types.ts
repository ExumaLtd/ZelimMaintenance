import type { Dispatch, SetStateAction } from 'react';

/** Swift unit as shaped by lib/data-fetching for the form pages. */
export type Unit = {
  record_id: string;
  serial_number: string;
  company: string;
  public_token: string;
  operating_company_id?: string | null;
};

/** One question from a checklist template. */
export type TemplateQuestion = {
  id: number;
  title: string;
  instruction?: string;
  required?: boolean;
  allow_uploads?: boolean;
};

/** Checklist template as shaped by lib/data-fetching. The monthly and depth
    pages reshape rawData into maintenanceChecklist in getServerSideProps. */
export type ChecklistTemplate = {
  id: string;
  type?: string;
  declarationText?: string;
  questionsData?: TemplateQuestion[];
  questions?: string[];
  maintenanceChecklist?: any[];
  rawData?: Record<string, any>;
};

export type Engineer = {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  companyName?: string;
};

export type Operator = {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  operating_company_id?: string;
};

/** Image as stored by the uploader: Cloudinary URL plus optional thumbnail. */
export type UploadedImage = {
  url: string;
  thumbnail?: string;
  fileType?: string;
  publicId?: string;
};

export type Answers = Record<string, string>;
export type QuestionImages = Record<string, UploadedImage[]>;

/** Per-field validation flags. stepComments is monthly's per-group map. */
export type FieldErrors = {
  [key: string]: boolean | Record<string, boolean> | undefined;
  stepComments?: Record<string, boolean>;
};

/** The admin card's plain values, as consumed by the submit plumbing.
    AdminFields (the full hook result) satisfies this structurally. */
export type AdminValues = {
  selectedCompany: string;
  locationDisplay: string;
  locationCountry: string;
  engName: string;
  engEmail: string;
  engPhone: string;
  engId: string;
  operatorName: string;
  operatorEmail: string;
  operatorPhone: string;
  operatorId: string;
};

export type SetState<T> = Dispatch<SetStateAction<T>>;

/** Props every form page receives from makeFormServerSideProps. */
export type FormPageProps = {
  unit: Unit;
  template: ChecklistTemplate;
  companies?: string[];
  engineers?: Engineer[];
  operators?: Operator[];
  accessType?: string;
};
