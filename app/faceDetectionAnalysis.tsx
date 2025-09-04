import { Video } from 'expo-av';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface DetectionResult {
  success: boolean;
  message: string;
  output_video?: string;
  detection_frame?: string;
  detection_summary?: {
    total_frames: number;
    detected_frames: number;
    detection_timestamps: number[];
  };
}

interface DownloadedFile {
  uri: string;
  type: 'video' | 'image';
  filename: string;
}

export default function FaceDetectionAnalysisScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [crowdVideo, setCrowdVideo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [downloadedFiles, setDownloadedFiles] = useState<DownloadedFile[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string>('');
  const [tolerance, setTolerance] = useState('0.6');
  const [frameSkip, setFrameSkip] = useState('5');
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      try {
        await Camera.requestMicrophonePermissionsAsync();
      } catch {}
    })();
  }, []);

  const pickPersonImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your media library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPersonImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      console.error('Image picker error:', error);
    }
  };

  const pickCrowdVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your media library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
        videoMaxDuration: 300, // 5 minutes max
      });

      if (!result.canceled && result.assets[0]) {
        setCrowdVideo(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick video');
      console.error('Video picker error:', error);
    }
  };

  const analyzeFaceDetection = async () => {
    if (!personImage || !crowdVideo) {
      Alert.alert('Error', 'Please select both a person image and crowd video');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      
      // Add person image
      formData.append('person_image', {
        uri: personImage,
        name: 'person.jpg',
        type: 'image/jpeg',
      } as any);

      // Add crowd video
      formData.append('crowd_video', {
        uri: crowdVideo,
        name: 'crowd.mp4',
        type: 'video/mp4',
      } as any);

      // Add parameters
      formData.append('tolerance', tolerance);
      formData.append('frame_skip', frameSkip);

      console.log('Sending request to face detection API...');
      
      // Replace with your server IP - the user mentioned server is on another network
      const response = await fetch('http://35.154.222.142:5001/api/detect', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error');
      }

      const data = await response.json();
      setResult(data);
      console.log('Detection result:', data);

      // Download output files if detection was successful
      if (data.success) {
        await downloadOutputFiles(data);
      }

    } catch (error) {
      console.error('Face detection error:', error);
      Alert.alert('Error', `Face detection failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadOutputFiles = async (detectionData: DetectionResult) => {
    if (!detectionData.success) return;

    setDownloading(true);
    setDownloadProgress('Starting download...');
    const newFiles: DownloadedFile[] = [];

    try {
      // Download output video if available
      if (detectionData.output_video) {
        setDownloadProgress(`Downloading video: ${detectionData.output_video}`);
        const videoUri = await downloadFileWithRetry(detectionData.output_video, 'video');
        if (videoUri) {
          newFiles.push({
            uri: videoUri,
            type: 'video',
            filename: detectionData.output_video
          });
          setDownloadProgress(`Video downloaded successfully`);
        } else {
          setDownloadProgress(`Failed to download video: ${detectionData.output_video}`);
        }
      }

      // Download detection frame if available
      if (detectionData.detection_frame) {
        setDownloadProgress(`Downloading image: ${detectionData.detection_frame}`);
        const frameUri = await downloadFileWithRetry(detectionData.detection_frame, 'image');
        if (frameUri) {
          newFiles.push({
            uri: frameUri,
            type: 'image',
            filename: detectionData.detection_frame
          });
          setDownloadProgress(`Image downloaded successfully`);
        } else {
          setDownloadProgress(`Failed to download image: ${detectionData.detection_frame}`);
        }
      }

      setDownloadedFiles(newFiles);
      setDownloadProgress(`Download complete! ${newFiles.length} files downloaded.`);
    } catch (error) {
      console.error('Error downloading files:', error);
      setDownloadProgress('Download failed');
      Alert.alert('Warning', 'Some output files could not be downloaded');
    } finally {
      setDownloading(false);
    }
  };

  const downloadFileWithRetry = async (filename: string, fileType: 'video' | 'image', maxRetries: number = 3): Promise<string | null> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Download attempt ${attempt}/${maxRetries} for ${filename}`);
        const result = await downloadFile(filename, fileType);
        if (result) {
          return result;
        }
      } catch (error) {
        console.error(`Download attempt ${attempt} failed for ${filename}:`, error);
        if (attempt === maxRetries) {
          throw error;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    return null;
  };

  const downloadFile = async (filename: string, fileType: 'video' | 'image'): Promise<string | null> => {
    try {
      console.log(`Downloading ${fileType}: ${filename}`);
      
      // Add timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(`http://35.154.222.142:5001/api/download/${filename}`, {
        signal: controller.signal,
        headers: {
          'Accept': fileType === 'video' ? 'video/mp4,video/*' : 'image/*,*/*',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      // Check content type
      const contentType = response.headers.get('content-type');
      console.log(`Content type for ${filename}: ${contentType}`);

      // Get the file as blob
      const blob = await response.blob();
      console.log(`Downloaded ${filename}: ${blob.size} bytes`);
      
      // Convert blob to base64 for display
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          console.log(`Converted ${filename} to base64: ${base64data.length} characters`);
          resolve(base64data);
        };
        reader.onerror = () => {
          console.error(`Error reading ${filename} as base64`);
          reject(new Error('Failed to convert file to base64'));
        };
        reader.readAsDataURL(blob);
      });

    } catch (error) {
      if (error.name === 'AbortError') {
        console.error(`Download timeout for ${filename}`);
      } else {
        console.error(`Error downloading ${filename}:`, error);
      }
      return null;
    }
  };

  const resetAnalysis = () => {
    setPersonImage(null);
    setCrowdVideo(null);
    setResult(null);
    setDownloadedFiles([]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Face Detection Analysis</Text>
      </View>

      {!result ? (
        <View style={styles.content}>
          {/* Person Image Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Select Person Image</Text>
            {personImage ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: personImage }} style={styles.previewImage} />
                <TouchableOpacity onPress={pickPersonImage} style={styles.changeButton}>
                  <Text style={styles.changeButtonText}>Change Image</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={pickPersonImage} style={styles.selectButton}>
                <Text style={styles.selectButtonText}>Select Person Image</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Crowd Video Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Select Crowd Video</Text>
            {crowdVideo ? (
              <View style={styles.videoContainer}>
                <Text style={styles.videoText}>Video selected ✓</Text>
                <TouchableOpacity onPress={pickCrowdVideo} style={styles.changeButton}>
                  <Text style={styles.changeButtonText}>Change Video</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={pickCrowdVideo} style={styles.selectButton}>
                <Text style={styles.selectButtonText}>Select Crowd Video</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Parameters */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Detection Parameters</Text>
            <View style={styles.parameterRow}>
              <Text style={styles.parameterLabel}>Tolerance (0.0-1.0):</Text>
              <TextInput
                style={styles.parameterInput}
                value={tolerance}
                onChangeText={setTolerance}
                keyboardType="numeric"
                placeholder="0.6"
              />
            </View>
            <View style={styles.parameterRow}>
              <Text style={styles.parameterLabel}>Frame Skip:</Text>
              <TextInput
                style={styles.parameterInput}
                value={frameSkip}
                onChangeText={setFrameSkip}
                keyboardType="numeric"
                placeholder="5"
              />
            </View>
          </View>

          {/* Analyze Button */}
          <TouchableOpacity
            onPress={analyzeFaceDetection}
            style={[styles.analyzeButton, loading && styles.analyzeButtonDisabled]}
            disabled={loading || !personImage || !crowdVideo}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.analyzeButtonText}>Analyze Face Detection</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Analysis Results</Text>
          
          {result.success ? (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>✓ {result.message}</Text>
              
              {result.detection_summary && (
                <View style={styles.summaryContainer}>
                  <Text style={styles.summaryTitle}>Detection Summary:</Text>
                  <Text style={styles.summaryText}>
                    Total Frames: {result.detection_summary.total_frames}
                  </Text>
                  <Text style={styles.summaryText}>
                    Detected Frames: {result.detection_summary.detected_frames}
                  </Text>
                  {result.detection_summary.detection_timestamps.length > 0 && (
                    <Text style={styles.summaryText}>
                      Detection Times: {result.detection_summary.detection_timestamps.map(t => `${t.toFixed(2)}s`).join(', ')}
                    </Text>
                  )}
                </View>
              )}

              {downloading && (
                <View style={styles.downloadingContainer}>
                  <ActivityIndicator size="small" color="#FFA500" />
                  <Text style={styles.downloadingText}>{downloadProgress}</Text>
                </View>
              )}

              {downloadedFiles.length > 0 && (
                <View style={styles.filesContainer}>
                  <Text style={styles.filesTitle}>Downloaded Files:</Text>
                  
                  {downloadedFiles.map((file, index) => (
                    <View key={index} style={styles.fileItem}>
                      <Text style={styles.fileName}>{file.filename}</Text>
                      
                      {file.type === 'image' ? (
                        <Image source={{ uri: file.uri }} style={styles.filePreview} />
                      ) : (
                        <Video
                          source={{ uri: file.uri }}
                          style={styles.videoPreview}
                          useNativeControls
                          shouldPlay={false}
                        />
                      )}
                      
                      <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() => {
                          // For videos, you might want to open in a video player
                          // For images, they're already displayed
                          if (file.type === 'video') {
                            Alert.alert('Video File', `Video: ${file.filename}\n\nThis is the processed output video with face detection highlights.`);
                          }
                        }}
                      >
                        <Text style={styles.viewButtonText}>
                          {file.type === 'video' ? 'View Video' : 'View Image'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {result.output_video && (
                <View style={styles.outputContainer}>
                  <Text style={styles.outputTitle}>Output Files:</Text>
                  <Text style={styles.outputText}>Video: {result.output_video}</Text>
                  {result.detection_frame && (
                    <Text style={styles.outputText}>Frame: {result.detection_frame}</Text>
                  )}
                  
                  {downloadedFiles.length === 0 && !downloading && (
                    <TouchableOpacity
                      style={styles.manualDownloadButton}
                      onPress={() => downloadOutputFiles(result)}
                    >
                      <Text style={styles.manualDownloadButtonText}>Download Files Manually</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>✗ {result.message}</Text>
            </View>
          )}

          <TouchableOpacity onPress={resetAnalysis} style={styles.resetButton}>
            <Text style={styles.resetButtonText}>New Analysis</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#FFA500',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  imageContainer: {
    alignItems: 'center',
  },
  previewImage: {
    width: 300,
    height: 300,
    borderRadius: 12,
    marginBottom: 12,
  },
  videoContainer: {
    alignItems: 'center',
    padding: 20,
  },
  videoText: {
    fontSize: 16,
    color: '#4CAF50',
    marginBottom: 12,
  },
  selectButton: {
    backgroundColor: '#FFA500',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  changeButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  changeButtonText: {
    color: '#666',
    fontSize: 14,
  },
  parameterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  parameterLabel: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  parameterInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  analyzeButton: {
    backgroundColor: '#FFA500',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  analyzeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  resultContainer: {
    padding: 16,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  successText: {
    fontSize: 16,
    color: '#4CAF50',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  outputContainer: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
  },
  outputTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 8,
  },
  outputText: {
    fontSize: 14,
    color: '#1976d2',
    marginBottom: 4,
  },
  errorContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: '#666',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  downloadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  downloadingText: {
    marginLeft: 8,
    color: '#856404',
    fontSize: 14,
  },
  filesContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  filesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  fileItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  filePreview: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 8,
  },
  videoPreview: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 8,
  },
  videoPreviewContainer: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  videoPreviewText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 4,
  },
  videoPreviewSubtext: {
    fontSize: 14,
    color: '#1976d2',
  },
  viewButton: {
    backgroundColor: '#FFA500',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  manualDownloadButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
  },
  manualDownloadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
