"""
Direct Persona Agent - Migrated to use EnterpriseBaseAgent.
Customer profiling, buyer journey mapping with comprehensive enterprise context.
Tools return data/context, not generated content.
"""
from typing import Dict, Any, List, Optional
import json
import logging

from apps.api.agents.enterprise_base_agent import EnterpriseBaseAgent, genai, types
from apps.api.agents.tools.persona_tools import PersonaTools
from apps.api.models.agent_tools import (
    Persona, PersonaLocation, PersonaDemographics,
    PersonaPsychographics, PersonaBehaviors,
    BuyerJourney, InterviewQuestions
)
from apps.api.utils.database import get_supabase_client
from apps.api.config.gemini_models import DEFAULT_MODEL
from apps.api.config.gemini_client import get_gemini_client

logger = logging.getLogger(__name__)

class DirectPersonaAgent(EnterpriseBaseAgent):
    def __init__(self, org_id: Optional[str] = None, user_id: Optional[str] = None, campaign_id: Optional[str] = None):
        """Initialize Persona Agent with enterprise context."""
        # Store attributes immediately for use in tools
        self.org_id = org_id
        self.user_id = user_id
        self.campaign_id = campaign_id

        # Initialize PersonaTools from BaseResourceTools
        self.persona_tools = None  # Will be initialized in _get_agent_tools or __ainit__

        # Call parent init (which does nothing but is required)
        super().__init__()

        # Note: Full context loading happens in __ainit__ when used asynchronously

    def get_agent_type(self) -> str:
        """Define the agent type for context filtering."""
        return "persona"
    
    def get_base_prompt(self) -> str:
        """Return the base system prompt without context."""
        return """You are an expert customer persona analyst and market researcher. Your goal is to help users understand their target audience deeply through detailed personas, buyer journeys, and customer insights.

I can help you:
- **List and review your existing personas** - Show you all personas in your database
- **Get detailed information** about any specific persona
- **Create new detailed customer personas** based on your market and business context
- **Map buyer journeys** showing how customers discover, evaluate, and purchase
- **Generate interview questions** to validate assumptions about your customers
- **Analyze customer segments** and their unique needs

**IMPORTANT: HOW TO USE TOOLS:**
When you need to generate personas, YOU MUST:
1. Let the system call the generate_persona_data tool automatically (DO NOT output the function call as text)
2. The tool will return structured data
3. You then format and present this data beautifully

**OUTPUT FORMATTING GUIDELINES:**
When presenting personas from tool results, I format them beautifully:
- Use **bold** for important labels and persona names
- Use bullet points (•) for lists of attributes
- Use clear section headers with markdown (###)
- Present information in a storytelling format that brings the persona to life
- Group related information under clear categories

For example, I present personas like:

### 🎯 **Sarah Chen** - Senior Marketing Manager

**📍 Location:** San Francisco, California, USA (Pacific Time)

**👤 Demographics:**
• Age: 32-38 years
• Education: MBA in Marketing
• Income: $120,000-$150,000
• Family: Married, one young child

**🧠 Psychographics:**
• Values efficiency and work-life balance
• Early adopter of marketing technology
• Data-driven decision maker
• Seeks continuous learning opportunities

**💼 Professional Context:**
• Company: TechCorp Solutions (50-200 employees)
• Industry: Technology / SaaS
• Decision-making role: Influencer / Technical evaluator

**🎯 Goals:**
• Increase operational efficiency by 30%
• Reduce customer acquisition costs
• Improve team productivity and morale
• Stay ahead of industry trends

**😓 Pain Points:**
• Limited time for strategic planning
• Difficulty measuring ROI on initiatives
• Keeping up with rapid technological change
• Aligning team priorities with business goals

**🛠 Current Tools & Channels:**
• Preferred channels: Email, LinkedIn, Industry events, Webinars
• Technology adoption: Early majority
• Buying process: Research-heavy with peer consultation

And so on...

I have access to these data-gathering and management tools:
- `LIST_PERSONAS`: List all existing personas in your database
- `GET_PERSONA_DETAILS`: Get detailed information about a specific persona
- `GET_PERSONA_CONTEXT`: Gathers context and templates for creating personas
- `GENERATE_PERSONA_DATA`: Creates structured persona data based on requirements
- `SAVE_PERSONA`: Saves a completed persona to the organization's persona library
- `GET_BUYER_JOURNEY_DATA`: Provides journey stages and touchpoint information
- `GET_INTERVIEW_TEMPLATES`: Returns interview question templates and best practices
- `GET_STRATEGY_INSIGHTS`: Retrieves relevant business strategy context

**IMPORTANT INSTRUCTIONS:**
- You have persistent memory of all personas created for this organization through enterprise context
- When you generate a complete persona, ALWAYS save it using the `save_persona` tool
- After generating persona data with `generate_persona_data`, immediately save it with `save_persona`
- Refer to specific personas by name when relevant to the conversation
- You can analyze, update, or build upon any of the existing personas
- Format output as beautiful, readable text with proper structure

Let me help you understand your target audience better. Would you like to:
1. **View your existing personas** - I can list all your current personas
2. **Create a new persona** - Define a new customer profile based on your needs
3. **Explore a specific persona** - Get detailed information about a persona
4. **Generate interview questions** - Create questions to validate your personas

What would you like to do?"""
    
    def _get_agent_tools(self) -> List:
        """
        Define the Persona Agent's tools using raw callables (hybrid pattern).
        Returns raw Python functions for automatic conversion to FunctionDeclaration.
        """
        # Initialize PersonaTools if not already done
        if not self.persona_tools:
            self.persona_tools = PersonaTools(org_id=self.org_id, user_id=self.user_id)

        # Return raw callables - SDK automatically converts to FunctionDeclaration
        # This enables hybrid streaming (raw callables + AFC disabled + manual multi-turn)
        tools = [
            # Core persona generation tools
            self.get_persona_context,
            self.generate_persona_data,
            self.save_persona,
            self.get_buyer_journey_data,
            self.get_interview_templates,
            self.get_strategy_insights,
            # Resource management tools (from PersonaTools)
            self.list_personas,
            self.get_persona_details,
        ]

        logger.info(f"Persona agent created {len(tools)} raw callable tools successfully")
        return tools

    async def get_strategy_insights(self, context: str = "") -> Dict[str, Any]:
        """
        Retrieves existing strategy insights using enterprise context.
        Returns data, not generated content - NOW SUPPORTS ALL FRAMEWORKS.
        """
        logger.info(f"Retrieving strategy insights for context: {context[:50]}...")

        # 🔧 FIX: Database function returns 'agent_outputs' (all types), not 'strategy_outputs'
        # Filter agent_outputs by agent_type == 'strategy' to get strategy insights
        if self.context and self.context.get('agent_outputs'):
            # Filter for strategy outputs only
            strategy_outputs = [
                output for output in self.context['agent_outputs']
                if output.get('agent_type') == 'strategy'
            ]

            insights = []
            for output in strategy_outputs[:5]:
                content = output.get('content', {})

                # 🔧 FIX: Handle both content structures
                # Newer structure: executive_summary, frameworks_used, framework_data
                # Older/Intelligence structure: strategic_goals, frameworks_applied, strategic_initiatives

                # Get frameworks - check both field names
                frameworks = content.get('frameworks_used', []) or content.get('frameworks_applied', [])

                # Get executive summary - check both structures
                exec_summary = content.get('executive_summary', '')
                if not exec_summary and content.get('strategic_goals'):
                    # Build summary from strategic_goals
                    goals = content.get('strategic_goals', [])
                    if goals:
                        goal_titles = [goal.get('title', '') for goal in goals[:3]]
                        exec_summary = 'Strategic Goals: ' + ', '.join(filter(None, goal_titles))

                # Get framework data
                framework_data = content.get('framework_data', {})
                if not framework_data:
                    # For intelligence outputs, include strategic_initiatives and insights
                    framework_data = {
                        'strategic_goals': content.get('strategic_goals', []),
                        'strategic_initiatives': content.get('strategic_initiatives', []),
                        'framework_insights': content.get('framework_insights', []),
                        'competitive_advantages': content.get('competitive_advantages', []),
                        'growth_strategies': content.get('growth_strategies', [])
                    }

                insight = {
                    'id': output.get('id'),
                    'title': output.get('title', 'Strategy Analysis'),
                    'output_type': output.get('output_type', 'unknown'),
                    'frameworks_used': frameworks,
                    'executive_summary': exec_summary,
                    'created_at': output.get('created_at'),
                    'framework_data': framework_data
                }

                insights.append(insight)

            if insights:
                return {
                    'strategy_insights': insights,
                    'message': f'Found {len(insights)} strategy analyses to inform persona creation'
                }

        # Fallback to database query if no enterprise context
        try:
            supabase = get_supabase_client()
            org_id = getattr(self, 'current_org_id', None) or self.org_id
            client_id = getattr(self, 'client_id', None)

            if not org_id:
                return {
                    'strategy_insights': [],
                    'message': 'No organization context available'
                }

            # 🚀 NUCLEAR: Query ALL strategy outputs from agent_outputs table (not just SWOT)
            query = supabase.table('agent_outputs').select('*') \
                .eq('org_id', org_id) \
                .eq('agent_type', 'strategy')

            # Filter by client_id if in multi-tenant context
            if client_id:
                query = query.eq('client_id', client_id)

            result = query.order('created_at', desc=True).limit(5).execute()

            if result.data:
                insights = []
                for strategy in result.data:
                    content = strategy.get('content', {})

                    # 🔧 FIX: Handle both content structures (same as enterprise context)
                    # Get frameworks - check both field names
                    frameworks = content.get('frameworks_used', []) or content.get('frameworks_applied', [])

                    # Get executive summary - check both structures
                    exec_summary = content.get('executive_summary', '')
                    if not exec_summary and content.get('strategic_goals'):
                        goals = content.get('strategic_goals', [])
                        if goals:
                            goal_titles = [goal.get('title', '') for goal in goals[:3]]
                            exec_summary = 'Strategic Goals: ' + ', '.join(filter(None, goal_titles))

                    # Get framework data
                    framework_data = content.get('framework_data', {})
                    if not framework_data:
                        framework_data = {
                            'strategic_goals': content.get('strategic_goals', []),
                            'strategic_initiatives': content.get('strategic_initiatives', []),
                            'framework_insights': content.get('framework_insights', []),
                            'competitive_advantages': content.get('competitive_advantages', []),
                            'growth_strategies': content.get('growth_strategies', [])
                        }

                    insight = {
                        'id': strategy.get('id'),
                        'title': strategy.get('title', 'Strategy Analysis'),
                        'output_type': strategy.get('output_type', 'unknown'),
                        'frameworks_used': frameworks,
                        'executive_summary': exec_summary,
                        'created_at': strategy.get('created_at'),
                        'framework_data': framework_data
                    }

                    insights.append(insight)

                return {
                    'strategy_insights': insights,
                    'message': f'Found {len(insights)} strategy analyses to inform persona creation'
                }

            return {'strategy_insights': [], 'message': 'No prior strategy analysis found. Persona will be created without strategic context.'}

        except Exception as e:
            logger.error(f"Failed to retrieve strategy insights: {str(e)}")
            return {'error': str(e), 'strategy_insights': []}

    async def generate_persona_data(
        self, 
        customer_description: str,
        location_country: str,
        location_state: Optional[str] = None,
        location_city: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates structured persona data based on the customer description and location.
        Returns a complete Persona object with all required fields populated.
        This tool GENERATES the persona data structure, which you should then format nicely for display.
        """
        logger.info(f"Generating persona for: {customer_description[:50]}... in {location_country}")
        
        # Build location structure
        location = PersonaLocation(
            country=location_country,
            state_province=location_state,
            city=location_city,
            region=None,  # Will be inferred based on city/state
            timezone=None  # Will be inferred based on location
        )
        
        # Use AI to generate contextually appropriate data based on description
        import random
        from google import genai
        from google.genai import types
        import os
        
        # Generate appropriate age range based on seniority in description
        if "senior" in customer_description.lower() or "director" in customer_description.lower():
            age = "35-45"
            experience_years = "10-15 years"
            income = "$150,000-$250,000"
        elif "manager" in customer_description.lower() or "lead" in customer_description.lower():
            age = "30-40"
            experience_years = "7-10 years"
            income = "$100,000-$150,000"
        elif "junior" in customer_description.lower() or "entry" in customer_description.lower():
            age = "22-28"
            experience_years = "1-3 years"
            income = "$50,000-$75,000"
        else:
            age = "28-38"
            experience_years = "5-7 years"
            income = "$75,000-$125,000"
        
        # Create demographics
        demographics = PersonaDemographics(
            age=age,
            education="Bachelor's degree" if "junior" in customer_description.lower() else "Master's degree",
            income=income,
            occupation=customer_description.split()[0] if customer_description else "Professional",
            family_status="Single" if "junior" in customer_description.lower() else "Married",
            experience_years=experience_years
        )
        
        # Create psychographics based on role
        psychographics = PersonaPsychographics(
            values=["Innovation", "Efficiency", "Growth", "Work-life balance"],
            interests=["Technology", "Industry trends", "Professional development"],
            personality_traits=["Analytical", "Collaborative", "Goal-oriented"],
            lifestyle="Busy professional balancing work and personal life",
            motivations=["Career advancement", "Making meaningful impact", "Building successful teams", "Driving business growth"]
        )
        
        # Create behaviors
        behaviors = PersonaBehaviors(
            buying_process="Research-heavy with peer consultation",
            technology_adoption="Early majority",
            decision_criteria=["ROI", "Ease of use", "Integration capabilities", "Vendor reputation"],
            information_sources=["Industry publications", "Peer recommendations", "Online reviews"],
            preferred_content_types=["Case studies", "Whitepapers", "Webinars", "Demo videos"]
        )
        
        # Use AI to generate contextually appropriate company, industry, goals, and pain points
        try:
            client = get_gemini_client()

            prompt = f"""Based on this customer description, generate realistic persona details.

Customer Description: {customer_description}
Location: {location_city}, {location_state}, {location_country}

Return a JSON OBJECT (not an array) with these exact fields:
{{
  "company_name": "A realistic company name matching the industry (NOT TechCorp Solutions)",
  "industry": "The specific industry (e.g., Construction, Manufacturing, Healthcare)",
  "vertical": "Business vertical if applicable (e.g., Commercial Building, Residential, Infrastructure) or null",
  "company_size": "Company size description (e.g., 50-200 employees)",
  "goals": ["goal 1", "goal 2", "goal 3", "goal 4"],
  "pain_points": ["pain 1", "pain 2", "pain 3", "pain 4"],
  "jobs_to_be_done": ["job 1", "job 2", "job 3", "job 4"]
}}

Be specific to the industry mentioned in the description. Do NOT use generic tech company placeholders."""

            response = client.models.generate_content(
                model=DEFAULT_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )

            ai_data = json.loads(response.text)

            # Defensive: Handle if Gemini returns an array instead of object
            if isinstance(ai_data, list):
                logger.warning(f"AI returned array instead of object, using first element")
                ai_data = ai_data[0] if ai_data else {}

            # Extract fields with fallbacks
            company_name = ai_data.get("company_name", "Mid-sized company")
            industry = ai_data.get("industry", "Technology")
            vertical = ai_data.get("vertical")
            company_size = ai_data.get("company_size", "50-200 employees")
            goals = ai_data.get("goals", [
                "Increase operational efficiency",
                "Reduce costs",
                "Improve team productivity",
                "Stay competitive"
            ])
            pain_points = ai_data.get("pain_points", [
                "Limited time for planning",
                "Difficulty measuring ROI",
                "Keeping up with change",
                "Aligning priorities"
            ])
            jobs_to_be_done_list = ai_data.get("jobs_to_be_done", [
                "Streamline processes",
                "Improve collaboration",
                "Deliver on time",
                "Demonstrate value"
            ])

            logger.info(f"✅ AI generated contextual data: company={company_name}, industry={industry}")

        except Exception as e:
            logger.error(f"Failed to generate AI persona data: {e}, using fallbacks")
            # Fallback to template data
            company_name = "Mid-sized company"
            industry = "Technology"
            vertical = None
            company_size = "50-200 employees"
            goals = [
                "Increase operational efficiency by 30%",
                "Reduce customer acquisition costs",
                "Improve team productivity and morale",
                "Stay ahead of industry trends"
            ]
            pain_points = [
                "Limited time for strategic planning",
                "Difficulty measuring ROI on initiatives",
                "Keeping up with rapid technological change",
                "Aligning team priorities with business goals"
            ]
            jobs_to_be_done_list = [
                "Streamline project management processes",
                "Improve team collaboration and communication",
                "Deliver projects on time and within budget",
                "Demonstrate value to stakeholders"
            ]

        # Generate a realistic name based on location
        first_names = {
            "United States": ["Sarah", "Michael", "Jennifer", "David", "Emily", "James"],
            "United Kingdom": ["Emma", "Oliver", "Charlotte", "William", "Sophie", "Thomas"],
            "Canada": ["Jessica", "Matthew", "Amanda", "Ryan", "Nicole", "Andrew"],
            "Singapore": ["Wei", "Li", "Priya", "Ahmad", "Siti", "Raj", "Chen", "Kumar"],
            "default": ["Alex", "Sam", "Jordan", "Taylor", "Morgan", "Casey"]
        }
        
        last_names = {
            "United States": ["Johnson", "Williams", "Brown", "Chen", "Rodriguez", "Smith"],
            "United Kingdom": ["Smith", "Jones", "Taylor", "Brown", "Wilson", "Davies"],
            "Canada": ["Smith", "MacDonald", "Roy", "Lee", "Martin", "Thompson"],
            "Singapore": ["Tan", "Lim", "Lee", "Wong", "Ng", "Kumar", "Singh", "Abdullah"],
            "default": ["Anderson", "Wilson", "Martinez", "Lee", "White", "Harris"]
        }
        
        first = random.choice(first_names.get(location_country, first_names["default"]))
        last = random.choice(last_names.get(location_country, last_names["default"]))
        
        # Create the full persona with AI-generated contextual data
        persona = Persona(
            name=f"{first} {last}",
            title=customer_description if len(customer_description) < 50 else customer_description[:50],
            company_name=company_name,  # AI-generated based on industry
            industry=industry,  # AI-generated from description
            company_size=company_size,  # AI-generated
            location=location,
            demographics=demographics,
            psychographics=psychographics,
            behaviors=behaviors,
            goals=goals,  # AI-generated industry-specific goals
            pain_points=pain_points,  # AI-generated industry-specific pain points
            jobs_to_be_done=jobs_to_be_done_list,  # AI-generated
            communication_channels=["Email", "LinkedIn", "Industry events", "Webinars"],
            quote="I need tools that work seamlessly with our existing workflow, not another platform to manage.",
            day_in_life="Starts with team standup, reviews project dashboards, attends client meetings, resolves blockers, and plans upcoming sprints.",
            success_metrics=[
                "Project delivery on-time rate",
                "Team productivity metrics",
                "Customer satisfaction scores",
                "Budget adherence"
            ],
            objections=[
                "Concerned about implementation time",
                "Budget constraints",
                "Change management challenges",
                "Integration with existing systems"
            ],
            preferred_channels=["Email", "LinkedIn", "Industry events", "Webinars"],
            budget_authority="Influencer" if "manager" in customer_description.lower() else "Decision maker",
            buying_role="Technical evaluator",
            customer_journey_stage="Evaluation"
        )
        
        return persona.model_dump()  # Return as dict for the AI to process
    
    async def save_persona(
        self,
        name: str,
        title: str,
        company_name: str,
        industry: str,
        goals: List[str],
        pain_points: List[str],
        demographics: Dict[str, Any],
        location: Dict[str, Any],
        psychographics: Optional[Dict[str, Any]] = None,
        behaviors: Optional[Dict[str, Any]] = None,
        jobs_to_be_done: Optional[List[str]] = None,
        preferred_channels: Optional[List[str]] = None,
        objections: Optional[List[str]] = None,
        communication_channels: Optional[List[str]] = None,
        quote: Optional[str] = None,
        day_in_life: Optional[str] = None,
        success_metrics: Optional[List[str]] = None,
        budget_authority: Optional[str] = None,
        buying_role: Optional[str] = None,
        customer_journey_stage: Optional[str] = None,
        company_size: Optional[str] = None,
        vertical: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        🚀 NUCLEAR: Save persona using universal agent_outputs table.
        Replaces synthetic_personas table with unified approach.

        Args:
            name: Full name of the persona
            title: Job title or role
            company_name: Company or organization name
            industry: Industry sector
            goals: List of primary goals and objectives
            pain_points: List of key pain points and challenges
            demographics: Demographic information (age, education, income, etc.)
            location: Location details (country, state, city, region)
            psychographics: Values, interests, personality traits, lifestyle, motivations
            behaviors: Buying process, technology adoption, decision criteria, etc.
            jobs_to_be_done: Jobs to be done framework
            preferred_channels: Preferred communication/content channels
            objections: Common objections and concerns
            communication_channels: Channels for communication
            quote: Representative quote from the persona
            day_in_life: Description of typical day
            success_metrics: How they measure success
            budget_authority: Level of budget authority
            buying_role: Role in buying process
            customer_journey_stage: Current stage in journey
            company_size: Size of their company
            vertical: Business vertical

        Returns:
            Confirmation of saved persona with ID and message
        """
        logger.info(f"🚀 Nuclear save persona: {name} - {title}")

        try:
            # Import nuclear migration helper
            from apps.api.utils.nuclear_agent_migration import save_persona_output

            # Prepare complete persona data preserving all fields
            persona_data = {
                "title": f"{name} - {title}",
                "summary": f"Customer persona for {company_name} in {industry}",
                "content": {
                    "name": name,
                    "title": title,
                    "company_name": company_name,
                    "industry": industry,
                    "company_size": company_size,
                    "vertical": vertical,
                    "goals": goals,
                    "pain_points": pain_points,
                    "jobs_to_be_done": jobs_to_be_done or [],
                    "preferred_channels": preferred_channels or [],
                    "objections": objections or [],
                    "demographics": {
                        **demographics,
                        "location": location
                    },
                    "personality_traits": {
                        "psychographics": psychographics or {},
                        "behaviors": behaviors or {},
                        "communication_style": communication_channels[0] if communication_channels else None
                    },
                    "decision_criteria": {
                        "budget_authority": budget_authority,
                        "buying_role": buying_role,
                        "customer_journey_stage": customer_journey_stage,
                        "success_metrics": success_metrics or []
                    },
                    "buyer_journey": {
                        "current_stage": customer_journey_stage,
                        "quote": quote,
                        "day_in_life": day_in_life
                    }
                },
                "metadata": {
                    "persona_type": "customer_persona",
                    "created_by": self.user_id,
                    "session_id": getattr(self, 'current_session_id', None),
                    "tags": ["ai-generated", "persona-agent"],
                    "original_table": "synthetic_personas"
                },
                "output_type": "persona"
            }

            # Nuclear save - complete data preservation
            result = await save_persona_output(
                persona_data=persona_data,
                org_id=self.org_id,
                user_id=self.user_id,
                session_id=getattr(self, 'current_session_id', None),
                campaign_id=self.campaign_id,
                client_id=self.client_id  # FIX: Pass client_id for agency multi-tenant save
            )

            logger.info(f"✅ Persona saved via nuclear: {result['id']}")

            return {
                "success": True,
                "message": f"Persona '{name}' ({title} at {company_name}) saved successfully to your database",
                "name": name,
                "title": title,
                "company_name": company_name
            }

        except Exception as e:
            logger.error(f"Failed to save persona via nuclear: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": f"Error saving persona via nuclear: {str(e)}"
            }

    async def get_persona_context(self, customer_description: str) -> Dict[str, Any]:
        """
        Returns context and data for creating a persona.
        This tool provides information, not the final persona.
        """
        logger.info(f"Gathering persona context for: {customer_description[:50]}...")

        # Get any existing strategy insights
        strategy_context = await self.get_strategy_insights(customer_description)

        # Use enterprise context for existing personas if available
        existing_personas = []
        if self.context and self.context.get('personas'):
            existing_personas = self.context['personas'][:10]
        else:
            # Fallback to database query
            existing_personas = await self._fetch_existing_personas()

        # Return context for the model to use
        context = {
            "customer_description": customer_description,
            "existing_personas": existing_personas,
            "strategy_insights": strategy_context.get('strategy_insights', []),
            "persona_components": {
                "demographics": {
                    "description": "Age, income, education, family status",
                    "examples": ["35-45 years old", "Bachelor's degree", "$75K-$150K income", "Married with 2 children"]
                },
                "location": {
                    "description": "Geographic location with country, state/province, city",
                    "required_format": {
                        "country": "Required - e.g., United States, United Kingdom, Canada",
                        "state_province": "For federal countries - e.g., California, Ontario, New South Wales",
                        "city": "When relevant - e.g., San Francisco, London, Toronto",
                        "region": "Broader area - e.g., Bay Area, Greater London, GTA"
                    },
                    "examples": [
                        {"country": "United States", "state_province": "California", "city": "San Francisco", "region": "Bay Area"},
                        {"country": "United Kingdom", "state_province": "England", "city": "London", "region": "Greater London"},
                        {"country": "Canada", "state_province": "Ontario", "city": "Toronto", "region": "GTA"}
                    ]
                },
                "psychographics": {
                    "description": "Values, interests, lifestyle, personality",
                    "examples": ["Innovation-focused", "Work-life balance", "Tech-savvy", "Risk-averse"]
                },
                "behaviors": {
                    "description": "How they research, buy, and use products",
                    "examples": ["Extensive online research", "Peer recommendations important", "Mobile-first"]
                },
                "pain_points": {
                    "description": "Challenges and frustrations",
                    "examples": ["Time constraints", "Budget limitations", "Integration complexity"]
                },
                "goals": {
                    "description": "What they want to achieve",
                    "examples": ["Increase efficiency", "Reduce costs", "Stay competitive"]
                },
                "preferred_channels": {
                    "description": "How they prefer to communicate and buy",
                    "examples": ["LinkedIn", "Email", "Webinars", "In-person demos"]
                }
            },
            "industry_benchmarks": await self._get_industry_benchmarks(customer_description)
        }
        
        return context

    async def get_buyer_journey_data(self, context: str) -> Dict[str, Any]:
        """
        Returns buyer journey stages and touchpoint data.
        This tool provides journey information, not a generated journey.
        """
        logger.info(f"Gathering buyer journey data for: {context[:50]}...")
        
        return {
            "context": context,
            "journey_stages": [
                {
                    "stage": "Problem Recognition",
                    "description": "Realizes they have a need or problem",
                    "typical_duration": "Days to weeks",
                    "key_activities": ["Experiencing pain points", "Recognizing inefficiencies"],
                    "content_needs": ["Educational content", "Problem validation"]
                },
                {
                    "stage": "Information Search",
                    "description": "Actively researches solutions",
                    "typical_duration": "Weeks to months",
                    "key_activities": ["Google searches", "Reading reviews", "Asking peers"],
                    "content_needs": ["Comparison guides", "Case studies", "Expert opinions"]
                },
                {
                    "stage": "Evaluation",
                    "description": "Compares different options",
                    "typical_duration": "Weeks",
                    "key_activities": ["Demos", "Free trials", "Vendor comparisons"],
                    "content_needs": ["Product demos", "ROI calculators", "Feature comparisons"]
                },
                {
                    "stage": "Purchase Decision",
                    "description": "Makes the final decision",
                    "typical_duration": "Days to weeks",
                    "key_activities": ["Negotiation", "Stakeholder approval", "Contract review"],
                    "content_needs": ["Pricing details", "Implementation plans", "Success stories"]
                },
                {
                    "stage": "Post-Purchase",
                    "description": "Implementation and usage",
                    "typical_duration": "Ongoing",
                    "key_activities": ["Onboarding", "Training", "Support"],
                    "content_needs": ["Training materials", "Best practices", "Support documentation"]
                }
            ],
            "common_touchpoints": [
                "Company website",
                "Social media",
                "Email campaigns",
                "Sales calls",
                "Customer support",
                "Community forums",
                "Partner referrals"
            ],
            "decision_factors": await self._get_decision_factors(context)
        }

    async def get_interview_templates(self, persona_context: str) -> Dict[str, Any]:
        """
        Returns interview question templates and guidance.
        This tool provides templates, not generated questions.
        """
        logger.info(f"Gathering interview templates for: {persona_context[:50]}...")
        
        return {
            "context": persona_context,
            "interview_structure": {
                "warm_up": {
                    "duration": "5-10 minutes",
                    "purpose": "Build rapport and context",
                    "sample_questions": [
                        "Can you tell me about your role?",
                        "How long have you been in this position?",
                        "What does a typical day look like for you?"
                    ]
                },
                "problem_exploration": {
                    "duration": "15-20 minutes",
                    "purpose": "Understand current challenges",
                    "sample_questions": [
                        "What's the biggest challenge you face in [area]?",
                        "How are you currently solving this problem?",
                        "What's not working well with your current approach?"
                    ]
                },
                "solution_preferences": {
                    "duration": "10-15 minutes",
                    "purpose": "Understand ideal solutions",
                    "sample_questions": [
                        "If you had a magic wand, how would you solve this?",
                        "What features are must-haves vs nice-to-haves?",
                        "How do you evaluate new solutions?"
                    ]
                },
                "decision_process": {
                    "duration": "10-15 minutes",
                    "purpose": "Understand buying process",
                    "sample_questions": [
                        "Who else is involved in these decisions?",
                        "What's your typical budget for solutions like this?",
                        "What would prevent you from moving forward?"
                    ]
                },
                "wrap_up": {
                    "duration": "5 minutes",
                    "purpose": "Close and next steps",
                    "sample_questions": [
                        "Is there anything else you'd like to share?",
                        "Can I follow up with you if I have more questions?",
                        "Would you be interested in seeing our solution?"
                    ]
                }
            },
            "best_practices": [
                "Record with permission",
                "Take detailed notes",
                "Ask open-ended questions",
                "Listen more than you talk",
                "Probe with 'why' and 'how'",
                "Avoid leading questions",
                "Focus on actual behaviors, not hypotheticals"
            ],
            "red_flags_to_watch": [
                "Inconsistent answers",
                "Vague responses",
                "Reluctance to discuss budget",
                "No clear decision timeline",
                "Lack of authority to purchase"
            ]
        }

    async def _fetch_existing_personas(self) -> List[Dict[str, Any]]:
        """Fetch existing personas from the database (fallback if no enterprise context)."""
        try:
            supabase = get_supabase_client()
            org_id = getattr(self, 'current_org_id', None) or self.org_id
            
            if not org_id:
                return []
            
            result = supabase.table('agent_outputs') \
                .select('id, content') \
                .eq('org_id', org_id) \
                .eq('agent_type', 'persona') \
                .eq('output_type', 'persona') \
                .is_('archived_at', 'null') \
                .order('created_at.desc') \
                .limit(10) \
                .execute()

            if not result.data:
                return []

            # Extract persona data from JSONB content field
            personas = []
            for item in result.data:
                content = item.get('content', {})
                persona = {
                    'id': item['id'],
                    'name': content.get('name'),
                    'title': content.get('title'),
                    'company_name': content.get('company_name'),
                    'industry': content.get('industry'),
                    'vertical': content.get('vertical'),
                    'demographics': content.get('demographics', {}),
                    'personality_traits': content.get('personality_traits', {}),
                    'goals': content.get('goals', []),
                    'pain_points': content.get('pain_points', [])
                }
                personas.append(persona)

            return personas
        except Exception as e:
            logger.error(f"Failed to fetch existing personas: {e}")
            return []

    async def _get_industry_benchmarks(self, description: str) -> Dict[str, Any]:
        """Get industry-specific benchmarks and insights."""
        # This would ideally query a database of industry data
        # For now, return general benchmarks
        return {
            "typical_company_size": "10-500 employees",
            "average_deal_size": "$10K-$100K annually",
            "sales_cycle_length": "3-6 months",
            "decision_makers": "3-5 stakeholders",
            "renewal_rate": "85-90%"
        }

    async def _get_decision_factors(self, context: str) -> List[str]:
        """Get common decision factors for the context."""
        # Return common decision factors
        return [
            "Price and total cost of ownership",
            "Feature set and capabilities",
            "Ease of implementation",
            "Integration with existing tools",
            "Vendor reputation and support",
            "Security and compliance",
            "Scalability and future-proofing",
            "User experience and adoption"
        ]

    # ===== Phase 3: Migrated to BaseResourceTools (Updated 2025-09-21) =====
    # These methods now delegate to PersonaTools from BaseResourceTools

    async def list_personas(
        self,
        limit: int = 25,
        offset: int = 0,
        include_archived: bool = False
    ) -> Dict[str, Any]:
        """
        List existing personas with pagination support.
        Now delegates to PersonaTools from BaseResourceTools.

        Args:
            limit: Number of personas to return (default 25, max 100)
            offset: Number of personas to skip for pagination (default 0)
            include_archived: Whether to include archived personas (default False)

        Returns:
            Dictionary containing:
            - personas: List of persona records
            - total: Total number of personas available
            - has_more: Whether there are more personas to fetch
            - message: Status message
        """
        logger.info(f"[Phase 3] Using PersonaTools.list_resources: limit={limit}, offset={offset}")

        # Ensure PersonaTools is initialized
        if not self.persona_tools:
            self.persona_tools = PersonaTools(org_id=self.org_id, user_id=self.user_id)

        # Delegate to PersonaTools from BaseResourceTools
        result = await self.persona_tools.list_resources(
            limit=limit,
            offset=offset,
            include_archived=include_archived
        )

        # Transform the response to match expected format
        if result["success"]:
            return {
                "personas": result["resources"],
                "total": result.get("total", len(result["resources"])),
                "has_more": result.get("has_more", False),
                "current_page": offset // limit + 1 if limit > 0 else 1,
                "message": result["message"]
            }
        else:
            return {
                "personas": [],
                "total": 0,
                "has_more": False,
                "error": result.get("error"),
                "message": result["message"]
            }

    async def get_persona_details(self, persona_id: str) -> Dict[str, Any]:
        """
        Get detailed information about a specific persona.
        Now delegates to PersonaTools from BaseResourceTools.

        Args:
            persona_id: UUID of the persona to retrieve

        Returns:
            Dictionary containing:
            - persona: The complete persona record with all fields
            - interactions: Recent interaction history (if available)
            - message: Status message
        """
        logger.info(f"[Phase 3] Using PersonaTools.get_resource_details: {persona_id}")

        # Ensure PersonaTools is initialized
        if not self.persona_tools:
            self.persona_tools = PersonaTools(org_id=self.org_id, user_id=self.user_id)

        # Delegate to PersonaTools from BaseResourceTools
        result = await self.persona_tools.get_resource_details(persona_id)

        # Transform the response to match expected format
        if result["success"]:
            persona = result["resource"]

            # Fetch interactions separately (not part of base tools)
            interactions = []
            try:
                supabase = get_supabase_client()
                interaction_result = supabase.table('persona_interactions').select('*') \
                    .eq('persona_id', persona_id) \
                    .order('created_at.desc') \
                    .limit(5) \
                    .execute()
                if interaction_result.data:
                    interactions = interaction_result.data
            except Exception as e:
                logger.warning(f"Could not fetch interactions: {e}")

            return {
                "persona": persona,
                "interactions": interactions,
                "message": result["message"]
            }
        else:
            return {
                "persona": None,
                "error": result.get("error"),
                "message": result["message"]
            }