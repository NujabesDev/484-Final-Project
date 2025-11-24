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

## Two Test Programs Available

### 1. `mic_test.ino` - Basic Audio Level Test
**What it does:**
- Real-time audio level monitoring (dB SPL)
- Peak detection (loudest sounds captured)
- Dynamic range testing (quietest to loudest)
- Raw I2S data quality check

**Libraries:** None (uses built-in ESP32 I2S driver)

### 2. `mic_test_fft.ino` - Advanced FFT Frequency Analysis ⭐ RECOMMENDED FOR VIBE DETECTION
**What it does:**
- Everything from basic test PLUS:
- FFT frequency spectrum analysis (512 bins)
- Bass/Low-Mid/Mid/High-Mid/Treble energy breakdown
- Dominant frequency detection
- **Basic vibe detection** (party, conversation, music, quiet)

**Libraries:** `arduinoFFT` (install via Arduino Library Manager)

**Frequency Bands:**
- Bass: 20-250 Hz (heavy beats, subwoofer)
- Low-Mid: 250-500 Hz (male voice, warmth)
- Mid: 500-2000 Hz (female voice, presence)
- High-Mid: 2000-4000 Hz (clarity, definition)
- Treble: 4000-8000 Hz (brightness, detail)

## Setup Instructions

### Installing Libraries (FFT version only)

1. Open Arduino IDE
2. Go to **Tools → Manage Libraries**
3. Search for "**arduinoFFT**"
4. Install **arduinoFFT by Enrique Condes**

### Uploading the Sketch

1. Open `mic_test_fft.ino` (or `mic_test.ino` for basic test)
2. Select your ESP32 board (Tools → Board → ESP32 Dev Module)
3. Select correct COM port (Tools → Port)
4. Click Upload
5. Open Serial Monitor (115200 baud)

## Expected Output (FFT Version)

```
Level: 65.3 dB SPL | RMS: 8234 | Peak Freq: 440.0 Hz
Overall [==================              ]
Bass    [==========                      ] 25.3%
Low-Mid [======                          ] 15.2%
Mid     [===================             ] 45.8%
Hi-Mid  [====                            ] 10.1%
Treble  [==                              ] 3.6%
VIBE: 💬 Conversation/Voices
```

## Expected dB SPL Levels

- **30-50 dB**: Quiet room, whisper
- **50-60 dB**: Normal conversation, background noise
- **70-80 dB**: Vacuum cleaner, busy traffic
- **80-90 dB**: Loud music, shouting
- **90-100 dB**: Rock concert, club music
- **100+ dB**: Microphone clipping (too loud)

## Vibe Detection Logic (Customizable)

The FFT version includes basic vibe detection:
- **😴 Quiet/Silent**: < 50 dB
- **💬 Conversation**: High mid-range energy
- **🎵 Music**: Balanced spectrum with good bass
- **🎉 Party/Dance**: Heavy bass (>30%) + loud (>70 dB)
- **⚡ Bright/Electronic**: High treble energy

**Customize** the `detectVibe()` function in `mic_test_fft.ino` for your specific needs!

## Troubleshooting

**No sound detected:**
- Check wiring (especially BCLK/WS/DOUT)
- Verify 3.3V power is connected
- Make sure SEL is connected to GND

**Low readings:**
- Speak/make noise closer to microphone
- Check MIC_OFFSET_DB calibration constant

**FFT shows all zeros:**
- Make sure arduinoFFT library is installed
- Verify you're using `mic_test_fft.ino` not `mic_test.ino`
