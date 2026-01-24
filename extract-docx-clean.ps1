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

    # Extract text from XML
    $xml = [xml]$content
    $textParts = $xml.GetElementsByTagName("w:t")
    $text = ""
    foreach ($part in $textParts) {
        $text += $part.InnerText
    }

    return $text
}

Write-Host "=== WIG UI Design Spec ==="
Extract-DocxText "C:\Users\ariel\Downloads\WIG_UI_Design_Spec_v1 (1).docx"

Write-Host "`n`n`n=== LinkedIn Adapter Design Spec ==="
Extract-DocxText "C:\Users\ariel\Downloads\LinkedIn_Adapter_Design_Spec_WIG_v1.docx"
