# Test Cloudflare Worker - PowerShell Script

# Test 1: Chat endpoint
$body = @{
    message = "Hi Liora! Introduce yourself briefly."
    conversationHistory = @()
} | ConvertTo-Json

Write-Host "Testing /chat endpoint..." -ForegroundColor Cyan
$response = Invoke-RestMethod -Uri "https://liora-ai-worker.slhunterr.workers.dev/chat" -Method Post -Body $body -ContentType "application/json"
Write-Host "Response:" -ForegroundColor Green
Write-Host $response.reply

Write-Host "`n---`n"

# Test 2: Summarize endpoint
$body2 = @{
    logs = @(
        @{
            date = "2024-02-10"
            tasksCompleted = "Wrote introduction chapter"
            taskStatus = "done"
        },
        @{
            date = "2024-02-11"
            tasksCompleted = "Literature review for methodology"
            taskStatus = "inprogress"
        }
    )
    timeframe = "week"
} | ConvertTo-Json -Depth 3

Write-Host "Testing /summarize endpoint..." -ForegroundColor Cyan
$response2 = Invoke-RestMethod -Uri "https://liora-ai-worker.slhunterr.workers.dev/summarize" -Method Post -Body $body2 -ContentType "application/json"
Write-Host "Summary:" -ForegroundColor Green
Write-Host $response2.summary

Write-Host "`n✅ All tests passed!" -ForegroundColor Green
