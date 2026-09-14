"""
Enum Mappings Module
Handles conversion between frontend display values and database enum values.

This is a long-term solution for handling enum mismatches between frontend and database.
Since we're in development with zero users, we're creating a clean mapping system
rather than changing either the frontend or database schemas.
"""

# Industry mappings - Frontend to Database
INDUSTRY_FRONTEND_TO_DB = {
    'SaaS/Software': 'SaaS',
    'E-commerce': 'E-commerce',
    'Professional Services': 'Services',
    'Manufacturing': 'Manufacturing',
    'Healthcare': 'HealthTech',
    'Retail': 'RetailTech',
    'Financial Services': 'FinTech',
    'Education': 'EdTech',
    'Non-profit': 'Other',
    'Other': 'Other',
    # Also handle direct database values
    'SaaS': 'SaaS',
    'FinTech': 'FinTech',
    'HealthTech': 'HealthTech',
    'EdTech': 'EdTech',
    'MarTech': 'MarTech',
    'RetailTech': 'RetailTech',
    'Services': 'Services',
    'Media & Entertainment': 'Media & Entertainment',
    'Real Estate': 'Real Estate',
    'Transportation': 'Transportation',
    'Energy': 'Energy',
    'Agriculture': 'Agriculture'
}

# Industry mappings - Database to Frontend
INDUSTRY_DB_TO_FRONTEND = {
    'SaaS': 'SaaS/Software',
    'E-commerce': 'E-commerce',
    'Services': 'Professional Services',
    'Manufacturing': 'Manufacturing',
    'HealthTech': 'Healthcare',
    'RetailTech': 'Retail',
    'FinTech': 'Financial Services',
    'EdTech': 'Education',
    'MarTech': 'Other',
    'Media & Entertainment': 'Other',
    'Real Estate': 'Other',
    'Transportation': 'Other',
    'Energy': 'Other',
    'Agriculture': 'Other',
    'Other': 'Other'
}

# Company size mappings - Frontend to Database
COMPANY_SIZE_FRONTEND_TO_DB = {
    '1 employee': '1',
    '1-10 employees': '2-9',
    '11-50 employees': '10-49',
    '51-200 employees': '50-249',
    '201-500 employees': '250-999',
    '501-1000 employees': '1000-4999',
    '1000+ employees': '5000+',
    # Also handle direct database values
    '1': '1',
    '2-9': '2-9',
    '10-49': '10-49',
    '50-249': '50-249',
    '250-999': '250-999',
    '1000-4999': '1000-4999',
    '5000+': '5000+'
}

# Company size mappings - Database to Frontend
COMPANY_SIZE_DB_TO_FRONTEND = {
    '1': '1 employee',
    '2-9': '1-10 employees',
    '10-49': '11-50 employees',
    '50-249': '51-200 employees',
    '250-999': '201-500 employees',
    '1000-4999': '501-1000 employees',
    '5000+': '1000+ employees'
}

# Business model mappings (keeping original values as they seem to match)
BUSINESS_MODEL_FRONTEND_TO_DB = {
    'B2B': 'B2B',
    'B2C': 'B2C',
    'B2B2C': 'B2B2C',
    'Subscription': 'Subscription',
    'Marketplace': 'Marketplace',
    'Freemium': 'Freemium',
    'Transaction-based': 'Transaction-based',
    'Advertising': 'Advertising',
    'Hybrid': 'Hybrid'
}

BUSINESS_MODEL_DB_TO_FRONTEND = BUSINESS_MODEL_FRONTEND_TO_DB.copy()


def map_industry_to_db(frontend_value: str) -> str:
    """Convert frontend industry value to database enum value."""
    if not frontend_value:
        return None
    return INDUSTRY_FRONTEND_TO_DB.get(frontend_value, 'Other')


def map_industry_to_frontend(db_value: str) -> str:
    """Convert database industry enum value to frontend display value."""
    if not db_value:
        return None
    return INDUSTRY_DB_TO_FRONTEND.get(db_value, db_value)


def map_company_size_to_db(frontend_value: str) -> str:
    """Convert frontend company size value to database enum value."""
    if not frontend_value:
        return None
    return COMPANY_SIZE_FRONTEND_TO_DB.get(frontend_value, frontend_value)


def map_company_size_to_frontend(db_value: str) -> str:
    """Convert database company size enum value to frontend display value."""
    if not db_value:
        return None
    return COMPANY_SIZE_DB_TO_FRONTEND.get(db_value, db_value)


def map_business_model_to_db(frontend_value: str) -> str:
    """Convert frontend business model value to database enum value."""
    if not frontend_value:
        return None
    return BUSINESS_MODEL_FRONTEND_TO_DB.get(frontend_value, frontend_value)


def map_business_model_to_frontend(db_value: str) -> str:
    """Convert database business model enum value to frontend display value."""
    if not db_value:
        return None
    return BUSINESS_MODEL_DB_TO_FRONTEND.get(db_value, db_value)


# AI-extracted value normalization functions (for cross-agent intelligence system)
def normalize_company_size(extracted_size: str) -> str:
    """Convert AI-extracted company size to database enum value"""
    if not extracted_size:
        return None
    
    extracted_size = str(extracted_size).strip()
    
    # Try to extract number and map to database enum values
    import re
    numbers = re.findall(r'\d+', extracted_size)
    if numbers:
        num = int(numbers[0])
        if num <= 10:
            return "1-10 employees"
        elif num <= 50:
            return "11-50 employees"
        elif num <= 200:
            return "51-200 employees"
        elif num <= 500:
            return "201-500 employees"
        elif num <= 1000:
            return "501-1000 employees"
        else:
            return "1000+ employees"
    
    # Try mapping common phrases
    extracted_lower = extracted_size.lower()
    if 'micro' in extracted_lower or 'solo' in extracted_lower or '1-10' in extracted_size:
        return "1-10 employees"
    elif 'small' in extracted_lower or '11-50' in extracted_size:
        return "11-50 employees"
    elif 'medium' in extracted_lower or '51-200' in extracted_size:
        return "51-200 employees"
    elif 'large' in extracted_lower or '201-500' in extracted_size:
        return "201-500 employees"
    elif 'enterprise' in extracted_lower or '1000+' in extracted_size:
        return "1000+ employees"
    
    # Default fallback
    return "11-50 employees"


