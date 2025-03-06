#!/usr/bin/env python3
"""
Command Line Interface for the Real Estate Lead Generation AI Agents
"""

import os
import sys
import json
import argparse
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

# Add parent directory to path to allow imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# Import agent manager and configuration
from src.core.agent_manager import get_agent_manager
from src.core.config import (
    AgentConfig, BuyerAgentConfig, SellerAgentConfig, RefinanceAgentConfig,
    DataSourceConfig, GeographicConfig, PropertyConfig,
    DEFAULT_BUYER_CONFIG, DEFAULT_SELLER_CONFIG, DEFAULT_REFINANCE_CONFIG
)
from src.data.lead_repository import LeadRepository

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("AgentCLI")

def create_agent(args):
    """Create a new agent"""
    agent_manager = get_agent_manager()
    
    # Validate agent type
    if args.type not in ["buyer", "seller", "refinance"]:
        logger.error(f"Invalid agent type: {args.type}")
        return
    
    # Create agent config based on type
    if args.type == "buyer":
        config = DEFAULT_BUYER_CONFIG.copy(deep=True)
    elif args.type == "seller":
        config = DEFAULT_SELLER_CONFIG.copy(deep=True)
    else:  # refinance
        config = DEFAULT_REFINANCE_CONFIG.copy(deep=True)
    
    # Update with provided arguments
    config.name = args.name
    if args.description:
        config.description = args.description
    
    # Update geographic config if provided
    if args.zip_codes:
        config.geographic.zip_codes = args.zip_codes.split(',')
    if args.cities:
        config.geographic.cities = args.cities.split(',')
    if args.states:
        config.geographic.states = args.states.split(',')
    
    # Update property config if provided
    if args.property_types:
        config.property.types = args.property_types.split(',')
    if args.min_price:
        config.property.min_price = args.min_price
    if args.max_price:
        config.property.max_price = args.max_price
    if args.min_beds:
        config.property.min_beds = args.min_beds
    if args.max_beds:
        config.property.max_beds = args.max_beds
    
    # Create the agent
    agent_id = agent_manager.create_agent(args.type, config)
    logger.info(f"Created {args.type} agent with ID {agent_id}")
    
    # Print agent details
    status = agent_manager.get_agent_status(args.type, agent_id)
    print(json.dumps(status, indent=2, default=str))

def list_agents(args):
    """List all agents or filter by type"""
    agent_manager = get_agent_manager()
    
    # Get agent status
    status = agent_manager.get_agent_status(args.type)
    
    # Format and print
    if args.type:
        # Single type
        print(f"=== {args.type.capitalize()} Agents ===")
        for agent_id, agent_info in status.items():
            print(f"ID: {agent_id}")
            print(f"Name: {agent_info.get('config', {}).get('name', 'Unnamed Agent')}")
            print(f"Description: {agent_info.get('config', {}).get('description', 'No description')}")
            print(f"Lead Count: {agent_info.get('lead_count', 0)}")
            print(f"Scheduled: {agent_info.get('scheduled', False)}")
            print("---")
    else:
        # All types
        for agent_type, agents_of_type in status.items():
            print(f"=== {agent_type.capitalize()} Agents ===")
            for agent_id, agent_info in agents_of_type.items():
                print(f"ID: {agent_id}")
                print(f"Name: {agent_info.get('config', {}).get('name', 'Unnamed Agent')}")
                print(f"Description: {agent_info.get('config', {}).get('description', 'No description')}")
                print(f"Lead Count: {agent_info.get('lead_count', 0)}")
                print(f"Scheduled: {agent_info.get('scheduled', False)}")
                print("---")

def run_agent(args):
    """Run an agent to generate leads"""
    agent_manager = get_agent_manager()
    
    try:
        leads = agent_manager.run_agent(args.type, args.id)
        logger.info(f"Agent {args.id} generated {len(leads)} leads")
        
        if args.verbose:
            print(json.dumps(leads, indent=2, default=str))
        else:
            print(f"Generated {len(leads)} leads")
    except ValueError as e:
        logger.error(str(e))
    except Exception as e:
        logger.error(f"Error running agent: {str(e)}")

