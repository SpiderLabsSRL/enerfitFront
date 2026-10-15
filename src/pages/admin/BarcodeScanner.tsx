import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from "html5-qrcode";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X, Check, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

const BarcodeScanner = ({ onScanSuccess, onClose }: BarcodeScannerProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [cameraError, setCameraError] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<{id: string, label: string}[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(true);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const retryCountRef = useRef(0);
  const isScanningRef = useRef(false);

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      if (
        error.message.includes("Permission denied") ||
        error.message.includes("Permission dismissed")
      ) {
        return "Permiso de cámara denegado. Por favor revisa los permisos del navegador.";
      }
      if (
        error.message.includes("No cameras found") ||
        error.message.includes("Could not access camera")
      ) {
        return "No se detectaron cámaras disponibles en el dispositivo.";
      }
      if (error.message.includes("Requested device not found")) {
        return "La cámara seleccionada no está disponible.";
      }
    }
    return "No se pudo acceder a la cámara. Asegúrate de que no esté siendo usada por otra aplicación.";
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanningRef.current) {
      try {
        await scannerRef.current.stop();
        isScanningRef.current = false;
      } catch (error) {
        console.warn("Error stopping scanner:", error);
      }
    }
  };

  const cleanupScanner = async () => {
    await stopScanner();
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
  };

  const startCamera = async (cameraId?: string) => {
    if (!isMountedRef.current || !scannerContainerRef.current) return;

    try {
      await cleanupScanner();

      const scanner = new Html5Qrcode("barcode-scanner-container");
      scannerRef.current = scanner;

      const config: Html5QrcodeCameraScanConfig = {
        fps: 4,
        disableFlip: true,
      };

      const cameras = await Html5Qrcode.getCameras();
      if (cameras.length === 0) {
        throw new Error("No cameras found");
      }

      setAvailableCameras(cameras);

      let targetCameraId = cameraId || selectedCameraId;
      if (!targetCameraId) {
        // Auto-select camera if none is selected
        targetCameraId = 
          cameras.find(c => c.label.match(/back|rear|trasera|posterior|0/i))?.id ||
          cameras.find(c => c.label.match(/front|delantera|selfie|1/i))?.id ||
          cameras[0].id;
        setSelectedCameraId(targetCameraId);
      }

      await scanner.start(
        targetCameraId,
        config,
        async (decodedText) => {
          if (!isMountedRef.current) return;
          await stopScanner();
          setScannedCode(decodedText);
          onScanSuccess(decodedText);
          isScanningRef.current = false;
        },
        (errorMessage) => {}
      );

      isScanningRef.current = true;
      setIsLoading(false);
      setCameraError(false);
      retryCountRef.current = 0;
    } catch (error) {
      console.error("Camera error:", error);
      if (retryCountRef.current < 3) {
        retryCountRef.current += 1;
        setTimeout(() => startCamera(cameraId), 1000 * retryCountRef.current);
      } else {
        setCameraError(true);
        setIsLoading(false);
        toast({
          title: "Error de cámara",
          description: getErrorMessage(error),
          variant: "destructive",
        });
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    startCamera();

    return () => {
      isMountedRef.current = false;
      cleanupScanner();
    };
  }, []);

  const handleRetry = () => {
    retryCountRef.current = 0;
    setCameraError(false);
    setIsLoading(true);
    startCamera();
  };

  const handleClose = async () => {
    await cleanupScanner();
    onClose();
  };

  const handleScanAgain = async () => {
    setScannedCode(null);
    setIsLoading(true);
    await startCamera();
  };

  const handleCameraChange = async (newCameraId: string) => {
    setSelectedCameraId(newCameraId);
    setIsLoading(true);
    await startCamera(newCameraId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-800">
            {scannedCode ? "Código escaneado" : "Escanear código"}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 relative">
          {isLoading && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-20">
              <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
            </div>
          )}

          {cameraError && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg w-full">
              <p className="font-medium mb-2">No se pudo acceder a la cámara</p>
              <ul className="list-disc pl-5 space-y-1 text-sm mb-4">
                <li>Asegúrate de haber dado permiso para usar la cámara</li>
                <li>
                  Verifica que ninguna otra aplicación esté usando la cámara
                </li>
                <li>Cierra otras pestañas que puedan estar usando la cámara</li>
                <li>Reinicia el navegador si persiste el problema</li>
              </ul>
              <div className="flex gap-2 flex-col sm:flex-row">
                <Button
                  onClick={handleRetry}
                  className="flex-1"
                  variant="outline"
                >
                  Reintentar
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  className="flex-1 mt-2 sm:mt-0"
                >
                  Recargar página
                </Button>
              </div>
            </div>
          )}

          {scannedCode ? (
            <div className="flex flex-col items-center justify-center w-full h-full bg-green-50 rounded-lg p-4">
              <div className="bg-green-100 p-3 rounded-full mb-4">
                <Check className="w-12 h-12 text-green-600" />
              </div>
              <p className="text-lg font-medium text-gray-800 mb-2">
                ¡Código escaneado!
              </p>
              <p className="text-sm text-gray-600 text-center mb-4 px-2 py-1 bg-gray-100 rounded-md font-mono break-all">
                {scannedCode}
              </p>
              <div className="flex gap-2 w-full">
                <Button
                  onClick={handleClose}
                  className="flex-1"
                  variant="outline"
                >
                  Cerrar
                </Button>
                <Button
                  onClick={handleScanAgain}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Escanear otro
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col">
              <div
                id="barcode-scanner-container"
                ref={scannerContainerRef}
                className="w-full flex-1 min-h-[300px] bg-black rounded-lg max-w-[90%] max-h-[70vh] mx-auto"
              />
              {availableCameras.length > 1 && !isLoading && !cameraError && (
                <div className="mt-2 flex items-center justify-center">
                  <Camera className="w-4 h-4 mr-2 text-gray-500" />
                  <select
                    value={selectedCameraId}
                    onChange={(e) => handleCameraChange(e.target.value)}
                    className="text-xs p-1 border rounded bg-white text-gray-700"
                  >
                    {availableCameras.map((camera) => (
                      <option key={camera.id} value={camera.id}>
                        {camera.label.replace(/\([^)]*\)/g, '').trim() || `Cámara ${availableCameras.indexOf(camera) + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {!scannedCode && !isLoading && !cameraError && (
          <div className="p-4 border-t text-center text-sm text-gray-500">
            <p>Coloca el código de barras frente a la cámara</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodeScanner;