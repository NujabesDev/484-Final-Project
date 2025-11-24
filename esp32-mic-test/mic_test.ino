/*
 * SPH0645LM4H I2S MEMS Microphone Test
 *
 * Standard Wiring:
 * BCLK  → GPIO14
 * WS    → GPIO15
 * DOUT  → GPIO32
 * SEL   → GND (Left channel)
 * 3V    → 3.3V
 * GND   → GND
 *
 * This sketch tests microphone performance by measuring:
 * - Real-time audio levels (dB SPL)
 * - Peak detection
 * - Dynamic range
 * - Raw sample quality
 *
 * Open Serial Monitor (115200 baud) for stats
 * Open Serial Plotter for waveform visualization
 */

#include <driver/i2s.h>

// I2S Configuration - Standard Pins
#define I2S_WS    15    // LRCL (Word Select)
#define I2S_SD    32    // DOUT (Serial Data)
#define I2S_SCK   14    // BCLK (Bit Clock)
#define I2S_PORT  I2S_NUM_0

// Audio Processing Configuration
#define SAMPLE_RATE       44100      // Standard audio rate (Hz)
#define SAMPLE_BITS       32         // SPH0645 outputs 18-bit in 32-bit frames
#define BUFFER_SIZE       512        // Samples per read
#define DISPLAY_INTERVAL  100        // Update display every 100ms

// Calibration (adjust based on your setup)
#define MIC_OFFSET_DB     94.0       // Reference SPL at 1kHz, 94dB = 1 Pa
#define MIC_SENSITIVITY   -26.0      // dBFS (SPH0645 typical: -26 dBFS)
#define MIC_REF_AMPL      pow(10, MIC_SENSITIVITY / 20.0)

// Global Variables
int32_t samples[BUFFER_SIZE];
size_t bytes_read;
unsigned long last_display = 0;
int32_t peak_max = 0;
int32_t peak_min = 0;

void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);

  Serial.println("\n=================================");
  Serial.println("SPH0645LM4H I2S Microphone Test");
  Serial.println("=================================\n");

  // Configure I2S for microphone input
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 4,
    .dma_buf_len = BUFFER_SIZE,
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
  Serial.println("✓ Bit Depth: 32-bit");
  Serial.println("✓ Channel: Left (Mono)\n");
  Serial.println("Listening for audio...\n");

  delay(500); // Let I2S stabilize
}

void loop() {
  // Read I2S samples
  i2s_read(I2S_PORT, &samples, BUFFER_SIZE * sizeof(int32_t), &bytes_read, portMAX_DELAY);
  int samples_read = bytes_read / sizeof(int32_t);

  // Calculate RMS (Root Mean Square) for volume level
  float sum_squares = 0;
  int32_t current_max = INT32_MIN;
  int32_t current_min = INT32_MAX;

  for (int i = 0; i < samples_read; i++) {
    // SPH0645 outputs 18-bit data in 32-bit format, shift to get proper range
    int32_t sample = samples[i] >> 14;  // Convert to 18-bit signed

    sum_squares += (float)sample * sample;

    // Track peaks
    if (sample > current_max) current_max = sample;
    if (sample < current_min) current_min = sample;

    // Update global peaks
    if (sample > peak_max) peak_max = sample;
    if (sample < peak_min) peak_min = sample;
  }

  // Calculate RMS amplitude
  float rms = sqrt(sum_squares / samples_read);

  // Convert RMS to dB SPL (Sound Pressure Level)
  float db = 0;
  if (rms > 0) {
    // Convert to dBFS (dB Full Scale)
    float dbfs = 20.0 * log10(rms / 131072.0); // 2^17 for 18-bit
    // Convert dBFS to dB SPL
    db = dbfs + MIC_OFFSET_DB - MIC_SENSITIVITY;
  } else {
    db = 0;  // Silence
  }

  // Display results periodically
  unsigned long now = millis();
  if (now - last_display >= DISPLAY_INTERVAL) {
    last_display = now;

    // Print for Serial Monitor (detailed stats)
    Serial.print("Level: ");
    Serial.print(db, 1);
    Serial.print(" dB SPL | RMS: ");
    Serial.print(rms, 0);
    Serial.print(" | Peak: ");
    Serial.print(current_max);
    Serial.print(" / ");
    Serial.print(current_min);
    Serial.print(" | Max Ever: ");
    Serial.print(peak_max);
    Serial.print(" / ");
    Serial.println(peak_min);

    // Visual bar graph
    printBar(db);
  }

  // Output for Serial Plotter (raw waveform visualization)
  // Uncomment to enable plotter mode (disable Serial.print statements above)
  // Serial.println(samples[0] >> 14);
}

// Print visual bar graph of audio level
void printBar(float db) {
  Serial.print("[");
  int bars = map(constrain(db, 30, 100), 30, 100, 0, 40);
  for (int i = 0; i < bars; i++) {
    Serial.print("=");
  }
  for (int i = bars; i < 40; i++) {
    Serial.print(" ");
  }
  Serial.println("]");
}

// Test summary (call this from loop if you want periodic summaries)
void printSummary() {
  Serial.println("\n--- Microphone Test Summary ---");
  Serial.print("Peak Amplitude: ");
  Serial.print(peak_max);
  Serial.print(" / ");
  Serial.println(peak_min);
  Serial.print("Dynamic Range: ");
  Serial.print((peak_max - peak_min));
  Serial.println(" (18-bit max: 262144)");
  Serial.println("-------------------------------\n");
}
