# Simple Gemini API Test
$apiKey = "AIzaSyBxIin8CLGwvgXfcJQjR0hYLXwUP1es5Is"

$body = @{
    contents = @(
        @{
            parts = @(
                @{ text = "Say hello in one sentence" }
            )
        }
    )
} | ConvertTo-Json -Depth 4

Write-Host "Testing Gemini API directly..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=$apiKey" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Success! Gemini Response:" -ForegroundColor Green
    Write-Host $response.candidates[0].content.parts[0].text
} catch {
    Write-Host "Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
