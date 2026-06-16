param([string]$ExcelPath)

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$wb = $excel.Workbooks.Open($ExcelPath, 0, $true)
$sheet = $wb.Worksheets.Item("買取価格比較表")
$used = $sheet.UsedRange.Rows.Count
$lastRow = $sheet.Cells.Item($sheet.Rows.Count, 1).End(-4162).Row
Write-Output "used=$used lastRow=$lastRow"
Write-Output "A2=$($sheet.Cells.Item(2,1).Value2)"
Write-Output "A3=$($sheet.Cells.Item(3,1).Value2)"
Write-Output "Alast=$($sheet.Cells.Item($lastRow,1).Value2)"
$wb.Close($false)
$excel.Quit()
