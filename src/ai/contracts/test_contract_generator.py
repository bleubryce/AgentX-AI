"""
Tests for the ContractGenerator class
"""

import pytest
from datetime import datetime
from .contract_generator import ContractGenerator

@pytest.fixture
def contract_generator():
    """Create a ContractGenerator instance for testing."""
    return ContractGenerator()

@pytest.fixture
def sample_transaction_data():
    """Create sample transaction data for testing."""
    return {
        "buyer_name": "John Smith",
        "seller_name": "Jane Doe",
        "property_address": "123 Main St, Los Angeles, CA 90001",
        "price": "$950,000",
        "property_details": {
            "type": "single-family",
            "bedrooms": 3,
            "bathrooms": 2,
            "square_feet": 1800,
            "year_built": 1995
        },
        "financing": {
            "type": "conventional",
            "down_payment": "20%",
            "loan_amount": "$760,000"
        }
    }

@pytest.fixture
def sample_custom_terms():
    """Create sample custom terms for testing."""
    return [
        "Seller to provide home warranty",
        "Closing costs split 50/50",
        "Property inspection within 10 days"
    ]

@pytest.mark.asyncio
async def test_generate_standard_contract(
    contract_generator,
    sample_transaction_data
):
    """Test standard contract generation."""
    contract = await contract_generator.generate_contract(
        transaction_data=sample_transaction_data,
        contract_type="standard",
        state="CA"
    )
    
    # Check required fields
    assert all(key in contract for key in [
        "header", "parties", "property_details",
        "terms", "contingencies", "signatures",
        "generated_at", "contract_type", "state",
        "completeness_score"
    ])
    
    # Check data types
    assert isinstance(contract["header"], str)
    assert isinstance(contract["parties"], dict)
    assert isinstance(contract["property_details"], dict)
    assert isinstance(contract["terms"], list)
    assert isinstance(contract["contingencies"], list)
    assert isinstance(contract["signatures"], list)
    assert isinstance(contract["generated_at"], str)
    assert isinstance(contract["completeness_score"], float)
    assert 0 <= contract["completeness_score"] <= 1
    
    # Check content
    assert sample_transaction_data["buyer_name"] in contract["parties"].values()
    assert sample_transaction_data["property_address"] in contract["property_details"].values()

@pytest.mark.asyncio
async def test_generate_custom_contract(
    contract_generator,
    sample_transaction_data,
    sample_custom_terms
):
    """Test custom contract generation with custom terms."""
    contract = await contract_generator.generate_contract(
        transaction_data=sample_transaction_data,
        contract_type="custom",
        custom_terms=sample_custom_terms,
        state="CA"
    )
    
    # Check structure
    assert all(key in contract for key in [
        "header", "parties", "property_details",
        "terms", "contingencies", "signatures"
    ])
    
    # Check custom terms are included
    for term in sample_custom_terms:
        assert any(term.lower() in t.lower() for t in contract["terms"])

@pytest.mark.asyncio
async def test_generate_commercial_contract(
    contract_generator,
    sample_transaction_data
):
    """Test commercial contract generation."""
    # Modify transaction data for commercial property
    commercial_data = sample_transaction_data.copy()
    commercial_data["property_details"].update({
        "type": "commercial",
        "zoning": "C-1",
        "current_tenants": ["Store A", "Store B"],
        "annual_income": "$120,000"
    })
    
    contract = await contract_generator.generate_contract(
        transaction_data=commercial_data,
        contract_type="commercial",
        state="CA"
    )
    
    # Check structure
    assert all(key in contract for key in [
        "header", "parties", "property_details",
        "terms", "contingencies", "signatures"
    ])
    
    # Check commercial-specific content
    assert "zoning" in contract["property_details"]
    assert "tenants" in contract["property_details"]

@pytest.mark.asyncio
async def test_error_handling(contract_generator):
    """Test error handling with invalid data."""
    # Test with minimal transaction data
    minimal_data = {
        "buyer_name": "John Smith",
        "property_address": "123 Main St"
    }
    
    contract = await contract_generator.generate_contract(
        transaction_data=minimal_data
    )
    
    # Should return fallback contract
    assert all(key in contract for key in [
        "header", "parties", "property_details",
        "terms", "contingencies", "signatures"
    ])
    assert contract["completeness_score"] == 0.3  # Fallback score
    assert "Unknown" in contract["parties"].values() 