def schedule_agent(args):
    """Schedule an agent to run on a recurring basis"""
    agent_manager = get_agent_manager()
    
    try:
        agent_manager.schedule_agent(args.type, args.id, args.frequency, args.time)
        logger.info(f"Agent {args.id} scheduled to run {args.frequency}")
    except ValueError as e:
        logger.error(str(e))
    except Exception as e:
        logger.error(f"Error scheduling agent: {str(e)}")

def stop_agent(args):
    """Stop a scheduled agent"""
    agent_manager = get_agent_manager()
    
    try:
        agent_manager.stop_agent(args.type, args.id)
        logger.info(f"Agent {args.id} stopped")
    except Exception as e:
        logger.error(f"Error stopping agent: {str(e)}")

def list_leads(args):
    """List leads with optional filtering"""
    lead_repo = LeadRepository()
    
    leads = lead_repo.get_leads(
        agent_type=args.type,
        agent_id=args.agent_id,
        start_date=args.start_date,
        end_date=args.end_date,
        limit=args.limit,
        offset=args.offset
    )
    
    if args.format == "json":
        print(json.dumps(leads, indent=2, default=str))
    else:
        print(f"=== Leads ({len(leads)}) ===")
        for lead in leads:
            print(f"ID: {lead.get('_id', 'Unknown')}")
            print(f"Name: {lead.get('first_name', '')} {lead.get('last_name', '')}")
            print(f"Email: {lead.get('email', 'No email')}")
            print(f"Phone: {lead.get('phone', 'No phone')}")
            print(f"Type: {lead.get('lead_type', 'Unknown')}")
            print(f"Status: {lead.get('lead_status', 'Unknown')}")
            print(f"Score: {lead.get('lead_score', 0):.2f}")
            print(f"Source: {lead.get('source', 'Unknown')}")
            print(f"Created: {lead.get('created_at', 'Unknown')}")
            print("---")

