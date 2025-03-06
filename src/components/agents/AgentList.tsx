import { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MoreVertical, Play, Pause, Trash } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AgentConfig, AgentStatus, AgentType } from '@/services/agent/agent.types';

interface AgentListProps {
    agents: AgentConfig[];
    onUpdate: (id: string, updates: Partial<AgentConfig>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    isLoading: boolean;
}

export function AgentList({ agents, onUpdate, onDelete, isLoading }: AgentListProps) {
    const [deleteAgent, setDeleteAgent] = useState<string | null>(null);
    const [actionInProgress, setActionInProgress] = useState<string | null>(null);

    const handleStatusToggle = async (agent: AgentConfig) => {
        try {
            setActionInProgress(agent.id);
            const newStatus = agent.status === AgentStatus.ACTIVE
                ? AgentStatus.INACTIVE
                : AgentStatus.ACTIVE;
            await onUpdate(agent.id, { status: newStatus });
        } finally {
            setActionInProgress(null);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            setActionInProgress(id);
            await onDelete(id);
            setDeleteAgent(null);
        } finally {
            setActionInProgress(null);
        }
    };

    const getStatusBadge = (status: AgentStatus) => {
        const variants = {
            [AgentStatus.ACTIVE]: 'bg-green-500',
            [AgentStatus.INACTIVE]: 'bg-gray-500',
            [AgentStatus.TRAINING]: 'bg-blue-500',
            [AgentStatus.ERROR]: 'bg-red-500',
        };

        return (
            <Badge className={variants[status]}>
                {status}
            </Badge>
        );
    };

    const getTypeBadge = (type: AgentType) => {
        const variants = {
            [AgentType.LEAD_GENERATION]: 'bg-purple-500',
            [AgentType.CUSTOMER_SERVICE]: 'bg-blue-500',
            [AgentType.SALES]: 'bg-green-500',
            [AgentType.MARKET_RESEARCH]: 'bg-orange-500',
        };

        return (
            <Badge className={variants[type]}>
                {type}
            </Badge>
        );
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {agents.map((agent) => (
                        <TableRow key={agent.id}>
                            <TableCell className="font-medium">{agent.name}</TableCell>
                            <TableCell>{getTypeBadge(agent.type)}</TableCell>
                            <TableCell>{getStatusBadge(agent.status)}</TableCell>
                            <TableCell>
                                {new Date(agent.updatedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => handleStatusToggle(agent)}
                                            disabled={actionInProgress === agent.id}
                                        >
                                            {agent.status === AgentStatus.ACTIVE ? (
                                                <>
                                                    <Pause className="mr-2 h-4 w-4" />
                                                    Pause Agent
                                                </>
                                            ) : (
                                                <>
                                                    <Play className="mr-2 h-4 w-4" />
                                                    Activate Agent
                                                </>
                                            )}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => setDeleteAgent(agent.id)}
                                            className="text-red-600"
                                            disabled={actionInProgress === agent.id}
                                        >
                                            <Trash className="mr-2 h-4 w-4" />
                                            Delete Agent
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <AlertDialog open={!!deleteAgent} onOpenChange={() => setDeleteAgent(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the
                            agent and all of its data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteAgent && handleDelete(deleteAgent)}
                            className="bg-red-600"
                        >
                            {actionInProgress === deleteAgent ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Trash className="mr-2 h-4 w-4" />
                            )}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default AgentList; 