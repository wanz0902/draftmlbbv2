$heroFiles = Get-ChildItem -Path 'C:\Users\Admin\Downloads\mlbb draft v2\data\heroes\*.json'
$allItems = @()
foreach ($f in $heroFiles) {
    $json = Get-Content -Path $f.FullName -Raw | ConvertFrom-Json
    if ($json.proBuilds) {
        foreach ($build in $json.proBuilds) {
            foreach ($item in $build.items) { $allItems += $item }
        }
    }
    if ($json.communityBuilds) {
        foreach ($build in $json.communityBuilds) {
            foreach ($item in $build.items) { $allItems += $item }
        }
    }
    if ($json.mlbhubBuilds) {
        foreach ($build in $json.mlbhubBuilds) {
            foreach ($item in $build.items) { $allItems += $item }
        }
    }
}
$unique = $allItems | Sort-Object -Unique
Write-Output ('Total unique item names: ' + $unique.Count)
Write-Output '---UNIQUE_ITEMS_START---'
$unique | ForEach-Object { Write-Output $_.ToString() }
Write-Output '---UNIQUE_ITEMS_END---'
