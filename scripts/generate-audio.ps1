$tracks = @(
  @{ File = "ambient-drift.wav"; Frequency = 220; Duration = 4.2 },
  @{ File = "golden-hour.wav"; Frequency = 262; Duration = 4.0 },
  @{ File = "neon-pulse.wav"; Frequency = 330; Duration = 3.8 },
  @{ File = "ocean-bloom.wav"; Frequency = 392; Duration = 4.3 },
  @{ File = "skyline-drive.wav"; Frequency = 494; Duration = 4.1 }
)

function Write-SineWav([string]$path, [double]$frequency, [double]$durationSec) {
  $sampleRate = 22050
  $channels = 1
  $bitsPerSample = 16
  $samples = [int]($sampleRate * $durationSec)
  $byteRate = $sampleRate * $channels * ($bitsPerSample / 8)
  $blockAlign = $channels * ($bitsPerSample / 8)
  $dataSize = $samples * $blockAlign
  $riffSize = 36 + $dataSize
  $fs = [System.IO.File]::Open($path, [System.IO.FileMode]::Create)
  $bw = New-Object System.IO.BinaryWriter($fs)
  $bw.Write([System.Text.Encoding]::ASCII.GetBytes("RIFF"))
  $bw.Write([int]$riffSize)
  $bw.Write([System.Text.Encoding]::ASCII.GetBytes("WAVE"))
  $bw.Write([System.Text.Encoding]::ASCII.GetBytes("fmt "))
  $bw.Write([int]16)
  $bw.Write([int16]1)
  $bw.Write([int16]$channels)
  $bw.Write([int]$sampleRate)
  $bw.Write([int]$byteRate)
  $bw.Write([int16]$blockAlign)
  $bw.Write([int16]$bitsPerSample)
  $bw.Write([System.Text.Encoding]::ASCII.GetBytes("data"))
  $bw.Write([int]$dataSize)

  $volume = 0.25
  for ($i = 0; $i -lt $samples; $i++) {
    $t = $i / $sampleRate
    $sample = [Math]::Sin(2 * [Math]::PI * $frequency * $t) + 0.35 * [Math]::Sin(2 * [Math]::PI * ($frequency * 1.5) * $t)
    $sample = $sample / 1.35
    $value = [int]([Math]::Round($sample * 32767 * $volume))
    $bw.Write([int16]$value)
  }

  $bw.Close()
  $fs.Close()
}

foreach ($track in $tracks) {
  $path = Join-Path "public\audio" $track.File
  Write-SineWav -path $path -frequency $track.Frequency -durationSec $track.Duration
}
