# ESP32 + SPH0645LM4H I2S MEMS Microphone Test

## Standard Wiring Configuration

```
SPH0645LM4H Pin  →  ESP32 Pin
────────────────────────────────
BCLK             →  GPIO14
WS (LRCL)        →  GPIO15
DOUT             →  GPIO32
SEL              →  GND (Left channel)
GND              →  GND
3V               →  3.3V
```

## What This Tests

- **Real-time audio level monitoring** (dB SPL)
- **Peak detection** (loudest sounds captured)
- **Dynamic range** (quietest to loudest)
- **Frequency response** visualization via Serial Plotter
- **Raw I2S data** quality check

## Upload Instructions

1. Open `mic_test.ino` in Arduino IDE
2. Select your ESP32 board (Tools → Board)
3. Select correct COM port (Tools → Port)
4. Upload the sketch
5. Open Serial Monitor (115200 baud) for detailed stats
6. Open Serial Plotter (Tools → Serial Plotter) for visual waveform

## Expected Results

- **Silence**: ~40-50 dB SPL
- **Normal conversation**: 60-70 dB SPL
- **Loud music/shouting**: 80-90 dB SPL
- **Maximum**: ~110 dB SPL (microphone clips beyond this)

## Libraries Required

```
None - uses built-in ESP32 I2S driver
```
