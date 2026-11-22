export type CallRecordingTargetObjectNameSingular =
  | 'person'
  | 'company'
  | 'opportunity';

export type CallRecordingTarget = {
  objectNameSingular: CallRecordingTargetObjectNameSingular;
  recordId: string;
  recordName: string;
};
