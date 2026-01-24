Add-Type -AssemblyName System.IO.Compression.FileSystem

function Extract-DocxText {
    param([string]$docxPath)

    $zip = [System.IO.Compression.ZipFile]::OpenRead($docxPath)
    $entry = $zip.GetEntry('word/document.xml')
    $stream = $entry.Open()
    $reader = New-Object System.IO.StreamReader($stream)
    $content = $reader.ReadToEnd()
    $reader.Close()
    $stream.Close()
    $zip.Dispose()

    return $content
}

Write-Host "=== WIG UI Design Spec ==="
Extract-DocxText "C:\Users\ariel\Downloads\WIG_UI_Design_Spec_v1 (1).docx"

Write-Host "`n`n=== LinkedIn Adapter Design Spec ==="
Extract-DocxText "C:\Users\ariel\Downloads\LinkedIn_Adapter_Design_Spec_WIG_v1.docx"
