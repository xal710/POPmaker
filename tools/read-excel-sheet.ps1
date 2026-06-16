# UTF-8
param()

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$SheetName = $env:POP_SHEET_NAME
$ExcelPath = $env:POP_EXCEL_PATH

if ([string]::IsNullOrWhiteSpace($ExcelPath)) {
  throw "POP_EXCEL_PATH is not set"
}

if ([string]::IsNullOrWhiteSpace($SheetName)) {
  throw "POP_SHEET_NAME is not set"
}

function Normalize-Path([string]$Path) {
  return ([System.IO.Path]::GetFullPath($Path)).ToLowerInvariant()
}

function Get-Workbook([object]$ExcelApp, [string]$TargetPath) {
  $target = Normalize-Path $TargetPath

  foreach ($workbook in $ExcelApp.Workbooks) {
    try {
      if ((Normalize-Path $workbook.FullName) -eq $target) {
        return @{ Workbook = $workbook; OpenedByScript = $false }
      }
    } catch {
      continue
    }
  }

  $opened = $ExcelApp.Workbooks.Open($TargetPath, 0, $true)
  return @{ Workbook = $opened; OpenedByScript = $true }
}

$excel = $null
$excelCreatedByScript = $false
$workbookInfo = $null

try {
  try {
    $excel = [Runtime.InteropServices.Marshal]::GetActiveObject("Excel.Application")
  } catch {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $excelCreatedByScript = $true
  }

  $workbookInfo = Get-Workbook -ExcelApp $excel -TargetPath $ExcelPath
  $workbook = $workbookInfo.Workbook

  $sheet = $null
  foreach ($worksheet in $workbook.Worksheets) {
    if ($worksheet.Name -eq $SheetName) {
      $sheet = $worksheet
      break
    }
  }

  if ($null -eq $sheet) {
    throw "Sheet not found: $SheetName"
  }

  $sheetNames = @()
  foreach ($worksheet in $workbook.Worksheets) {
    $sheetNames += $worksheet.Name
  }

  $rows = New-Object System.Collections.Generic.List[object]
  $rowIndex = 2

  while ($true) {
    $name = $sheet.Cells.Item($rowIndex, 1).Value2
    if ($null -eq $name -or "$name".Trim() -eq "") {
      break
    }

    $rows.Add(@(
      "$name".Trim(),
      $sheet.Cells.Item($rowIndex, 2).Value2,
      $sheet.Cells.Item($rowIndex, 3).Value2,
      $sheet.Cells.Item($rowIndex, 4).Value2
    )) | Out-Null

    $rowIndex++
  }

  if ($rows.Count -eq 0) {
    throw "Comparison sheet is empty"
  }

  $result = [ordered]@{
    rows = $rows
    sheetNames = $sheetNames
    workbookPath = $workbook.FullName
  }

  $result | ConvertTo-Json -Depth 6 -Compress
}
catch {
  [Console]::Error.WriteLine($_.Exception.Message)
  exit 1
}
finally {
  if ($null -ne $workbookInfo -and $workbookInfo.OpenedByScript -and $null -ne $workbookInfo.Workbook) {
    $workbookInfo.Workbook.Close($false)
  }

  if ($excelCreatedByScript -and $null -ne $excel) {
    $excel.Quit()
  }

  if ($null -ne $excel) {
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
  }

  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
