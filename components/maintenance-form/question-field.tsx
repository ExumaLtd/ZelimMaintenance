import clsx from 'clsx';
import ImageUploader from '../image-uploader';
import VoiceInput from '../voice-input';
import { autoGrow } from '@/utils/form-utils';
import type { TemplateQuestion, Answers, QuestionImages, UploadedImage, SetState } from './types';

/**
 * One checklist question: label, optional instruction, auto-growing
 * textarea with voice input, and the image uploader when the template
 * allows uploads for the question.
 */
type QuestionFieldProps = {
  q: TemplateQuestion;
  questionIndex: number;
  isFirst: boolean;
  answers: Answers;
  setAnswers: SetState<Answers>;
  questionErrors: Record<string, boolean>;
  setQuestionErrors: SetState<Record<string, boolean>>;
  setErrorMsg: SetState<string>;
  questionImages: QuestionImages;
  onImagesChange: (questionKey: string, images: UploadedImage[]) => void;
  serialNumber: string;
  uploadSlug: string;
  uploaderHasError?: boolean;
  compact?: boolean;
};

export default function QuestionField({
  q,
  questionIndex,
  isFirst,
  answers,
  setAnswers,
  questionErrors,
  setQuestionErrors,
  setErrorMsg,
  questionImages,
  onImagesChange,
  serialNumber,
  uploadSlug,
  uploaderHasError = false,
  compact = false,
}: QuestionFieldProps) {
  const questionKey = `q${questionIndex}`;

  return (
    <div style={{ marginTop: isFirst ? "0" : "24px" }}>
      {/* Single-step forms (compact) do not show the per-question label and
          instruction; the card heading carries the context. Conditional
          rendering rather than a hidden class, because the legacy
          .checklist-label display rule outranks utility classes. */}
      {!compact && (
        <label className="checklist-label">
          {q.title}
        </label>
      )}
      {!compact && q.instruction && (
        <p className="question-instruction">{q.instruction}</p>
      )}

      <div className="question-with-upload">
        <div className="textarea-wrapper relative">
          <textarea
            name={questionKey}
            className={clsx("checklist-textarea pr-12! max-[768px]:pr-14!", questionErrors[questionKey] && "has-error")}
            value={answers[questionKey] || ""}
            onChange={(e) => {
              setAnswers((prev) => ({ ...prev, [e.target.name]: e.target.value }));
              autoGrow(e);
              if (e.target.value.trim()) {
                setQuestionErrors(prev => { const n = {...prev}; delete n[e.target.name]; return n; });
              }
            }}
            onInput={autoGrow}
            placeholder=""
            required={q.required}
          />

          <VoiceInput
            onTranscript={(text) => {
              setAnswers((prev) => ({
                ...prev,
                [questionKey]: (prev[questionKey] || '') + text
              }));
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  const textarea = document.querySelector(`[name="${questionKey}"]`);
                  if (textarea) autoGrow(textarea);
                });
              });
            }}
            onError={(errorMsg) => setErrorMsg(errorMsg)}
          />
        </div>

        {q.allow_uploads && (
          <ImageUploader
            questionKey={questionKey}
            questionText={q.title}
            serialNumber={serialNumber}
            maintenanceType={uploadSlug}
            initialImages={questionImages[questionKey] || []}
            onImagesChange={(images) => onImagesChange(questionKey, images)}
            hasError={uploaderHasError}
          />
        )}
      </div>
    </div>
  );
}
