# Test Direct API Call
$apiKey = Read-Host "Enter your NEW Gemini API key"

$body = @{
    contents = @(
        @{
            parts = @(
                @{ text = "Say hello in one sentence" }
            )
        }
    )
} | ConvertTo-Json -Depth 4

Write-Host "`nTesting Gemini API directly..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=$apiKey" -Method Post -Body $body -ContentType "application/json"
    Write-Host "`n✅ SUCCESS! Gemini API works!" -ForegroundColor Green
    Write-Host "Response: $($response.candidates[0].content.parts[0].text)" -ForegroundColor Yellow
    Write-Host "`nAPI key is valid! Problem is in the worker code, not the key." -ForegroundColor Cyan
} catch {
    Write-Host "`n❌ FAILED! API key is invalid or blocked" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nYou need to generate a NEW API key from:" -ForegroundColor Yellow
    Write-Host "https://aistudio.google.com/app/apikey" -ForegroundColor Cyan
}
