/*
 * SPH0645LM4H I2S MEMS Microphone Test with FFT
 *
 * Standard Wiring:
 * BCLK  → GPIO14
 * WS    → GPIO15
 * DOUT  → GPIO32
 * SEL   → GND (Left channel)
 * 3V    → 3.3V
 * GND   → GND
 *
 * Features:
 * - Real-time audio levels (dB SPL)
 * - FFT frequency spectrum analysis
 * - Bass/Mid/Treble energy detection
 * - Dominant frequency detection
 * - Vibe detection ready
 *
 * Required Library:
 * - arduinoFFT (install via Arduino Library Manager)
 *
 * Open Serial Monitor (115200 baud) for stats
 */

#include <driver/i2s.h>
#include <arduinoFFT.h>

// I2S Configuration - Standard Pins
#define I2S_WS    15    // LRCL (Word Select)
#define I2S_SD    32    // DOUT (Serial Data)
#define I2S_SCK   14    // BCLK (Bit Clock)
#define I2S_PORT  I2S_NUM_0

// Audio Processing Configuration
#define SAMPLE_RATE       44100      // Standard audio rate (Hz)
#define SAMPLE_BITS       32         // SPH0645 outputs 18-bit in 32-bit frames
#define FFT_SIZE          512        // FFT samples (power of 2, matches buffer)
#define DISPLAY_INTERVAL  100        // Update display every 100ms

// Calibration (adjust based on your setup)
#define MIC_OFFSET_DB     94.0       // Reference SPL at 1kHz, 94dB = 1 Pa
#define MIC_SENSITIVITY   -26.0      // dBFS (SPH0645 typical: -26 dBFS)

// Frequency Band Definitions (Hz)
// These define what we consider bass, mid, treble for vibe detection
#define BASS_MIN      20
#define BASS_MAX      250
#define LOW_MID_MIN   250
#define LOW_MID_MAX   500
#define MID_MIN       500
#define MID_MAX       2000
#define HIGH_MID_MIN  2000
#define HIGH_MID_MAX  4000
#define TREBLE_MIN    4000
#define TREBLE_MAX    8000

// Global Variables
int32_t samples[FFT_SIZE];
double vReal[FFT_SIZE];      // FFT real input
double vImag[FFT_SIZE];      // FFT imaginary input
size_t bytes_read;
unsigned long last_display = 0;

// Create FFT object
ArduinoFFT<double> FFT = ArduinoFFT<double>(vReal, vImag, FFT_SIZE, SAMPLE_RATE);

// Frequency band energy storage
struct FrequencyBands {
  float bass;
  float low_mid;
  float mid;
  float high_mid;
  float treble;
  float dominant_freq;
  float total_energy;
};

void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);

  Serial.println("\n==========================================");
  Serial.println("SPH0645LM4H I2S Microphone + FFT Analysis");
  Serial.println("==========================================\n");

  // Configure I2S for microphone input
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 4,
    .dma_buf_len = FFT_SIZE,
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };

  // Configure I2S pins
  i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_SCK,
    .ws_io_num = I2S_WS,
    .data_out_num = I2S_PIN_NO_CHANGE,
    .data_in_num = I2S_SD
  };

  // Install and start I2S driver
  esp_err_t err = i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  if (err != ESP_OK) {
    Serial.printf("ERROR: I2S driver install failed: %d\n", err);
    while (1) delay(1000);
  }

  err = i2s_set_pin(I2S_PORT, &pin_config);
  if (err != ESP_OK) {
    Serial.printf("ERROR: I2S pin config failed: %d\n", err);
    while (1) delay(1000);
  }

  Serial.println("✓ I2S initialized successfully");
  Serial.println("✓ Sample Rate: 44100 Hz");
  Serial.println("✓ FFT Size: 512 samples");
  Serial.printf("✓ Frequency Resolution: %.2f Hz/bin\n", (float)SAMPLE_RATE / FFT_SIZE);
  Serial.println("✓ Channel: Left (Mono)\n");
  Serial.println("Listening for audio...\n");

  delay(500); // Let I2S stabilize
}

void loop() {
  // Read I2S samples
  i2s_read(I2S_PORT, &samples, FFT_SIZE * sizeof(int32_t), &bytes_read, portMAX_DELAY);
  int samples_read = bytes_read / sizeof(int32_t);

  if (samples_read != FFT_SIZE) {
    Serial.println("Warning: Incomplete sample read");
    return;
  }

  // ===== STEP 1: Calculate RMS for dB SPL =====
  float sum_squares = 0;
  for (int i = 0; i < FFT_SIZE; i++) {
    // SPH0645 outputs 18-bit data in 32-bit format
    int32_t sample = samples[i] >> 14;  // Convert to 18-bit signed
    sum_squares += (float)sample * sample;
  }

  float rms = sqrt(sum_squares / FFT_SIZE);
  float db = calculateDBSPL(rms);

  // ===== STEP 2: Prepare FFT Input =====
  // Copy samples to FFT buffer and apply Hamming window
  for (int i = 0; i < FFT_SIZE; i++) {
    vReal[i] = (double)(samples[i] >> 14);  // Convert to 18-bit signed
    vImag[i] = 0.0;  // Imaginary part starts at zero
  }

  // Apply windowing function to reduce spectral leakage
  FFT.windowing(FFTWindow::Hamming, FFTDirection::Forward);

  // ===== STEP 3: Compute FFT =====
  FFT.compute(FFTDirection::Forward);

  // ===== STEP 4: Compute Magnitudes =====
  FFT.complexToMagnitude();

  // ===== STEP 5: Analyze Frequency Bands =====
  FrequencyBands bands = analyzeFrequencyBands();

  // ===== STEP 6: Find Dominant Frequency =====
  double peak_freq = FFT.majorPeak();
  bands.dominant_freq = peak_freq;

  // ===== STEP 7: Display Results =====
  unsigned long now = millis();
  if (now - last_display >= DISPLAY_INTERVAL) {
    last_display = now;
    displayResults(db, rms, bands);
  }
}

