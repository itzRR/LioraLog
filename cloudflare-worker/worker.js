/**
 * Cloudflare Worker for LioraLog - Gemini AI Integration
 * Provides intelligent features for research tracking
 */

// CORS headers for LioraLog
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow all origins for now, restrict later if needed
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      const body = await request.json();

      // Route to different AI features
      switch (path) {
        case '/chat':
          return await handleChat(body, env);
        case '/summarize':
          return await handleSummarize(body, env);
        case '/suggest':
          return await handleSuggest(body, env);
        case '/analyze-progress':
          return await handleAnalyzeProgress(body, env);
        case '/generate-report':
          return await handleGenerateReport(body, env);
        default:
          return jsonResponse({ error: 'Unknown endpoint' }, 404);
      }
    } catch (error) {
      return jsonResponse({ error: error.message }, 500);
    }
  }
};

// 1. Chat with Liora
async function handleChat(body, env) {
  console.log('handleChat called with:', JSON.stringify(body));
  
  const { message, conversationHistory = [] } = body;
  
  console.log('Message:', message);
  console.log('History length:', conversationHistory.length);

  const systemPrompt = `You are Liora, a friendly and encouraging AI research assistant for PhD students and researchers. 
Your personality:
- Warm, supportive, and empathetic
- Knowledgeable about research methodologies
- Encouraging but realistic about challenges
- Use casual, friendly language with occasional emojis ✨
- Keep responses concise (2-3 paragraphs max)

Help users with:
- Research planning and time management
- Dealing with research challenges
- Staying motivated
- Organizing their work
- Understanding their progress`;

  const prompt = buildConversationPrompt(systemPrompt, conversationHistory, message);
  console.log('Built prompt, calling Gemini...');
  
  try {
    const response = await callGemini(prompt, env.GEMINI_API_KEY);
    console.log('Gemini response received:', response.substring(0, 50) + '...');
    
    return jsonResponse({
      reply: response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in handleChat:', error.message);
    throw error;
  }
}

// 2. Summarize logs
async function handleSummarize(body, env) {
  const { logs, timeframe = 'week' } = body;

  const prompt = `As Liora, create a concise summary of these research logs from the past ${timeframe}.

Logs:
${logs.map(log => `Date: ${log.date}
Tasks: ${log.tasksCompleted}
Status: ${log.taskStatus}
${log.problems ? `Issues: ${log.problems}` : ''}
${log.feedback ? `Notes: ${log.feedback}` : ''}`).join('\n\n')}

Provide:
1. Key accomplishments (2-3 bullet points)
2. Main challenges faced
3. Overall progress assessment
4. One encouraging insight

Keep it under 150 words, friendly tone.`;

  const response = await callGemini(prompt, env.GEMINI_API_KEY);

  return jsonResponse({
    summary: response,
    logCount: logs.length,
    timeframe
  });
}

// 3. Suggest next steps
async function handleSuggest(body, env) {
  const { recentLogs, currentTasks, researchField } = body;

  const prompt = `As Liora, based on this researcher's recent activity, suggest 2-3 actionable next steps.

Research Field: ${researchField || 'General'}

Recent Activity:
${recentLogs.slice(0, 5).map(log => `- ${log.tasksCompleted} (${log.taskStatus})`).join('\n')}

Current Tasks:
${currentTasks.map(task => `- ${task.title} (${task.status}, deadline: ${task.deadline})`).join('\n')}

Provide 2-3 specific, actionable suggestions that:
- Address immediate priorities
- Consider their momentum
- Are realistic for the next 3-7 days

Format as numbered list, keep each suggestion to 1-2 sentences.`;

  const response = await callGemini(prompt, env.GEMINI_API_KEY);

  return jsonResponse({
    suggestions: response.split('\n').filter(line => line.trim()),
    generatedAt: new Date().toISOString()
  });
}

// 4. Analyze progress patterns
async function handleAnalyzeProgress(body, env) {
  const { logs, startDate, endDate } = body;

  const prompt = `As Liora, analyze this research progress data and provide insights.

Period: ${startDate} to ${endDate}
Total Logs: ${logs.length}

Activity Pattern:
${logs.map(log => `${log.date}: ${log.taskStatus} (mood: ${log.moodRating || 'N/A'}/5)`).join('\n')}

Analyze:
1. Productivity trends (are they improving, consistent, or declining?)
2. Mood patterns (any correlation with productivity?)
3. Work consistency (gaps, streaks, patterns)
4. One key strength in their approach
5. One gentle suggestion for improvement

Be encouraging and constructive. Keep under 200 words.`;

  const response = await callGemini(prompt, env.GEMINI_API_KEY);

  return jsonResponse({
    analysis: response,
    periodCovered: { startDate, endDate },
    dataPoints: logs.length
  });
}

// 5. Generate formatted progress report
async function handleGenerateReport(body, env) {
  const { logs, tasks, projectTitle, recipientType = 'supervisor' } = body;

  const prompt = `Create a professional progress report for a ${recipientType}.

Project: ${projectTitle}
Period: Last ${logs.length} log entries

Logs Summary:
${logs.slice(0, 10).map(log => `- ${log.date}: ${log.tasksCompleted}`).join('\n')}

Tasks Overview:
- Total: ${tasks.length}
- Completed: ${tasks.filter(t => t.status === 'completed').length}
- In Progress: ${tasks.filter(t => t.status === 'in_progress').length}
- Blocked: ${tasks.filter(t => t.status === 'blocked').length}

Generate a formal report with:
## Progress Summary
[1-2 paragraphs overview]

## Key Achievements
[3-5 bullet points]

## Current Focus
[What they're working on now]

## Challenges & Solutions
[If any issues, how they're being addressed]

## Next Steps
[Planned activities]

Keep professional but not overly formal. Total: ~300-400 words.`;

  const response = await callGemini(prompt, env.GEMINI_API_KEY);

  return jsonResponse({
    report: response,
    generatedAt: new Date().toISOString(),
    projectTitle
  });
}

// Helper: Call Gemini API
async function callGemini(prompt, apiKey) {
  console.log('callGemini: Making request to Gemini API');
  console.log('Prompt length:', prompt.length);
  console.log('API key exists:', !!apiKey);
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
  
  const requestBody = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    }
  };
  
  console.log('Request body:', JSON.stringify(requestBody).substring(0, 200));
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  console.log('Gemini API response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error response:', errorText);
    throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Gemini API success, response data:', JSON.stringify(data).substring(0, 200));
  
  return data.candidates[0].content.parts[0].text;
}

// Helper: Build conversation prompt
function buildConversationPrompt(systemPrompt, history, newMessage) {
  let prompt = systemPrompt + '\n\n';
  
  // Add conversation history (last 5 messages)
  const recentHistory = history.slice(-5);
  recentHistory.forEach(msg => {
    prompt += `${msg.role === 'user' ? 'User' : 'Liora'}: ${msg.content}\n`;
  });
  
  prompt += `User: ${newMessage}\nLiora:`;
  return prompt;
}

// Helper: JSON response with CORS
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}
