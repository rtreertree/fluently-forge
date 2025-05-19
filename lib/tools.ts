// Add interface for tools
interface Tool {
  type: 'function';
  name: string;
  description: string;
  parameters?: {
    type: string;
    properties: Record<string, {
      type: string;
      description: string;
    }>;
  };
}

export type { Tool };