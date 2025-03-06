# User Guide: Real Estate Lead Generation AI Agents

This guide will help you effectively use the Real Estate Lead Generation AI Agents system to find and qualify leads for your real estate business.

## Getting Started

After completing the installation process, you can access the system through:

1. **Web Interface**: Navigate to `http://localhost:3000` in your browser
2. **API**: Send requests to `http://localhost:8000/api/v1`
3. **Command Line**: Use the CLI tools in the `src/cli` directory

## System Overview

The system consists of three main agent types:

1. **Buyer Lead Agents**: Find potential property buyers
2. **Seller Lead Agents**: Identify homeowners looking to sell
3. **Refinance Lead Agents**: Find homeowners who could benefit from refinancing

## Configuring Agents

### Setting Search Parameters

1. Navigate to the "Agent Configuration" section
2. Select the agent type you want to configure
3. Set parameters such as:
   - Geographic area (zip codes, cities, neighborhoods)
   - Property types (single-family, multi-family, condo, etc.)
   - Price ranges
   - Timeline (immediate, 3-6 months, 6-12 months)
   - Lead quality threshold

### Data Source Configuration

Configure which data sources each agent should use:

- Public records
- Social media monitoring
- Real estate listing sites
- Google/Facebook ads integration
- Mortgage data providers

## Running Agents

### Scheduled Operation

Set up agents to run on a schedule:

```bash
python src/cli/schedule_agent.py --type buyer --frequency daily --time "02:00"
```

### Manual Operation

Run agents on demand:

```bash
python src/cli/run_agent.py --type seller --area "90210,90211" --property-type "single-family"
```

## Managing Leads

### Lead Dashboard

The dashboard provides:

- Overview of all leads by type and status
- Lead quality scores
- Recommended actions
- Communication history

### Lead Qualification

Leads are automatically scored based on:

- Intent signals
- Timeline
- Financial qualification
- Communication engagement

### Lead Engagement

The system can automatically engage with leads:

1. **Email Sequences**: Configure in the "Communication" section
2. **SMS Follow-ups**: Requires SMS gateway configuration
3. **Social Media Engagement**: Requires social media account connections

## Analyzing Results

### Performance Metrics

Track key metrics:

- Leads generated per source
- Conversion rates
- Cost per lead
- Time to conversion

### Optimization

The system will suggest optimizations:

- Best performing data sources
- Most effective engagement strategies
- Recommended parameter adjustments

## Integrations

Connect with your existing tools:

- CRM systems (Salesforce, HubSpot, etc.)
- Email marketing platforms
- Property management software
- Document signing services

## Troubleshooting

### Common Issues

- **No Leads Generated**: Check geographic restrictions and quality thresholds
- **Low Quality Leads**: Adjust qualification parameters
- **API Rate Limiting**: Spread requests across longer timeframes

### Support

For additional help:

- Check the FAQ section
- Review logs in the `logs` directory
- Contact support at support@realestateleadagents.com 