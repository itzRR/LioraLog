var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  // Allow all origins for now, restrict later if needed
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
var worker_default = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      const body = await request.json();
      switch (path) {
        case "/chat":
          return await handleChat(body, env);
        case "/summarize":
          return await handleSummarize(body, env);
        case "/suggest":
          return await handleSuggest(body, env);
        case "/analyze-progress":
          return await handleAnalyzeProgress(body, env);
        case "/generate-report":
          return await handleGenerateReport(body, env);
        default:
          return jsonResponse({ error: "Unknown endpoint" }, 404);
      }
    } catch (error) {
      return jsonResponse({ error: error.message }, 500);
    }
  }
};
async function handleChat(body, env) {
  const { message, conversationHistory = [] } = body;
  const systemPrompt = `You are Liora, a friendly and encouraging AI research assistant for PhD students and researchers. 
Your personality:
- Warm, supportive, and empathetic
- Knowledgeable about research methodologies
- Encouraging but realistic about challenges
- Use casual, friendly language with occasional emojis \u2728
- Keep responses concise (2-3 paragraphs max)

Help users with:
- Research planning and time management
- Dealing with research challenges
- Staying motivated
- Organizing their work
- Understanding their progress`;
  const prompt = buildConversationPrompt(systemPrompt, conversationHistory, message);
  const response = await callGemini(prompt, env.GEMINI_API_KEY);
  return jsonResponse({
    reply: response,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
}
__name(handleChat, "handleChat");
async function handleSummarize(body, env) {
  const { logs, timeframe = "week" } = body;
  const prompt = `As Liora, create a concise summary of these research logs from the past ${timeframe}.

Logs:
${logs.map((log) => `Date: ${log.date}
Tasks: ${log.tasksCompleted}
Status: ${log.taskStatus}
${log.problems ? `Issues: ${log.problems}` : ""}
${log.feedback ? `Notes: ${log.feedback}` : ""}`).join("\n\n")}

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
__name(handleSummarize, "handleSummarize");
async function handleSuggest(body, env) {
  const { recentLogs, currentTasks, researchField } = body;
  const prompt = `As Liora, based on this researcher's recent activity, suggest 2-3 actionable next steps.

Research Field: ${researchField || "General"}

Recent Activity:
${recentLogs.slice(0, 5).map((log) => `- ${log.tasksCompleted} (${log.taskStatus})`).join("\n")}

Current Tasks:
${currentTasks.map((task) => `- ${task.title} (${task.status}, deadline: ${task.deadline})`).join("\n")}

Provide 2-3 specific, actionable suggestions that:
- Address immediate priorities
- Consider their momentum
- Are realistic for the next 3-7 days

Format as numbered list, keep each suggestion to 1-2 sentences.`;
  const response = await callGemini(prompt, env.GEMINI_API_KEY);
  return jsonResponse({
    suggestions: response.split("\n").filter((line) => line.trim()),
    generatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
}
__name(handleSuggest, "handleSuggest");
async function handleAnalyzeProgress(body, env) {
  const { logs, startDate, endDate } = body;
  const prompt = `As Liora, analyze this research progress data and provide insights.

Period: ${startDate} to ${endDate}
Total Logs: ${logs.length}

Activity Pattern:
${logs.map((log) => `${log.date}: ${log.taskStatus} (mood: ${log.moodRating || "N/A"}/5)`).join("\n")}

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
__name(handleAnalyzeProgress, "handleAnalyzeProgress");
async function handleGenerateReport(body, env) {
  const { logs, tasks, projectTitle, recipientType = "supervisor" } = body;
  const prompt = `Create a professional progress report for a ${recipientType}.

Project: ${projectTitle}
Period: Last ${logs.length} log entries

Logs Summary:
${logs.slice(0, 10).map((log) => `- ${log.date}: ${log.tasksCompleted}`).join("\n")}

Tasks Overview:
- Total: ${tasks.length}
- Completed: ${tasks.filter((t) => t.status === "completed").length}
- In Progress: ${tasks.filter((t) => t.status === "in_progress").length}
- Blocked: ${tasks.filter((t) => t.status === "blocked").length}

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
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    projectTitle
  });
}
__name(handleGenerateReport, "handleGenerateReport");
async function callGemini(prompt, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024
        }
      })
    }
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.statusText} - ${errorText}`);
  }
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}
__name(callGemini, "callGemini");
function buildConversationPrompt(systemPrompt, history, newMessage) {
  let prompt = systemPrompt + "\n\n";
  const recentHistory = history.slice(-5);
  recentHistory.forEach((msg) => {
    prompt += `${msg.role === "user" ? "User" : "Liora"}: ${msg.content}
`;
  });
  prompt += `User: ${newMessage}
Liora:`;
  return prompt;
}
__name(buildConversationPrompt, "buildConversationPrompt");
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}
__name(jsonResponse, "jsonResponse");
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
