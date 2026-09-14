/**
 * Business Constants
 *
 * Centralized constants for business-related data (industries, company sizes, etc.)
 * Used across onboarding, client management, and business intelligence features.
 *
 * LOCALIZATION NOTE:
 * - Keys (e.g., 'advertisingMarketing') are used for i18n lookups in onboarding.json
 * - Values (e.g., 'Advertising & Marketing') are stored in the database and sent to backend
 * - UI displays localized text via t('onboarding:industries.{key}')
 * - Backend always receives English values for consistency
 */

/**
 * Industry key-to-value mapping
 * Keys match translation file keys in onboarding.json (industries.*)
 * Values are stored in database and used by backend agents
 */
export const INDUSTRY_MAP: Record<string, string> = {
  advertisingMarketing: 'Advertising & Marketing',
  agricultureFarming: 'Agriculture & Farming',
  automotive: 'Automotive',
  construction: 'Construction',
  consulting: 'Consulting',
  ecommerce: 'E-commerce',
  education: 'Education',
  energyUtilities: 'Energy & Utilities',
  entertainmentMedia: 'Entertainment & Media',
  financeBanking: 'Finance & Banking',
  foodBeverage: 'Food & Beverage',
  healthcare: 'Healthcare',
  hospitalityTourism: 'Hospitality & Tourism',
  insurance: 'Insurance',
  legalServices: 'Legal Services',
  manufacturing: 'Manufacturing',
  nonprofit: 'Non-profit',
  professionalServices: 'Professional Services',
  realEstate: 'Real Estate',
  retail: 'Retail',
  saasSoftware: 'SaaS/Software',
  technology: 'Technology',
  telecommunications: 'Telecommunications',
  transportationLogistics: 'Transportation & Logistics',
  other: 'Other'
};

/**
 * Company size key-to-value mapping
 * Keys match translation file keys in onboarding.json (companySizes.*)
 * Values are stored in database and used by backend agents
 */
export const COMPANY_SIZE_MAP: Record<string, string> = {
  '1-10': '1-10 employees',
  '11-50': '11-50 employees',
  '51-200': '51-200 employees',
  '201-500': '201-500 employees',
  '500+': '500+ employees'
};

/**
 * Industry keys for iteration (ordered alphabetically by display value)
 */
export const INDUSTRY_KEYS = Object.keys(INDUSTRY_MAP);

/**
 * Company size keys for iteration (ordered smallest to largest)
 */
export const COMPANY_SIZE_KEYS = Object.keys(COMPANY_SIZE_MAP);

/**
 * Legacy exports for backward compatibility
 * These return the English values (used by backend enum mappings)
 */
export const INDUSTRIES = Object.values(INDUSTRY_MAP);
export const COMPANY_SIZES = Object.values(COMPANY_SIZE_MAP);

/**
 * Type definitions for TypeScript
 */
export type IndustryKey = keyof typeof INDUSTRY_MAP;
export type CompanySizeKey = keyof typeof COMPANY_SIZE_MAP;
export type Industry = typeof INDUSTRIES[number];
export type CompanySize = typeof COMPANY_SIZES[number];
