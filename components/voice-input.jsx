<div className="question-with-upload">
  <div className="textarea-wrapper">
    <textarea
      name={`q${i + 1}`}
      className="checklist-textarea"
      onInput={autoGrow}
      value={answers[`q${i + 1}`] || ""}
      onChange={(e) => {
        setAnswers((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        if (e.target.value.trim()) {
          e.target.classList.remove('has-error');
        }
      }}
      required={q.required}
    />
    <VoiceInput
      onTranscript={(text) => {
        const questionKey = `q${i + 1}`;
        setAnswers((prev) => ({
          ...prev,
          [questionKey]: (prev[questionKey] || '') + text
        }));
      }}
    />
  </div>
  
  {q.allow_uploads && (
    <ImageUploader
      questionKey={`q${i + 1}`}
      questionText={q.title}
      serialNumber={unit?.serial_number}
      maintenanceType="unscheduled"
      initialImages={questionImages[`q${i + 1}`] || []}
      onImagesChange={(images) => handleImagesChange(`q${i + 1}`, images)}
    />
  )}
</div>