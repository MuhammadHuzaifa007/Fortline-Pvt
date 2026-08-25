"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { SwitchCamera, X, Image as ImageIcon, RotateCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface CameraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (file: File, caption: string) => void;
  onFallback: () => void;
}

export function CameraModal({
  open,
  onOpenChange,
  onSend,
  onFallback,
}: CameraModalProps) {
  const t = useTranslations("Inbox.camera");

  const [mode, setMode] = useState<"live" | "preview">("live");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [errorType, setErrorType] = useState<"denied" | "inuse" | "notfound" | "other" | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startStream = useCallback(async () => {
    stopStream();
    setErrorType(null);
    setErrorDetails(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setErrorType("notfound");
      setErrorDetails("navigator.mediaDevices.getUserMedia is undefined or not supported in this context (requires HTTPS/localhost).");
      toast.error(t("notFound"));
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (constraintErr) {
        console.warn("[CameraModal] Ideal constraint failed, retrying with simple video: true", constraintErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: unknown) {
      console.error("[CameraModal] getUserMedia error:", err);
      
      const errorMessage = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      setErrorDetails(errorMessage);

      if (err instanceof Error) {
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError" ||
          err.name === "SecurityError"
        ) {
          setErrorType("denied");
          toast.error(t("permissionDenied"));
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          setErrorType("inuse");
          toast.error(t("inUse"));
        } else if (
          err.name === "NotFoundError" ||
          err.name === "DevicesNotFoundError" ||
          err.name === "OverconstrainedError"
        ) {
          setErrorType("notfound");
          toast.error(t("notFound"));
        } else {
          setErrorType("other");
          toast.error(err.message || t("error"));
        }
      } else {
        setErrorType("other");
        toast.error(t("error"));
      }
    }
  }, [facingMode, stopStream, t]);

  useEffect(() => {
    if (open && mode === "live" && !errorType) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void startStream();
    } else {
      stopStream();
    }
    return () => stopStream();
  }, [open, mode, startStream, stopStream, errorType]);

  const handleFlip = useCallback(() => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement("canvas");
    const MAX_DIMENSION = 1600;
    
    let { videoWidth: width, videoHeight: height } = video;
    
    if (width > height) {
      if (width > MAX_DIMENSION) {
        height = Math.round((height * MAX_DIMENSION) / width);
        width = MAX_DIMENSION;
      }
    } else {
      if (height > MAX_DIMENSION) {
        width = Math.round((width * MAX_DIMENSION) / height);
        height = MAX_DIMENSION;
      }
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    const encode = (quality: number, cb: (blob: Blob | null) => void) => {
      canvas.toBlob(
        (blob) => {
          cb(blob);
        },
        "image/jpeg",
        quality
      );
    };

    encode(0.82, (blob) => {
      if (!blob) return;
      if (blob.size > 5 * 1024 * 1024) { // > 5MB
        encode(0.6, (smallerBlob) => {
          if (smallerBlob) {
             setPreview(smallerBlob);
          }
        });
      } else {
        setPreview(blob);
      }
    });

    function setPreview(b: Blob) {
      setPreviewBlob(b);
      setPreviewUrl(URL.createObjectURL(b));
      setMode("preview");
    }
  }, []);

  const handleRetake = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewBlob(null);
    setPreviewUrl(null);
    setCaption("");
    setMode("live");
  }, [previewUrl]);

  const handleSend = useCallback(() => {
    if (!previewBlob) return;
    const now = new Date();
    const yyyy = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const HH = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const filename = `camera_${yyyy}${MM}${dd}_${HH}${mm}${ss}.jpg`;
    
    const file = new File([previewBlob], filename, { type: "image/jpeg" });
    onSend(file, caption);
    
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    onOpenChange(false);
  }, [previewBlob, caption, onSend, previewUrl, onOpenChange]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode("live");
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewBlob(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewUrl(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCaption("");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrorType(null);
    }
  }, [open, previewUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black border-border h-[100dvh] sm:h-[85vh] sm:max-h-[850px] flex flex-col [&>button]:hidden">
        <DialogHeader className="absolute top-0 w-full z-10 p-4 bg-gradient-to-b from-black/60 to-transparent border-none">
          <DialogTitle className="sr-only">{t("takePhoto")}</DialogTitle>
          <div className="flex justify-between items-center w-full">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-10 w-10 rounded-full"
              onClick={handleClose}
            >
              <X className="h-6 w-6" />
            </Button>
            {mode === "live" && !errorType && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-10 w-10 rounded-full"
                onClick={handleFlip}
              >
                <SwitchCamera className="h-6 w-6" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 relative flex items-center justify-center bg-black min-h-0">
          {mode === "live" ? (
             errorType ? (
                <div className="text-center p-6 space-y-4 z-20">
                  <p className="text-white text-sm">
                    {errorType === "denied"
                      ? t("permissionDenied")
                      : errorType === "inuse"
                      ? t("inUse")
                      : errorType === "notfound"
                      ? t("notFound")
                      : t("error")}
                  </p>
                  {errorDetails && (
                    <div className="bg-white/10 text-red-200 text-xs px-4 py-2 rounded-md max-w-sm overflow-hidden break-words text-left">
                      <strong>Diagnostics:</strong><br />
                      {errorDetails}
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button
                      variant="default"
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => {
                        setErrorType(null);
                        void startStream();
                      }}
                    >
                      <RotateCw className="h-4 w-4 mr-2" />
                      Try again
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={() => {
                        handleClose();
                        onFallback();
                      }}
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      {t("galleryFallback")}
                    </Button>
                  </div>
                </div>
             ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
             )
          ) : (
            previewUrl && (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            )
          )}
        </div>

        {!errorType && (
          <div className="bg-black p-4 z-10 space-y-4 pb-8 sm:pb-4 shrink-0">
            {mode === "live" ? (
              <div className="flex justify-center h-16 items-center">
                <button
                  type="button"
                  onClick={captureFrame}
                  className="h-16 w-16 rounded-full border-4 border-white flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <div className="h-[3.25rem] w-[3.25rem] bg-white rounded-full" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col space-y-4">
                <input
                  type="text"
                  maxLength={1024}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder={t("captionPlaceholder")}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 outline-none focus:border-white/50"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent text-white border-white/20 hover:bg-white/10"
                    onClick={handleRetake}
                  >
                    {t("retake")}
                  </Button>
                  <Button
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={handleSend}
                  >
                    {t("send")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
