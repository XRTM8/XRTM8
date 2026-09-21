$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$totalPassed = 0
$totalTests = 0
$allFailed = @()
$outDir = "c:\Users\XRT\Desktop\NEW\scratch"

10..25 | ForEach-Object {
    $phase = $_
    $outFile = "$outDir\phase$($phase)_out.txt"
    $fileUrl = "file:///c:/Users/XRT/Desktop/NEW/tests_phase$($phase).html"
    
    $proc = Start-Process -FilePath $edge -ArgumentList "--headless", "--disable-gpu", "--virtual-time-budget=3000", "--dump-dom", $fileUrl -NoNewWindow -Wait -PassThru -RedirectStandardOutput $outFile
    
    if (Test-Path $outFile) {
        $text = Get-Content $outFile -Raw
        if ($text -match "(?i)TEST\s*(?:RESULTS|SUITE):?\s*(\d+)\s*[/]\s*(\d+)\s*(?:PASS|Passed|PASSED)") {
            $p = [int]$matches[1]
            $t = [int]$matches[2]
            $totalPassed += $p
            $totalTests += $t
            Write-Host "Phase $($phase): $p / $t Passed"
            if ($p -lt $t) {
                $allFailed += "Phase $($phase) has failures ($p / $t)"
            }
        } else {
            Write-Host "Phase $($phase): FAILED TO PARSE OUTPUT"
            $allFailed += "Phase $($phase): Parse error"
        }
        Remove-Item $outFile -Force -ErrorAction SilentlyContinue
    } else {
        Write-Host "Phase $($phase): NO OUTPUT FILE"
        $allFailed += "Phase $($phase): No output"
    }
}

Write-Host "------------------------------------"
Write-Host "TOTAL: $totalPassed / $totalTests Passed"
if ($allFailed.Count -gt 0) {
    Write-Host "FAILURES DETECTED:"
    $allFailed | ForEach-Object { Write-Host " - $_" }
    exit 1
} else {
    Write-Host "ALL TESTS PASSED CLEANLY!"
    exit 0
}
