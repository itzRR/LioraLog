/**
 * Gemini AI Client - Frontend integration with Cloudflare Worker
 */

// Production worker URL - Change this if you redeploy to a different worker
const WORKER_URL = 'https://liora-ai-worker.slhunterr.workers.dev';

// For local development, you can use 'http://localhost:8787' if running worker locally
// const WORKER_URL = 'http://localhost:8787';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface LogEntry {
  date: string;
  tasksCompleted: string;
  taskStatus: 'todo' | 'inprogress' | 'done';
  problems?: string;
  feedback?: string;
  moodRating?: number;
}

export interface Task {
  title: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  deadline: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Chat with Liora AI
 */
export async function chatWithLiora(
  message: string,
  conversationHistory: ChatMessage[] = []
): Promise<string> {
  try {
    const response = await fetch(`${WORKER_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversationHistory
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get response from Liora');
    }

    const data = await response.json();
    return data.reply;
  } catch (error) {
    console.error('Chat error:', error);
    throw error;
  }
}

/**
 * Get AI summary of logs
 */
export async function getSummary(
  logs: LogEntry[],
  timeframe: 'day' | 'week' | 'month' = 'week'
): Promise<string> {
  try {
    const response = await fetch(`${WORKER_URL}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        logs,
        timeframe
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate summary');
    }

    const data = await response.json();
    return data.summary;
  } catch (error) {
    console.error('Summary error:', error);
    throw error;
  }
}

/**
 * Get AI suggestions for next steps
 */
export async function getSuggestions(
  recentLogs: LogEntry[],
  currentTasks: Task[],
  researchField?: string
): Promise<string[]> {
  try {
    const response = await fetch(`${WORKER_URL}/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recentLogs,
        currentTasks,
        researchField
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get suggestions');
    }

    const data = await response.json();
    return data.suggestions;
  } catch (error) {
    console.error('Suggestions error:', error);
    throw error;
  }
}

/**
 * Analyze progress patterns
 */
export async function analyzeProgress(
  logs: LogEntry[],
  startDate: string,
  endDate: string
): Promise<string> {
  try {
    const response = await fetch(`${WORKER_URL}/analyze-progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        logs,
        startDate,
        endDate
      })
    });

    if (!response.ok) {
      throw new Error('Failed to analyze progress');
    }

    const data = await response.json();
    return data.analysis;
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
}

/**
 * Generate progress report
 */
export async function generateReport(
  logs: LogEntry[],
  tasks: Task[],
  projectTitle: string,
  recipientType: 'supervisor' | 'self' | 'committee' = 'supervisor'
): Promise<string> {
  try {
    const response = await fetch(`${WORKER_URL}/generate-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        logs,
        tasks,
        projectTitle,
        recipientType
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate report');
    }

    const data = await response.json();
    return data.report;
  } catch (error) {
    console.error('Report generation error:', error);
    throw error;
  }
}

/**
 * Check if Gemini service is available
 */
export async function checkGeminiStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${WORKER_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'ping',
        conversationHistory: []
      })
    });
    return response.ok;
  } catch {
    return false;
  }
}