def normalize_industry(extracted_industry: str) -> str:
    """Convert AI-extracted industry to database enum value"""
    if not extracted_industry:
        return None

    extracted_industry = str(extracted_industry).strip()

    # First try exact match (for dropdown selections)
    # This matches the 25 industries from /apps/web/src/config/businessConstants.ts
    EXACT_INDUSTRIES = [
        'Advertising & Marketing',
        'Agriculture & Farming',
        'Automotive',
        'Construction',
        'Consulting',
        'E-commerce',
        'Education',
        'Energy & Utilities',
        'Entertainment & Media',
        'Finance & Banking',
        'Food & Beverage',
        'Healthcare',
        'Hospitality & Tourism',
        'Insurance',
        'Legal Services',
        'Manufacturing',
        'Non-profit',
        'Professional Services',
        'Real Estate',
        'Retail',
        'SaaS/Software',
        'Technology',
        'Telecommunications',
        'Transportation & Logistics',
        'Other'
    ]

    if extracted_industry in EXACT_INDUSTRIES:
        return extracted_industry

    # Partial matches for AI-extracted data (fuzzy matching)
    extracted_lower = extracted_industry.lower()
    if 'software' in extracted_lower or 'saas' in extracted_lower:
        return "SaaS/Software"
    elif 'tech' in extracted_lower and 'health' not in extracted_lower:
        return "Technology"
    elif 'food' in extracted_lower or 'beverage' in extracted_lower or 'restaurant' in extracted_lower:
        return "Food & Beverage"
    elif 'manufacturing' in extracted_lower:
        return "Manufacturing"
    elif 'construction' in extracted_lower:
        return "Construction"
    elif 'consult' in extracted_lower:
        return "Consulting"
    elif 'service' in extracted_lower and 'legal' not in extracted_lower:
        return "Professional Services"
    elif 'health' in extracted_lower or 'medical' in extracted_lower or 'hospital' in extracted_lower:
        return "Healthcare"
    elif 'finance' in extracted_lower or 'bank' in extracted_lower or 'fintech' in extracted_lower:
        return "Finance & Banking"
    elif 'retail' in extracted_lower:
        return "Retail"
    elif 'commerce' in extracted_lower or 'e-commerce' in extracted_lower or 'ecommerce' in extracted_lower:
        return "E-commerce"
    elif 'education' in extracted_lower or 'edtech' in extracted_lower or 'school' in extracted_lower or 'university' in extracted_lower:
        return "Education"
    elif 'non-profit' in extracted_lower or 'nonprofit' in extracted_lower or 'charity' in extracted_lower:
        return "Non-profit"
    elif 'media' in extracted_lower or 'entertainment' in extracted_lower:
        return "Entertainment & Media"
    elif 'real estate' in extracted_lower or 'property' in extracted_lower:
        return "Real Estate"
    elif 'transport' in extracted_lower or 'logistics' in extracted_lower or 'shipping' in extracted_lower:
        return "Transportation & Logistics"
    elif 'energy' in extracted_lower or 'utilities' in extracted_lower or 'power' in extracted_lower:
        return "Energy & Utilities"
    elif 'agriculture' in extracted_lower or 'farming' in extracted_lower:
        return "Agriculture & Farming"
    elif 'automotive' in extracted_lower or 'auto' in extracted_lower or 'vehicle' in extracted_lower:
        return "Automotive"
    elif 'advertising' in extracted_lower or 'marketing' in extracted_lower:
        return "Advertising & Marketing"
    elif 'hospitality' in extracted_lower or 'tourism' in extracted_lower or 'hotel' in extracted_lower or 'travel' in extracted_lower:
        return "Hospitality & Tourism"
    elif 'insurance' in extracted_lower:
        return "Insurance"
    elif 'legal' in extracted_lower or 'law' in extracted_lower:
        return "Legal Services"
    elif 'telecom' in extracted_lower or 'telecommunications' in extracted_lower:
        return "Telecommunications"

    # Default fallback
    return "Other"


def normalize_business_model(extracted_model: str) -> str:
    """Convert AI-extracted business model to database enum value"""
    if not extracted_model:
        return None
        
    extracted_model = str(extracted_model).strip()
    
    # Partial matches for AI-extracted data
    extracted_lower = extracted_model.lower()
    if 'b2b' in extracted_lower or 'business to business' in extracted_lower:
        return "B2B"
    elif 'b2c' in extracted_lower or 'business to consumer' in extracted_lower:
        return "B2C"
    elif 'b2b2c' in extracted_lower:
        return "B2B2C"
    elif 'subscription' in extracted_lower or 'recurring' in extracted_lower:
        return "Subscription"
    elif 'marketplace' in extracted_lower or 'platform' in extracted_lower:
        return "Marketplace"
    elif 'freemium' in extracted_lower or 'free tier' in extracted_lower:
        return "Freemium"
    elif 'transaction' in extracted_lower or 'commission' in extracted_lower:
        return "Transaction-based"
    elif 'advertising' in extracted_lower or 'ads' in extracted_lower:
        return "Advertising"
    elif 'hybrid' in extracted_lower or 'mixed' in extracted_lower:
        return "Hybrid"
    
    # Default fallback
    return "B2B"