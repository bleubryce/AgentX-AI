"""
AI Contract Template Generator for Real Estate
"""

from typing import Dict, List, Optional
import openai
from datetime import datetime
from ..config import (
    OPENAI_API_KEY,
    GPT_MODEL,
    TEMPERATURE,
    MAX_TOKENS,
    CONTRACT_TEMPLATE
)

class ContractGenerator:
    """AI-powered contract template generator for real estate transactions."""
    
    def __init__(self):
        """Initialize the contract generator with OpenAI API."""
        openai.api_key = OPENAI_API_KEY
        self.model = GPT_MODEL
        self.temperature = TEMPERATURE
        self.max_tokens = MAX_TOKENS
    
    async def generate_contract(
        self,
        transaction_data: Dict,
        contract_type: str = "standard",
        custom_terms: Optional[List[str]] = None,
        state: str = "CA"
    ) -> Dict:
        """
        Generate a customized real estate contract.
        
        Args:
            transaction_data: Dictionary containing transaction details
            contract_type: Type of contract ("standard", "custom", "commercial")
            custom_terms: Optional list of custom terms to include
            state: State for contract jurisdiction
            
        Returns:
            Dict containing contract content and metadata
        """
        try:
            # Prepare context for GPT
            context = self._prepare_context(
                transaction_data, contract_type, custom_terms, state
            )
            
            # Generate contract content
            response = await openai.ChatCompletion.acreate(
                model=self.model,
                messages=[
                    {"role": "system", "content": self._get_system_prompt(contract_type)},
                    {"role": "user", "content": context}
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            
            # Parse and structure the response
            contract = self._parse_response(response.choices[0].message.content)
            
            # Add metadata
            contract.update({
                "generated_at": datetime.now().isoformat(),
                "contract_type": contract_type,
                "state": state,
                "completeness_score": self._calculate_completeness(contract)
            })
            
            return contract
            
        except Exception as e:
            print(f"Error generating contract: {str(e)}")
            return self._generate_fallback_contract(transaction_data)
    
    def _prepare_context(
        self,
        transaction_data: Dict,
        contract_type: str,
        custom_terms: Optional[List[str]],
        state: str
    ) -> str:
        """Prepare context for GPT prompt."""
        context_parts = [
            f"Transaction Type: {contract_type}",
            f"State: {state}",
            "\nTransaction Details:"
        ]
        
        # Add transaction details
        for key, value in transaction_data.items():
            if isinstance(value, dict):
                context_parts.append(f"\n{key.title()}:")
                for subkey, subvalue in value.items():
                    context_parts.append(f"{subkey}: {subvalue}")
            else:
                context_parts.append(f"{key}: {value}")
        
        # Add custom terms if provided
        if custom_terms:
            context_parts.append("\nCustom Terms:")
            for term in custom_terms:
                context_parts.append(f"- {term}")
        
        return "\n".join(context_parts)
    
    def _get_system_prompt(self, contract_type: str) -> str:
        """Get the system prompt for GPT based on contract type."""
        base_prompt = """
        You are an AI real estate contract generator. Your task is to create a legally compliant contract.
        Include:
        1. Standard contract sections
        2. Property details
        3. Transaction terms
        4. Payment schedules
        5. Contingencies
        """
        
        if contract_type == "custom":
            return base_prompt + """
            Additionally include:
            - Custom terms and conditions
            - Specific contingencies
            - Unique payment arrangements
            - Special provisions
            """
        elif contract_type == "commercial":
            return base_prompt + """
            Additionally include:
            - Commercial property specifics
            - Zoning requirements
            - Environmental considerations
            - Tenant information
            - Business terms
            """
        else:  # standard
            return base_prompt + """
            Follow standard residential contract format with:
            - Standard contingencies
            - Typical payment terms
            - Common provisions
            """
    
    def _parse_response(self, response: str) -> Dict:
        """Parse GPT response into structured contract data."""
        sections = {
            "header": "",
            "parties": {},
            "property_details": {},
            "terms": [],
            "contingencies": [],
            "signatures": []
        }
        
        current_section = None
        for line in response.split("\n"):
            line = line.strip()
            if not line:
                continue
                
            if line.lower().startswith("header:"):
                current_section = "header"
                continue
            elif line.lower().startswith("parties:"):
                current_section = "parties"
                continue
            elif line.lower().startswith("property:"):
                current_section = "property_details"
                continue
            elif line.lower().startswith("terms:"):
                current_section = "terms"
                continue
            elif line.lower().startswith("contingencies:"):
                current_section = "contingencies"
                continue
            elif line.lower().startswith("signatures:"):
                current_section = "signatures"
                continue
            
            if current_section == "header":
                sections["header"] += line + "\n"
            elif current_section == "parties":
                if ":" in line:
                    key, value = line.split(":", 1)
                    sections["parties"][key.strip()] = value.strip()
            elif current_section == "property_details":
                if ":" in line:
                    key, value = line.split(":", 1)
                    sections["property_details"][key.strip()] = value.strip()
            elif current_section == "terms":
                if line.startswith("-"):
                    sections["terms"].append(line[1:].strip())
            elif current_section == "contingencies":
                if line.startswith("-"):
                    sections["contingencies"].append(line[1:].strip())
            elif current_section == "signatures":
                if line.startswith("-"):
                    sections["signatures"].append(line[1:].strip())
        
        return sections
    
    def _calculate_completeness(self, contract: Dict) -> float:
        """Calculate completeness score for the contract."""
        score = 0.0
        
        # Check required sections
        required_sections = [
            "header", "parties", "property_details",
            "terms", "contingencies", "signatures"
        ]
        
        for section in required_sections:
            if section in contract:
                if section in ["parties", "property_details"]:
                    if contract[section]:
                        score += 0.2
                else:
                    if contract[section]:
                        score += 0.15
        
        return min(score, 1.0)
    
    def _generate_fallback_contract(self, transaction_data: Dict) -> Dict:
        """Generate a basic fallback contract."""
        return {
            "header": "REAL ESTATE CONTRACT",
            "parties": {
                "buyer": transaction_data.get("buyer_name", "Unknown"),
                "seller": transaction_data.get("seller_name", "Unknown")
            },
            "property_details": {
                "address": transaction_data.get("property_address", "Unknown"),
                "price": transaction_data.get("price", "Unknown")
            },
            "terms": ["Standard terms apply"],
            "contingencies": ["Standard contingencies apply"],
            "signatures": ["Signature lines to be added"],
            "generated_at": datetime.now().isoformat(),
            "contract_type": "standard",
            "state": "CA",
            "completeness_score": 0.3
        } 