// Mirrors subprocessors.json, which is maintained by hand and rendered as Annex C.
export type Subprocessor = {
  name: string;
  services: string[];
  processingLocations: string[];
  processesPii: boolean;
  vendorUrl?: string;
};

export type SubprocessorList = {
  subprocessors: Subprocessor[];
};
