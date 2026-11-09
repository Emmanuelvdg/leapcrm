// Fields that define what a model scores. Once a model has been active they
// stay fixed so past scores remain explainable; retraining duplicates the model.
export const ICP_MODEL_LOCKED_FIELD_NAMES = [
  'criteria',
  'tierThresholds',
  'wonStages',
  'lostStages',
  'datasetStartDate',
  'datasetEndDate',
] as const;
