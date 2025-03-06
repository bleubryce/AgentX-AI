import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AgentConfig, AgentStats, AgentType } from '@/services/agent/agent.types';
import { agentService } from '@/services/agent/agent.service';
import { Loader2 } from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

interface AgentMetricsProps {
    agents: AgentConfig[];
}

interface AggregatedStats {
    totalExecutions: number;
    successRate: number;
    averageProcessingTime: number;
    executionsByType: Record<AgentType, number>;
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];

export function AgentMetrics({ agents }: AgentMetricsProps) {
    const [stats, setStats] = useState<Record<string, AgentStats>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [aggregatedStats, setAggregatedStats] = useState<AggregatedStats>({
        totalExecutions: 0,
        successRate: 0,
        averageProcessingTime: 0,
        executionsByType: {
            [AgentType.LEAD_GENERATION]: 0,
            [AgentType.CUSTOMER_SERVICE]: 0,
            [AgentType.SALES]: 0,
            [AgentType.MARKET_RESEARCH]: 0
        }
    });

    useEffect(() => {
        loadStats();
    }, [agents]);

    const loadStats = async () => {
        try {
            setIsLoading(true);
            const statsPromises = agents.map(agent => agentService.getAgentStats(agent.id));
            const agentStats = await Promise.all(statsPromises);
            
            const newStats: Record<string, AgentStats> = {};
            agents.forEach((agent, index) => {
                if (agentStats[index]) {
                    newStats[agent.id] = agentStats[index];
                }
            });
            
            setStats(newStats);
            calculateAggregatedStats(newStats);
        } catch (error) {
            console.error('Failed to load agent stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const calculateAggregatedStats = (agentStats: Record<string, AgentStats>) => {
        const executionsByType: Record<AgentType, number> = {
            [AgentType.LEAD_GENERATION]: 0,
            [AgentType.CUSTOMER_SERVICE]: 0,
            [AgentType.SALES]: 0,
            [AgentType.MARKET_RESEARCH]: 0
        };

        let totalExecutions = 0;
        let totalSuccessful = 0;
        let totalProcessingTime = 0;

        agents.forEach(agent => {
            const stat = agentStats[agent.id];
            if (stat) {
                executionsByType[agent.type] += stat.totalExecutions;
                totalExecutions += stat.totalExecutions;
                totalSuccessful += stat.successfulExecutions;
                totalProcessingTime += stat.averageProcessingTime * stat.totalExecutions;
            }
        });

        setAggregatedStats({
            totalExecutions,
            successRate: totalExecutions > 0 ? (totalSuccessful / totalExecutions) * 100 : 0,
            averageProcessingTime: totalExecutions > 0 ? totalProcessingTime / totalExecutions : 0,
            executionsByType
        });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    const executionsByTypeData = Object.entries(aggregatedStats.executionsByType).map(([type, count]) => ({
        type,
        value: count
    }));

    const performanceData = agents.map(agent => {
        const stat = stats[agent.id];
        return {
            name: agent.name,
            successRate: stat ? (stat.successfulExecutions / stat.totalExecutions) * 100 : 0,
            processingTime: stat?.averageProcessingTime || 0
        };
    });

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Total Executions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{aggregatedStats.totalExecutions}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Success Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">
                            {aggregatedStats.successRate.toFixed(1)}%
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Avg. Processing Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">
                            {(aggregatedStats.averageProcessingTime / 1000).toFixed(2)}s
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Active Agents</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{agents.length}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Executions by Agent Type</CardTitle>
                        <CardDescription>Distribution of agent executions by type</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={executionsByTypeData}
                                    dataKey="value"
                                    nameKey="type"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label
                                >
                                    {executionsByTypeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Agent Performance</CardTitle>
                        <CardDescription>Success rate and processing time by agent</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={performanceData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis yAxisId="left" />
                                <YAxis yAxisId="right" orientation="right" />
                                <Tooltip />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="successRate"
                                    stroke="#8b5cf6"
                                    name="Success Rate (%)"
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="processingTime"
                                    stroke="#10b981"
                                    name="Processing Time (ms)"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default AgentMetrics; 