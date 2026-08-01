import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Vibration,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";

interface HeavyDutyBarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanResult: (barcode: string) => void;
}

export function HeavyDutyBarcodeScannerModal({
  visible,
  onClose,
  onScanResult,
}: HeavyDutyBarcodeScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [continuousMode, setContinuousMode] = useState(true);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setLastScannedCode(null);
    }
  }, [visible]);

  if (!permission) {
    return null;
  }

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned && !continuousMode) return;
    if (data === lastScannedCode && scanned) return;

    setScanned(true);
    setLastScannedCode(data);
    
    // Haptic feedback
    try {
      Vibration.vibrate(100);
    } catch (e) {}

    onScanResult(data);

    if (continuousMode) {
      // Re-enable scanning after 1.2s delay for continuous scanner
      setTimeout(() => {
        setScanned(false);
      }, 1200);
    } else {
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {!permission.granted ? (
          <View style={styles.permissionWrap}>
            <MaterialCommunityIcons name="camera-off" size={64} color="#ef4444" />
            <Text style={styles.permissionTitle}>Akses Kamera Diperlukan</Text>
            <Text style={styles.permissionDesc}>
              Aplikasi SiKasir memerlukan izin kamera untuk pemindaian barcode berkecepatan tinggi.
            </Text>
            <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
              <Text style={styles.permBtnText}>BERIKAN IZIN KAMERA</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={{ color: "#94a3b8", fontWeight: "700" }}>Batal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Real Camera Viewfinder */}
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              enableTorch={torchOn}
              barcodeScannerSettings={{
                barcodeTypes: [
                  "qr",
                  "ean13",
                  "ean8",
                  "code128",
                  "code39",
                  "upc_a",
                  "upc_e",
                ],
              }}
              onBarcodeScanned={handleBarCodeScanned}
            />

            {/* Viewfinder Overlay Mask & Scanning Target Grid */}
            <View style={styles.overlay}>
              {/* Top Controls */}
              <View style={styles.topControls}>
                <TouchableOpacity style={styles.iconCircleBtn} onPress={onClose}>
                  <Ionicons name="close" size={24} color="#ffffff" />
                </TouchableOpacity>

                <View style={styles.titleBadge}>
                  <MaterialCommunityIcons name="barcode-scan" size={18} color="#10b981" />
                  <Text style={styles.titleBadgeText}>SCANNER MUTAKHIR</Text>
                </View>

                <TouchableOpacity
                  style={[styles.iconCircleBtn, torchOn && styles.iconCircleBtnActive]}
                  onPress={() => setTorchOn(!torchOn)}
                >
                  <Ionicons
                    name={torchOn ? "flash" : "flash-outline"}
                    size={22}
                    color={torchOn ? "#f59e0b" : "#ffffff"}
                  />
                </TouchableOpacity>
              </View>

              {/* Scanning Target Box with Frame Corners */}
              <View style={styles.scanTargetWrap}>
                <View style={styles.targetFrame}>
                  {/* Corner Guides */}
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />

                  {/* Red Scanner Laser Beam */}
                  <View style={styles.laserLine} />
                </View>
                <Text style={styles.scanInstruction}>
                  Arahkan kamera ke Barcode / QR Code barang
                </Text>

                {lastScannedCode && (
                  <View style={styles.scannedBadge}>
                    <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                    <Text style={styles.scannedBadgeText}>Terdeteksi: {lastScannedCode}</Text>
                  </View>
                )}
              </View>

              {/* Bottom Controls */}
              <View style={styles.bottomControls}>
                <TouchableOpacity
                  style={[styles.modeChip, continuousMode && styles.modeChipActive]}
                  onPress={() => setContinuousMode(!continuousMode)}
                >
                  <Ionicons
                    name={continuousMode ? "repeat" : "barcode-outline"}
                    size={18}
                    color={continuousMode ? "#10b981" : "#94a3b8"}
                  />
                  <Text style={[styles.modeChipText, continuousMode && styles.modeChipTextActive]}>
                    {continuousMode ? "Mode Scans Beruntun (Aktif)" : "Mode Sekali Scan"}
                  </Text>
                </TouchableOpacity>

                {scanned && !continuousMode && (
                  <TouchableOpacity
                    style={styles.rescanBtn}
                    onPress={() => setScanned(false)}
                  >
                    <Text style={styles.rescanBtnText}>SCAN LAGI</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  permissionWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    backgroundColor: "#0f172a",
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 16,
  },
  permissionDesc: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    marginBottom: 24,
  },
  permBtn: {
    backgroundColor: "#10b981",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  permBtnText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 13,
  },
  cancelBtn: {
    paddingVertical: 12,
  },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  topControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircleBtnActive: {
    backgroundColor: "rgba(245, 158, 11, 0.3)",
    borderWidth: 1,
    borderColor: "#f59e0b",
  },
  titleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#10b98166",
  },
  titleBadgeText: {
    color: "#10b981",
    fontSize: 11,
    fontWeight: "800",
  },
  scanTargetWrap: {
    alignItems: "center",
  },
  targetFrame: {
    width: 260,
    height: 260,
    borderRadius: 24,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.15)",
  },
  corner: {
    position: "absolute",
    width: 32,
    height: 32,
    borderColor: "#10b981",
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  laserLine: {
    width: "85%",
    height: 2,
    backgroundColor: "#ef4444",
    shadowColor: "#ef4444",
    shadowRadius: 8,
    shadowOpacity: 1,
  },
  scanInstruction: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 20,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  scannedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16, 185, 129, 0.9)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  scannedBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  bottomControls: {
    alignItems: "center",
    gap: 12,
  },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  modeChipActive: {
    borderColor: "#10b981",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  modeChipText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700",
  },
  modeChipTextActive: {
    color: "#10b981",
  },
  rescanBtn: {
    backgroundColor: "#10b981",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
  },
  rescanBtnText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 12,
  },
});

