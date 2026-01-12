export interface Message {
  id: number;
  sender: 'whistleblower' | 'ai' | 'compliance';
  content: string;
  created_at: string;
}

export interface Case {
  id: number;
  token: string;
  status: string;
  risk_category?: 'green' | 'yellow' | 'red';
  initial_report: string;
  ai_assessment?: string;
  is_complete: boolean;
  created_at: string;
  messages: Message[];
}