// Calculate dB SPL from RMS value
float calculateDBSPL(float rms) {
  if (rms > 0) {
    float dbfs = 20.0 * log10(rms / 131072.0); // 2^17 for 18-bit
    return dbfs + MIC_OFFSET_DB - MIC_SENSITIVITY;
  }
  return 0.0;
}

// Analyze FFT output and calculate energy in each frequency band
FrequencyBands analyzeFrequencyBands() {
  FrequencyBands bands = {0};

  // Frequency resolution per bin
  float freq_per_bin = (float)SAMPLE_RATE / FFT_SIZE;

  // We only analyze up to Nyquist frequency (half of sample rate)
  // FFT_SIZE/2 bins contain useful frequency information
  for (int i = 1; i < FFT_SIZE / 2; i++) {  // Skip DC component (i=0)
    float frequency = i * freq_per_bin;
    float magnitude = vReal[i];  // FFT magnitude for this frequency bin

    // Accumulate energy into appropriate frequency bands
    if (frequency >= BASS_MIN && frequency < BASS_MAX) {
      bands.bass += magnitude;
    }
    else if (frequency >= LOW_MID_MIN && frequency < LOW_MID_MAX) {
      bands.low_mid += magnitude;
    }
    else if (frequency >= MID_MIN && frequency < MID_MAX) {
      bands.mid += magnitude;
    }
    else if (frequency >= HIGH_MID_MIN && frequency < HIGH_MID_MAX) {
      bands.high_mid += magnitude;
    }
    else if (frequency >= TREBLE_MIN && frequency < TREBLE_MAX) {
      bands.treble += magnitude;
    }

    bands.total_energy += magnitude;
  }

  // Normalize to percentages (0-100%)
  if (bands.total_energy > 0) {
    bands.bass = (bands.bass / bands.total_energy) * 100.0;
    bands.low_mid = (bands.low_mid / bands.total_energy) * 100.0;
    bands.mid = (bands.mid / bands.total_energy) * 100.0;
    bands.high_mid = (bands.high_mid / bands.total_energy) * 100.0;
    bands.treble = (bands.treble / bands.total_energy) * 100.0;
  }

  return bands;
}

// Display all analysis results
void displayResults(float db, float rms, FrequencyBands bands) {
  // Overall audio level
  Serial.print("Level: ");
  Serial.print(db, 1);
  Serial.print(" dB SPL | RMS: ");
  Serial.print(rms, 0);
  Serial.print(" | Peak Freq: ");
  Serial.print(bands.dominant_freq, 1);
  Serial.println(" Hz");

  // Overall level bar
  printBar("Overall", db, 30, 100);

  // Frequency spectrum bars (normalized to 0-100%)
  printBar("Bass   ", bands.bass, 0, 100);
  printBar("Low-Mid", bands.low_mid, 0, 100);
  printBar("Mid    ", bands.mid, 0, 100);
  printBar("Hi-Mid ", bands.high_mid, 0, 100);
  printBar("Treble ", bands.treble, 0, 100);

  // Vibe detection (basic example)
  detectVibe(db, bands);

  Serial.println();  // Blank line for readability
}

// Print visual bar graph
void printBar(const char* label, float value, float min_val, float max_val) {
  Serial.print(label);
  Serial.print(" [");

  int bars = map(constrain(value, min_val, max_val), min_val, max_val, 0, 30);
  for (int i = 0; i < bars; i++) {
    Serial.print("=");
  }
  for (int i = bars; i < 30; i++) {
    Serial.print(" ");
  }

  Serial.print("] ");
  Serial.print(value, 1);

  if (min_val == 0 && max_val == 100) {
    Serial.println("%");
  } else {
    Serial.println();
  }
}

// Basic vibe detection algorithm
void detectVibe(float db, FrequencyBands bands) {
  Serial.print("VIBE: ");

  // Silence detection
  if (db < 50) {
    Serial.println("😴 Quiet/Silent");
    return;
  }

  // High bass energy + loud = party/music with heavy beats
  if (bands.bass > 30 && db > 70) {
    Serial.println("🎉 Party/Dance Music");
    return;
  }

  // High mid energy = conversation/voices
  if (bands.mid > 40 && bands.low_mid > 25) {
    Serial.println("💬 Conversation/Voices");
    return;
  }

  // Balanced spectrum = general music
  if (db > 60 && bands.mid > 20 && bands.bass > 15) {
    Serial.println("🎵 Music Playing");
    return;
  }

  // High treble = sharp sounds, possibly electronic music
  if (bands.treble > 30) {
    Serial.println("⚡ Bright/Electronic");
    return;
  }

  // Default
  Serial.println("🔊 General Audio");
}
