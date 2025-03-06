import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { AgentType, AgentStatus, AgentCapability, AgentConfig } from '@/services/agent/agent.types';

const formSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    description: z.string().optional(),
    type: z.nativeEnum(AgentType),
    capabilities: z.array(z.nativeEnum(AgentCapability)).min(1, 'Select at least one capability'),
    status: z.nativeEnum(AgentStatus),
    settings: z.record(z.any()).optional()
});

type FormData = z.infer<typeof formSchema>;

interface AgentFormProps {
    onSubmit: (data: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    initialData?: Partial<AgentConfig>;
}

export function AgentForm({ onSubmit, initialData }: AgentFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: initialData?.name || '',
            description: initialData?.description || '',
            type: initialData?.type || AgentType.LEAD_GENERATION,
            capabilities: initialData?.capabilities || [],
            status: initialData?.status || AgentStatus.INACTIVE,
            settings: initialData?.settings || {}
        }
    });

    const handleSubmit = async (data: FormData) => {
        try {
            setIsSubmitting(true);
            await onSubmit(data);
            form.reset();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{initialData ? 'Edit Agent' : 'Create New Agent'}</CardTitle>
                <CardDescription>
                    Configure your AI agent for lead generation and customer engagement
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter agent name" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        A unique name to identify your agent
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter agent description" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Optional description of the agent's purpose
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Type</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select agent type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {Object.values(AgentType).map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {type}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        The primary function of this agent
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="capabilities"
                            render={() => (
                                <FormItem>
                                    <FormLabel>Capabilities</FormLabel>
                                    <div className="grid grid-cols-2 gap-4">
                                        {Object.values(AgentCapability).map((capability) => (
                                            <FormField
                                                key={capability}
                                                control={form.control}
                                                name="capabilities"
                                                render={({ field }) => (
                                                    <FormItem
                                                        key={capability}
                                                        className="flex flex-row items-start space-x-3 space-y-0"
                                                    >
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={field.value?.includes(capability)}
                                                                onCheckedChange={(checked) => {
                                                                    const value = field.value || [];
                                                                    if (checked) {
                                                                        field.onChange([...value, capability]);
                                                                    } else {
                                                                        field.onChange(
                                                                            value.filter((val) => val !== capability)
                                                                        );
                                                                    }
                                                                }}
                                                            />
                                                        </FormControl>
                                                        <FormLabel className="font-normal">
                                                            {capability}
                                                        </FormLabel>
                                                    </FormItem>
                                                )}
                                            />
                                        ))}
                                    </div>
                                    <FormDescription>
                                        Select the capabilities this agent should have
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select agent status" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {Object.values(AgentStatus).map((status) => (
                                                <SelectItem key={status} value={status}>
                                                    {status}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        The current operational status of the agent
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {initialData ? 'Update Agent' : 'Create Agent'}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

export default AgentForm; 