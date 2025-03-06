import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { AgentList } from './AgentList';
import { AgentMetrics } from './AgentMetrics';
import { AgentForm } from './AgentForm';
import { AgentType, AgentStatus, AgentConfig } from '@/services/agent/agent.types';
import { agentService } from '@/services/agent/agent.service';

export function AgentDashboard() {
    const [agents, setAgents] = useState<AgentConfig[]>([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        loadAgents();
    }, []);

    const loadAgents = async () => {
        try {
            setIsLoading(true);
            const loadedAgents = await agentService.queryAgents();
            setAgents(loadedAgents);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to load agents. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateAgent = async (data: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            const newAgent = await agentService.createAgent(data);
            setAgents(prev => [...prev, newAgent]);
            toast({
                title: 'Success',
                description: 'Agent created successfully',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    const handleUpdateAgent = async (id: string, updates: Partial<AgentConfig>) => {
        try {
            const updatedAgent = await agentService.updateAgent(id, updates);
            if (updatedAgent) {
                setAgents(prev => prev.map(agent => 
                    agent.id === id ? updatedAgent : agent
                ));
                toast({
                    title: 'Success',
                    description: 'Agent updated successfully',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    const handleDeleteAgent = async (id: string) => {
        try {
            const success = await agentService.deleteAgent(id);
            if (success) {
                setAgents(prev => prev.filter(agent => agent.id !== id));
                toast({
                    title: 'Success',
                    description: 'Agent deleted successfully',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="container mx-auto p-6">
            <Card>
                <CardHeader>
                    <CardTitle>AI Agent Dashboard</CardTitle>
                    <CardDescription>
                        Manage and monitor your AI agents for lead generation and customer engagement
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="agents">Agents</TabsTrigger>
                            <TabsTrigger value="metrics">Metrics</TabsTrigger>
                            <TabsTrigger value="create">Create Agent</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Total Agents</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-2xl font-bold">{agents.length}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Active Agents</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-2xl font-bold">
                                            {agents.filter(a => a.status === AgentStatus.ACTIVE).length}
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Lead Generation</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-2xl font-bold">
                                            {agents.filter(a => a.type === AgentType.LEAD_GENERATION).length}
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Success Rate</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-2xl font-bold">85%</p>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="agents">
                            <AgentList
                                agents={agents}
                                onUpdate={handleUpdateAgent}
                                onDelete={handleDeleteAgent}
                                isLoading={isLoading}
                            />
                        </TabsContent>

                        <TabsContent value="metrics">
                            <AgentMetrics agents={agents} />
                        </TabsContent>

                        <TabsContent value="create">
                            <AgentForm onSubmit={handleCreateAgent} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}

export default AgentDashboard; 