def export_leads(args):
    """Export leads to a file"""
    lead_repo = LeadRepository()
    
    leads = lead_repo.get_leads(
        agent_type=args.type,
        agent_id=args.agent_id,
        start_date=args.start_date,
        end_date=args.end_date,
        limit=args.limit,
        offset=args.offset
    )
    
    if not leads:
        logger.warning("No leads to export")
        return
    
    # Determine output format
    if args.format == "json":
        # Export to JSON
        with open(args.output, 'w') as f:
            json.dump(leads, f, indent=2, default=str)
    elif args.format == "csv":
        # Export to CSV
        import csv
        
        # Get all possible field names
        fieldnames = set()
        for lead in leads:
            fieldnames.update(lead.keys())
        
        fieldnames = sorted(list(fieldnames))
        
        with open(args.output, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(leads)
    
    logger.info(f"Exported {len(leads)} leads to {args.output}")

def main():
    """Main entry point for the CLI"""
    parser = argparse.ArgumentParser(description="Real Estate Lead Generation AI Agents CLI")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Create agent command
    create_parser = subparsers.add_parser("create", help="Create a new agent")
    create_parser.add_argument("--type", "-t", required=True, choices=["buyer", "seller", "refinance"], help="Type of agent")
    create_parser.add_argument("--name", "-n", required=True, help="Name of the agent")
    create_parser.add_argument("--description", "-d", help="Description of the agent")
    create_parser.add_argument("--zip-codes", help="Comma-separated list of ZIP codes")
    create_parser.add_argument("--cities", help="Comma-separated list of cities")
    create_parser.add_argument("--states", help="Comma-separated list of states")
    create_parser.add_argument("--property-types", help="Comma-separated list of property types")
    create_parser.add_argument("--min-price", type=int, help="Minimum property price")
    create_parser.add_argument("--max-price", type=int, help="Maximum property price")
    create_parser.add_argument("--min-beds", type=int, help="Minimum number of bedrooms")
    create_parser.add_argument("--max-beds", type=int, help="Maximum number of bedrooms")
    create_parser.set_defaults(func=create_agent)
    
    # List agents command
    list_parser = subparsers.add_parser("list", help="List agents")
    list_parser.add_argument("--type", "-t", choices=["buyer", "seller", "refinance"], help="Filter by agent type")
    list_parser.set_defaults(func=list_agents)
    
    # Run agent command
    run_parser = subparsers.add_parser("run", help="Run an agent")
    run_parser.add_argument("--type", "-t", required=True, choices=["buyer", "seller", "refinance"], help="Type of agent")
    run_parser.add_argument("--id", "-i", required=True, help="ID of the agent")
    run_parser.add_argument("--verbose", "-v", action="store_true", help="Print detailed output")
    run_parser.set_defaults(func=run_agent)
    
    # Schedule agent command
    schedule_parser = subparsers.add_parser("schedule", help="Schedule an agent")
    schedule_parser.add_argument("--type", "-t", required=True, choices=["buyer", "seller", "refinance"], help="Type of agent")
    schedule_parser.add_argument("--id", "-i", required=True, help="ID of the agent")
    schedule_parser.add_argument("--frequency", "-f", required=True, choices=["hourly", "daily", "weekly"], help="How often to run")
    schedule_parser.add_argument("--time", help="Time to run (for daily/weekly), format: HH:MM")
    schedule_parser.set_defaults(func=schedule_agent)
    
    # Stop agent command
    stop_parser = subparsers.add_parser("stop", help="Stop a scheduled agent")
    stop_parser.add_argument("--type", "-t", required=True, choices=["buyer", "seller", "refinance"], help="Type of agent")
    stop_parser.add_argument("--id", "-i", required=True, help="ID of the agent")
    stop_parser.set_defaults(func=stop_agent)
    
    # List leads command
    leads_parser = subparsers.add_parser("leads", help="List leads")
    leads_parser.add_argument("--type", "-t", choices=["buyer", "seller", "refinance"], help="Filter by agent type")
    leads_parser.add_argument("--agent-id", "-a", help="Filter by agent ID")
    leads_parser.add_argument("--start-date", help="Filter by start date (ISO format)")
    leads_parser.add_argument("--end-date", help="Filter by end date (ISO format)")
    leads_parser.add_argument("--limit", "-l", type=int, default=100, help="Maximum number of leads to return")
    leads_parser.add_argument("--offset", "-o", type=int, default=0, help="Number of leads to skip")
    leads_parser.add_argument("--format", "-f", choices=["text", "json"], default="text", help="Output format")
    leads_parser.set_defaults(func=list_leads)
    
    # Export leads command
    export_parser = subparsers.add_parser("export", help="Export leads to a file")
    export_parser.add_argument("--type", "-t", choices=["buyer", "seller", "refinance"], help="Filter by agent type")
    export_parser.add_argument("--agent-id", "-a", help="Filter by agent ID")
    export_parser.add_argument("--start-date", help="Filter by start date (ISO format)")
    export_parser.add_argument("--end-date", help="Filter by end date (ISO format)")
    export_parser.add_argument("--limit", "-l", type=int, default=1000, help="Maximum number of leads to return")
    export_parser.add_argument("--offset", "-o", type=int, default=0, help="Number of leads to skip")
    export_parser.add_argument("--format", "-f", choices=["json", "csv"], default="csv", help="Output format")
    export_parser.add_argument("--output", required=True, help="Output file path")
    export_parser.set_defaults(func=export_leads)
    
    # Parse arguments
    args = parser.parse_args()
    
    # Run the appropriate function
    if hasattr(args, "func"):
        args.func(args)
    else:
        parser.print_help()

if __name__ == "__main__":
    main() 