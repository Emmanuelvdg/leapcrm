// Legal forms in their normalised spelling (upper case, punctuation turned
// into spaces, "&" spelled AND), stripped from the end of a company name, or
// from the start for countries that put the form first.
export const GENERIC_COMPANY_LEGAL_SUFFIXES = [
  'LIMITED',
  'LTD',
  'INCORPORATED',
  'INC',
  'CORPORATION',
  'CORP',
  'LLC',
  'PLC',
];

export const COMPANY_LEGAL_SUFFIXES_BY_COUNTRY: Record<string, string[]> = {
  SG: ['PTE LTD', 'PTE LIMITED', 'PRIVATE LIMITED', 'LLP', 'LP'],
  GB: ['PUBLIC LIMITED COMPANY', 'LLP', 'LP', 'CIC', 'CYFYNGEDIG', 'CYF'],
  AU: ['PTY LTD', 'PTY LIMITED', 'PROPRIETARY LIMITED'],
  NZ: [],
  US: ['CO', 'COMPANY', 'LP', 'LLP'],
  IN: ['PRIVATE LIMITED', 'PVT LTD', 'LLP'],
  HK: ['CO LTD', 'COMPANY LIMITED'],
  MY: ['SDN BHD', 'SENDIRIAN BERHAD', 'BHD', 'BERHAD'],
  ID: ['TBK'],
  FR: ['SA', 'SAS', 'SASU', 'SARL', 'EURL', 'SNC', 'SCI'],
  DE: ['GMBH AND CO KG', 'GMBH', 'AG', 'KG', 'UG', 'OHG', 'E V'],
  AT: ['GMBH', 'AG', 'KG'],
  CH: ['AG', 'SA', 'GMBH', 'SARL'],
  NL: ['BV', 'NV'],
  BE: ['BV', 'NV', 'SA', 'SRL'],
  ES: ['SL', 'SA', 'SLU'],
  IT: ['SRL', 'SPA'],
  SE: ['AB'],
  NO: ['AS', 'ASA'],
  DK: ['AS', 'APS'],
  FI: ['OY', 'OYJ'],
  JP: ['KK', 'KABUSHIKI KAISHA', 'CO LTD'],
  CN: ['CO LTD'],
};

export const COMPANY_LEGAL_PREFIXES_BY_COUNTRY: Record<string, string[]> = {
  ID: ['PT', 'CV'],
};
