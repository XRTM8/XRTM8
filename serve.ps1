# ====================================================================
# serve.ps1 - Zero-dependency High-Speed HTTP Server for NEON CLASH
# ====================================================================

$port = 8080
$prefix = "http://*:$port/"
$root = $PSScriptRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  NEON CLASH: OVERDRIVE - Local & LAN Server Running" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "-> PC Local URL:    http://localhost:$port" -ForegroundColor Green

# Find local LAN IP for Mobile connection on the same Wi-Fi
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254*" } | Select-Object -First 1).IPAddress
if ($localIP) {
    Write-Host "-> Mobile (Wi-Fi):  http://${localIP}:$port" -ForegroundColor Magenta
}
Write-Host ""
Write-Host "Press Ctrl+C to stop the server at any time." -ForegroundColor Gray
Write-Host "----------------------------------------------------------"

$listener = New-Object System.Net.HttpListener
try {
    $listener.Prefixes.Add("http://localhost:$port/")
    if ($localIP) {
        # Try adding LAN IP prefix if permissions allow
        try { $listener.Prefixes.Add("http://${localIP}:$port/") } catch {}
    }
    $listener.Start()
} catch {
    Write-Host "Failed to bind port $port. Trying port 8888..." -ForegroundColor Red
    $port = 8888
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Start()
    Write-Host "Running on http://localhost:$port" -ForegroundColor Green
}

# Open browser automatically
Start-Process "http://localhost:$port"

$mimeTypes = @{
    ".html" = "text/html"
    ".css"  = "text/css"
    ".js"   = "application/javascript"
    ".json" = "application/json"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
}

$signalStore = @{}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # CORS Support for LAN clients
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.AddHeader("Access-Control-Allow-Headers", "Content-Type")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 204
            $response.OutputStream.Close()
            continue
        }

        $urlPath = $request.Url.LocalPath
        if ($urlPath -eq "/" -or $urlPath -eq "") {
            $urlPath = "/index.html"
        }

        # Offline Local LAN Signaling Relay (Zero-Cloud P2P Fallback)
        if ($urlPath -eq "/api/signal") {
            $response.ContentType = "application/json"
            if ($request.HttpMethod -eq "POST") {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd()
                try {
                    $msg = ConvertFrom-Json $body
                    $room = [string]$msg.room
                    $target = [string]$msg.to
                    if (-not $signalStore.ContainsKey($room)) {
                        $signalStore[$room] = @{}
                    }
                    if (-not $signalStore[$room].ContainsKey($target)) {
                        $signalStore[$room][$target] = New-Object System.Collections.ArrayList
                    }
                    [void]$signalStore[$room][$target].Add($msg)
                    $resBytes = [System.Text.Encoding]::UTF8.GetBytes('{"status":"ok"}')
                    $response.OutputStream.Write($resBytes, 0, $resBytes.Length)
                } catch {
                    $response.StatusCode = 400
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Invalid JSON"}')
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                }
                $response.OutputStream.Close()
                continue
            }
            elseif ($request.HttpMethod -eq "GET") {
                $queryString = $request.Url.Query.TrimStart('?')
                $queryParams = @{}
                foreach ($pair in $queryString.Split('&')) {
                    if ($pair -match '^([^=]+)=(.*)$') {
                        $queryParams[[System.Uri]::UnescapeDataString($matches[1])] = [System.Uri]::UnescapeDataString($matches[2])
                    }
                }
                $room = $queryParams["room"]
                $target = $queryParams["for"]
                $messages = @()
                if ($room -and $target -and $signalStore.ContainsKey($room) -and $signalStore[$room].ContainsKey($target)) {
                    $messages = @($signalStore[$room][$target])
                    $signalStore[$room].Remove($target)
                }
                $jsonOut = ConvertTo-Json -InputObject $messages -Compress
                if (-not $jsonOut) { $jsonOut = "[]" }
                $resBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonOut)
                $response.OutputStream.Write($resBytes, 0, $resBytes.Length)
                $response.OutputStream.Close()
                continue
            }
        }

        $filePath = Join-Path $root ($urlPath.TrimStart('/').Replace('/', '\'))

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $response.ContentType = $contentType

            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 - Not Found")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.OutputStream.Close()
    } catch {
        # Silently ignore broken connections / aborted requests
    }
}
